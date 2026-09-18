import { EQUIPMENT_BY_ID } from './lab-data.js';
import { appearance } from './lab-engine.js';
import { vesselArtwork, vesselLevel } from './lab-glassware.js';

const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const f=x=>Number(x.toFixed(2));
const volume=x=>x.toFixed(1);
const GEOMETRY={beaker:{mouth:94,bottom:328,lip:286},flask:{mouth:62,bottom:330,lip:238},volumetric:{mouth:53,bottom:336,lip:222},cylinder:{mouth:43,bottom:350,lip:230},burette:{mouth:23,bottom:358,lip:227},cup:{mouth:151,bottom:329,lip:288},filter:{mouth:156,bottom:337,lip:296}};

export function describeTransfer(before,after,args,action) {
  const mode=args.from==='burette'?'burette':action==='pour'||args.tool!=='pipette'?'pour':'pipette';
  return {source:args.from,target:args.to,mode,before:structuredClone(before.vessels),after:structuredClone(after.vessels),
    amount:Math.max(0,before.vessels[args.from].volume-after.vessels[args.from].volume),
    nominal:action==='pour'?null:args.ml,duration:mode==='pipette'?2800:mode==='burette'?1850:2400};
}

// Display-only progress. The engine has already committed the transfer once.
// During pipetting, the difference is the material visibly held in the pipette.
export function transferFrame(transfer,progress) {
  const t=clamp(progress);
  let drawn,delivered,phase;
  if(transfer.mode==='pipette'){
    drawn=ease(t/.28);delivered=ease((t-.57)/.31);
    phase=t<.28?'drawing':t<.57?'moving':t<.88?'delivering':'complete';
  }else{
    drawn=delivered=ease((t-.22)/.58);
    phase=t<.22?'positioning':t<.8?'delivering':'complete';
  }
  return {progress:t,drawn,delivered,held:Math.max(0,drawn-delivered),phase};
}

function interpolated(a,b,t) {
  const v={...a,indicators:{},totals:{}};
  for(const key of ['volume','mass','waterMass','temperature'])v[key]=lerp(a[key],b[key],t);
  for(const key of Object.keys(a.totals))v.totals[key]=lerp(a.totals[key],b.totals[key],t);
  for(const key of new Set([...Object.keys(a.indicators),...Object.keys(b.indicators)]))v.indicators[key]=lerp(a.indicators[key]||0,b.indicators[key]||0,t);
  if(a.materials||b.materials){
    v.materials={};
    for(const key of new Set([...Object.keys(a.materials||{}),...Object.keys(b.materials||{})])){
      const before=a.materials?.[key],after=b.materials?.[key];
      const mass=lerp(before?.mass||0,after?.mass||0,t),volume=lerp(before?.volume||0,after?.volume||0,t);
      if(mass>1e-10)v.materials[key]={...(before||after),mass,volume};
    }
  }
  v.mixed=t<1?a.mixed:b.mixed;v.dry=b.dry;
  return v;
}

function apparatus(v,x,y,scale,role,extra={}) {
  const equipment=EQUIPMENT_BY_ID[v.id];
  return `<g class="sl-transfer-${role}" transform="translate(${f(x)} ${f(y)}) scale(${scale})">${vesselArtwork(v,equipment,appearance(v),{scene:true,support:false,idSuffix:`transfer-${role}`,...extra})}</g>`;
}

function drops(x,y,endY,time,colour) {
  const distance=Math.max(5,endY-y);
  return `<g class="sl-transfer-drops" fill="${colour}" stroke="#6f9d9e" stroke-width=".45">${[0,.33,.66].map(offset=>{
    const p=(time*5+offset)%1,dy=y+distance*p;
    return `<path d="M${f(x)} ${f(dy-3.3)}Q${f(x-3.5)} ${f(dy+1.5)} ${f(x)} ${f(dy+3)}Q${f(x+3.5)} ${f(dy+1.5)} ${f(x)} ${f(dy-3.3)}Z" opacity="${.4+p*.5}"/>`;
  }).join('')}</g>`;
}

