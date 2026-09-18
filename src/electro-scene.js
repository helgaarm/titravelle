import { ELECTRODE, TERMINALS } from './electro-data.js';
import { electroPreview, metalMass, gasVolume } from './electro-model.js';
import { escapeHTML as esc } from './lab-shelf.js';

const f=(n,d=3)=>Number.isFinite(n)?Number(n.toPrecision(d)).toLocaleString('en-US',{maximumSignificantDigits:d}):'—';
const sockets={plus:[265,102],minus:[505,102],'a-plus':[56,208],'a-minus':[188,208],'v-plus':[572,208],'v-minus':[704,208],left:[275,282],right:[485,282]};
const routes=[
  ['plus','a-plus',[[265,102],[240,102],[240,248],[56,248],[56,208]]],
  ['a-minus','left',[[188,208],[188,260],[275,260],[275,282]]],
  ['right','minus',[[485,282],[485,252],[522,252],[522,102],[505,102]]],
  ['v-plus','left',[[572,208],[572,240],[292,240],[292,282],[275,282]]],
  ['v-minus','right',[[704,208],[704,264],[502,264],[502,282],[485,282]]],
];
function externalFlows(e,p){
  const flows=new Map();if(p.current<=0)return flows;
  const edges=[...e.wires,['a-plus','a-minus']];
  for(const [start,end] of [[p.wiring.anode,'plus'],['minus',p.wiring.cathode]]){
    const queue=[[start,[]]],seen=new Set([start]);
    while(queue.length){const [node,path]=queue.shift();if(node===end){for(const [i,d] of path)flows.set(i,d);break;}
      edges.forEach(([a,b],i)=>{const next=a===node?b:b===node?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([next,[...path,[i,a===node?1:-1]]]);}});
    }
  }return flows;
}
function wirePath(from,to,index){
  const route=routes.find(([a,b])=>a===from&&b===to||a===to&&b===from);
  if(route)return route[0]===from?route[2]:[...route[2]].reverse();
  const [x,y]=sockets[from],[x2,y2]=sockets[to],track=240+index%6*6;
  return [[x,y],[x,track],[x2,track],[x2,y2]];
}
function flowArrows(points,direction){
  const segments=points.slice(1).map((b,i)=>({a:points[i],b,length:Math.hypot(b[0]-points[i][0],b[1]-points[i][1])})).sort((a,b)=>b.length-a.length);
  const {a,b,length}=segments[0],dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
  return [1,-1].map(sign=>{const ax=cx-dy*sign*7,ay=cy+dx*sign*7,d=direction*sign;return `<path class="${sign===1?'el-electron-arrow':'el-current-arrow'}" d="M${ax+dx*d*6} ${ay+dy*d*6}L${ax-dx*d*4-dy*3} ${ay-dy*d*4+dx*3}L${ax-dx*d*4+dy*3} ${ay-dy*d*4-dx*3}Z" fill="${sign===1?'#237da3':'#a85a2b'}"/>`;}).join('');
}