function pipette(x,tipY,filled,colour) {
  const y=tipY-126,liquid=93*clamp(filled);
  return `<g class="sl-moving-pipette" transform="translate(${f(x)} ${f(y)})">
    <path d="M-6 27H6V107L2 126H-2L-6 107Z" fill="#e6f1ef" fill-opacity=".65" stroke="#709d9e" stroke-width="1.1"/>
    ${filled>0?`<path d="M-3 ${f(120-liquid)}H3V108L1 123H-1L-3 108Z" fill="${colour}" fill-opacity=".8"/>`:''}
    <path d="M-2 31V108" stroke="#ffffff" stroke-width="1.7" opacity=".8"/>
    ${Array.from({length:10},(_,i)=>`<path d="M${i%2?-1:-3} ${38+i*7}H5" stroke="#688c8d" stroke-width=".7"/>`).join('')}
    <path d="M-6 28L-8 21Q-17 5-8 0Q0-5 8 0Q17 5 8 21L6 28Z" fill="#537c79" stroke="#3d615f" stroke-width="1.2"/>
    <path d="M-6 5Q-10 12-4 19" fill="none" stroke="#a2c4b6" stroke-width="2" opacity=".6"/>
  </g>`;
}

export function transferScene(transfer,progress=0,reduced=false) {
  const frame=transferFrame(transfer,reduced?1:progress);
  const source=interpolated(transfer.before[transfer.source],transfer.after[transfer.source],frame.drawn);
  const target=interpolated(transfer.before[transfer.target],transfer.after[transfer.target],frame.delivered);
  const se=EQUIPMENT_BY_ID[source.id],te=EQUIPMENT_BY_ID[target.id],sg=GEOMETRY[se.type],tg=GEOMETRY[te.type];
  const colour=appearance(transfer.before[transfer.source]).colour;
  let sourceX=168,targetX=430,scale=.67,targetScale=.67;
  if(transfer.mode==='burette'){sourceX=targetX=386;scale=.48;targetScale=.44;}
  const floor=335,sourceY=floor-sg.bottom*scale,targetY=floor-tg.bottom*targetScale;
  const targetMouth=targetY+tg.mouth*targetScale;
  const surface=vesselLevel(te.type,target.volume,te.capacity);
  const targetSurface=surface===null?targetMouth+8:Math.max(targetMouth+9,targetY+surface*targetScale);
  let scene='',stream='',tool='';
  if(transfer.mode==='burette'){
    const tipY=targetMouth-16,buretteY=tipY-339*scale;
    scene+=`<g class="sl-transfer-retort"><path d="M270 340H403L417 349H253Z" fill="#90a4a1" stroke="#607d7b"/><rect x="279" y="18" width="7" height="322" rx="3" fill="#8fa5a2" stroke="#718e8c"/>${[buretteY+95*scale,buretteY+245*scale].map(y=>`<path d="M281 ${f(y)}H380" stroke="#708b89" stroke-width="4"/><rect x="275" y="${f(y-6)}" width="15" height="13" rx="2" fill="#a9bcb5" stroke="#66827f"/><path d="M380 ${f(y-5)}Q385 ${f(y-8)}391 ${f(y-5)}M380 ${f(y+5)}Q385 ${f(y+8)}391 ${f(y+5)}" fill="none" stroke="#688682" stroke-width="2"/>`).join('')}</g>`;
    scene+=apparatus(target,targetX-210*targetScale,targetY,targetScale,'target');
    scene+=apparatus(source,sourceX-214.5*scale,buretteY,scale,'source');
    if(frame.phase==='delivering'&&!reduced)stream=drops(sourceX,tipY+2,targetSurface,progress,colour);
    scene+=`<text x="165" y="140" class="sl-transfer-method">Burette delivery</text><path d="M174 153H247" stroke="#c2d3ca"/><text x="166" y="175" class="sl-transfer-detail">${transfer.nominal===null?'Drain remaining liquid':`${f(transfer.nominal)} mL selected`}</text>`;
  }else{
    scene+=`<ellipse cx="${sourceX}" cy="342" rx="65" ry="8" fill="#395e55" fill-opacity=".07"/><ellipse cx="${targetX}" cy="342" rx="65" ry="8" fill="#395e55" fill-opacity=".07"/>`;
    if(transfer.mode==='pour'&&!reduced){
      const lift=progress<.22?ease(progress/.22):progress>.8?1-ease((progress-.8)/.2):1;
      const lipStartX=sourceX+(sg.lip-210)*scale,lipStartY=sourceY+sg.mouth*scale;
      const lipX=lerp(lipStartX,targetX-14,lift),lipY=lerp(lipStartY,targetMouth-72,lift);
      const fullness=clamp(source.volume/se.capacity),angle=(65+22*(1-fullness))*lift;
      scene+=`<g class="sl-transfer-source" transform="translate(${f(lipX)} ${f(lipY)}) rotate(${f(angle)}) scale(${scale}) translate(${-sg.lip} ${-sg.mouth})">${vesselArtwork(source,se,appearance(source),{scene:true,support:false,idSuffix:'transfer-source',tilt:angle,pivot:[sg.lip,sg.mouth]})}</g>`;
      if(frame.phase==='delivering')stream=appearance(transfer.before[transfer.source]).pureSolid?`<g class="sl-solid-stream" fill="#caba8f">${Array.from({length:18},(_,i)=>{const p=(progress*3+i/18)%1;return `<circle cx="${f(lipX+(targetX-lipX)*p+(i%3-1)*3)}" cy="${f(lipY+(targetSurface-lipY)*p)}" r="2"/>`;}).join('')}</g>`:`<g class="sl-pour-stream"><path d="M${f(lipX)} ${f(lipY)}Q${f(lipX+13)} ${f(lipY+15)} ${targetX} ${f(targetMouth+6)}" fill="none" stroke="${colour}" stroke-width="5" stroke-linecap="round" opacity=".8"/><path d="M${f(lipX-1)} ${f(lipY+1)}Q${f(lipX+10)} ${f(lipY+18)} ${targetX-1} ${f(targetMouth+4)}" fill="none" stroke="#f7ffff" stroke-width="1.3" opacity=".65"/>${drops(targetX,targetMouth+7,targetSurface,progress,colour)}</g>`;
    }else scene+=apparatus(source,sourceX-210*scale,sourceY,scale,'source');
    scene+=apparatus(target,targetX-210*targetScale,targetY,targetScale,'target');
    if(transfer.mode==='pipette'&&!reduced){
      const travel=ease((progress-.28)/.29),pipetteX=lerp(sourceX,targetX,travel);
      const level=vesselLevel(se.type,source.volume,se.capacity),sourceTip=level===null?sourceY+sg.mouth*scale+8:sourceY+level*scale+4;
      const lift=Math.sin(Math.PI*travel)*40;
      const tipY=lerp(sourceTip,targetMouth+4,travel)-lift;
      tool=pipette(pipetteX,tipY,frame.held,colour);
      if(frame.phase==='delivering')stream=drops(targetX,tipY+3,targetSurface,progress,colour);
    }
    if(reduced)scene+='<path d="M253 207H338m-9-8 9 8-9 8" fill="none" stroke="#547d70" stroke-width="2" stroke-linecap="round"/>';
  }
  const action=reduced?'Transfer complete':{drawing:'Drawing sample into the pipette',moving:'Moving pipette to the receiver',positioning:'Positioning the vessels',delivering:transfer.mode==='pour'?'Pouring into the receiver':'Delivering the sample',complete:'Transfer complete'}[frame.phase];
  return `<div class="sl-transfer-scene" data-phase="${frame.phase}" data-mode="${transfer.mode}" data-reduced-motion="${reduced}" data-source-volume="${f(source.volume)}" data-target-volume="${f(target.volume)}" data-in-transit="${f(frame.held*transfer.amount)}">
    <div class="sl-transfer-labels"><span><small>FROM</small><strong>${esc(se.name)}</strong><span>${volume(source.volume)} mL</span></span><span aria-hidden="true">→</span><span><small>TO</small><strong>${esc(te.name)}</strong><span>${volume(target.volume)} mL</span></span></div>
    <svg class="sl-transfer-canvas" viewBox="0 0 600 375" role="img" aria-label="${esc(action)}: ${esc(se.name)} to ${esc(te.name)}"><title>${esc(action)}</title>${scene}${stream}${tool}</svg>
    <p class="sl-transfer-caption">${esc(action)}</p><div class="sl-transfer-progress" aria-hidden="true"><span style="width:${f(frame.delivered*100)}%"></span></div>
  </div>`;
}

export function animateTransfer(host,transfer,onComplete) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cancelled=false,request=0,timer=0,start=performance.now(),last=-Infinity;
  const paint=(progress)=>{host.innerHTML=transferScene(transfer,progress,reduced);};
  paint(reduced?1:0);
  const tick=now=>{
    if(cancelled||!host.isConnected)return;
    const progress=clamp((now-start)/transfer.duration);
    if(now-last>=30||progress===1){paint(progress);last=now;}
    if(progress<1)request=requestAnimationFrame(tick);else onComplete();
  };
  if(reduced)timer=setTimeout(()=>{if(!cancelled&&host.isConnected)onComplete();},650);
  else request=requestAnimationFrame(tick);
  return ()=>{cancelled=true;cancelAnimationFrame(request);clearTimeout(timer);};
}