export function electroArtwork(e,running=false,selectedTerminal=null,interactive=false){
  const p=electroPreview(e),flows=externalFlows(e,p),leftAnode=p.wiring.anode==='left',level=460-Math.min(112,50+e.volume*.1);
  const color=side=>p.solutions[side].free.Cu>.001?'#82bdd2':'#c9dedb';
  const gas=side=>side===p.wiring.cathode?e.collected.H2:e.collected.O2+e.collected.Cl2;
  const metalColor=material=>material==='copper'?'#c38b64':['graphite','glassy-carbon'].includes(material)?'#465653':'#9cabb0';
  const terminalNames=Object.fromEntries(TERMINALS);
  return `<figure class="el-cell ${running&&p.current>0?'el-flow':''}">
    <div class="el-scene-heading"><strong>Cell & circuit</strong><span>${e.volume?`${f(e.volume)} mL`:'Empty cell'} · ${f(e.temperature)} °C</span></div>
    <div class="el-diagram"><svg viewBox="0 0 760 500" role="img" aria-label="Electrochemistry circuit: ${esc(p.wiring.status)}. ${leftAnode?'Left':'Right'} anode; ${leftAnode?'right':'left'} cathode. ${interactive?'Select two terminal buttons to connect a lead.':''}">
      <defs><linearGradient id="el-glass" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".85"/><stop offset=".18" stop-color="#fff" stop-opacity=".08"/><stop offset=".8" stop-color="#c2d4cf" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".8"/></linearGradient><linearGradient id="el-metal" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".45"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#18322e" stop-opacity=".3"/></linearGradient><clipPath id="el-liquid-clip"><path d="M167 311V456Q167 477 187 477H573Q593 477 593 456V311Z"/></clipPath><marker id="el-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#426f69"/></marker></defs>
      <ellipse cx="380" cy="484" rx="232" ry="9" fill="#203e35" opacity=".07"/>
      <rect x="231" y="14" width="298" height="112" rx="14" fill="#304d50"/><rect x="301" y="46" width="158" height="48" rx="6" fill="#183639"/>
      <text x="380" y="34" text-anchor="middle" fill="#f2f7ef" font-size="13">${e.config.mode==='galvanic'?'External load':'DC power supply'} · ${e.power?'ON':'OFF'}</text><text x="380" y="67" text-anchor="middle" fill="#d6f3cf" font-size="18">${f(p.voltage)} V</text><text x="380" y="85" text-anchor="middle" fill="#d6f3cf" font-size="12">${f(p.current)} A</text><text x="265" y="81" text-anchor="middle" fill="white">+</text><text x="505" y="81" text-anchor="middle" fill="white">−</text>
      ${[['Ammeter',28,122,p.wiring.ammeter?`${f(p.current)} A`:'— A'],['Voltmeter',544,638,p.wiring.meterSign?`${f(p.voltage*p.wiring.meterSign)} V`:'— V']].map(([name,x,cx,value])=>`<rect x="${x}" y="144" width="188" height="92" rx="12" fill="#eaf0e8" stroke="#98ada3"/><text x="${cx}" y="164" text-anchor="middle" font-size="12">${name}</text><rect x="${cx-51}" y="173" width="102" height="27" rx="4" fill="#d6e3d5"/><text x="${cx}" y="192" text-anchor="middle" font-size="17">${value}</text><text x="${x+28}" y="188" text-anchor="middle">+</text><text x="${x+160}" y="188" text-anchor="middle">−</text>`).join('')}
      <path d="M161 310V456Q161 483 188 483H572Q599 483 599 456V310" fill="url(#el-glass)" stroke="#78978f" stroke-width="3"/>
      ${e.volume?`<g clip-path="url(#el-liquid-clip)"><rect x="166" y="${level}" width="214" height="${480-level}" fill="${color('left')}"/><rect x="380" y="${level}" width="215" height="${480-level}" fill="${color('right')}"/><path d="M166 ${level}Q270 ${level+5} 380 ${level}T595 ${level}" fill="none" stroke="#83a9a1" stroke-width="2"/><rect x="167" y="${level}" width="428" height="${480-level}" fill="url(#el-glass)"/></g>`:''}
      ${e.config.separator!=='none'?'<path d="M380 311V477" stroke="#b59c70" stroke-width="7" stroke-dasharray="6 4"/>':''}
      ${['left','right'].map((side,i)=>{const x=i?485:275,el=e.electrodes[side],w=Math.max(3,30*el.baseRemaining/el.initialMass),plated=Object.values(el.deposits).some(n=>n>1e-9),tube=i?543:217,gasHeight=Math.min(120,gasVolume(gas(side),e.temperature)*2);return `<rect x="${x-25}" y="291" width="50" height="14" rx="4" fill="#e0d5bd" stroke="#8d8a72"/><rect x="${x-w/2}" y="287" width="${w}" height="164" rx="3" fill="${metalColor(el.material)}" stroke="#56706b" stroke-width="1.5"/><rect x="${x-w/2}" y="306" width="${w}" height="142" fill="url(#el-metal)"/>${plated?`<rect x="${x-w/2-2}" y="${Math.max(level,320)}" width="${w+4}" height="${450-Math.max(level,320)}" rx="2" fill="${el.deposits.Cu?'#c58c58':'#c5ccd0'}" opacity=".8"/>`:''}<path d="M${tube-17} 462V330Q${tube-17} 313 ${tube} 313Q${tube+17} 313 ${tube+17} 330V462" fill="${e.volume?color(side):'#f1f5f1'}" stroke="#83a49b" stroke-width="1.5"/>${gasHeight?`<path d="M${tube-15} ${328+gasHeight}V331Q${tube-15} 315 ${tube} 315Q${tube+15} 315 ${tube+15} 331V${328+gasHeight}Z" fill="${side===p.wiring.anode&&e.gases.Cl2?'#d7dfa3':'#f7fbf3'}"/>`:''}${[345,368,391,414,437].map(y=>`<path d="M${tube+8} ${y}h8" stroke="#759c92"/>`).join('')}${p.current>0&&gas(side)>0?Array.from({length:4},(_,j)=>`<circle class="el-bubble" cx="${x+(i?24:-24)}" cy="${445-j*17}" r="${2+j%2}" stroke="#477f8b" fill="#ecf8f5" style="--delay:${j*.3}s"/>`).join(''):''}`;}).join('')}
      ${e.volume?`<path d="M${leftAnode?336:424} 392H${leftAnode?424:336}" stroke="#426f69" marker-end="url(#el-arrow)"/><text x="380" y="382" text-anchor="middle" font-size="12">Cations +</text><circle class="el-ion" cx="380" cy="392" r="4" fill="#ac794e" style="--travel:${leftAnode?38:-38}px"/><path d="M${leftAnode?424:336} 432H${leftAnode?336:424}" stroke="#426f69" marker-end="url(#el-arrow)"/><text x="380" y="452" text-anchor="middle" font-size="12">Anions −</text><circle class="el-ion" cx="380" cy="432" r="4" fill="#627f99" style="--travel:${leftAnode?-38:38}px"/>`:''}
      ${Object.values(p.solutions).some(s=>Object.values(s.solid).some(n=>n>1e-10)||s.agcl>1e-10)?'<path d="M180 470l50-5 43 7 34-4 50 5 30-6 52 6 40-7 65 4" stroke="#789c90" stroke-width="6" fill="none"/>':''}
      ${e.wires.map(([from,to],i)=>{const points=wirePath(from,to,i),path=points.map(([x,y],k)=>`${k?'L':'M'}${x} ${y}`).join(''),d=flows.get(i),color=[from,to].some(t=>t.startsWith('v-'))?'#749269':[from,to].includes('minus')?'#365f76':'#b56d51';return `<path d="${path}" fill="none" stroke="#fafcf8" stroke-width="7" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>${d?`<path class="el-electrons" d="${path}" fill="none" stroke="#1d708f" stroke-width="4" stroke-dasharray="2 20" stroke-linecap="round" style="--electron-end:${d*-22}"/>${flowArrows(points,d)}`:''}`;}).join('')}
      ${Object.entries(sockets).map(([id,[x,y]])=>`<circle cx="${x}" cy="${y}" r="7" fill="${id===selectedTerminal?'#f3ca78':'#fafcf8'}" stroke="${['plus','a-plus','v-plus'].includes(id)?'#a65640':'#45675e'}" stroke-width="2"/>`).join('')}
      <text x="275" y="277" dx="-24" text-anchor="end" font-size="12">L</text><text x="485" y="277" dx="24" font-size="12">R</text>
    </svg>${interactive?`<div class="el-terminal-layer">${Object.entries(sockets).map(([id,[x,y]])=>`<button type="button" id="el-terminal-${id}" class="el-terminal ${selectedTerminal===id?'is-selected':''}" data-electro="terminal" data-terminal="${id}" aria-label="${esc(terminalNames[id])} terminal" aria-pressed="${selectedTerminal===id}" ${e.power?'disabled':''} style="left:${x/760*100}%;top:${y/500*100}%"><span class="el-sr-only">${esc(terminalNames[id])}</span></button>`).join('')}</div>`:''}</div>
    <div class="el-electrode-key">${['left','right'].map(side=>`<div><strong>${side==='left'?'L':'R'} · ${esc(ELECTRODE[e.electrodes[side].material].name)}</strong><span>${side===p.wiring.anode?'Anode · oxidation':'Cathode · reduction'} · ${f(metalMass(e.electrodes[side]),4)} g</span><span>Collected gas: ${f(gasVolume(gas(side),e.temperature))} mL</span></div>`).join('')}</div>
    <figcaption><span class="el-electron-key">Blue arrows: electrons</span> · <span class="el-current-key">Orange arrows: conventional current</span>. Wires cross without connecting unless they share a terminal. Cell and gas collectors are schematic.</figcaption>
  </figure>`;
}
