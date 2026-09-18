// Original, responsive SVG apparatus. No photographs or third-party artwork.
// The drawings illustrate vessel geometry; instrument readings come from the engine.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const f = n => Number(n.toFixed(2));

const SHAPES = {
  beaker: {
    outer: 'M130 99L116 84L144 88Q211 77 287 89L290 97V308Q290 326 274 328H146Q130 326 130 308Z',
    inner: 'M135 97Q210 110 285 97V307Q285 321 272 323H148Q135 321 135 307Z',
    profile: [[97,75],[308,75],[319,69],[323,60]], bottom: 322, top: 127,
    shine: 'M142 111V302Q142 313 153 314', shine2: 'M279 113V303',
    rim: [210,94,79,12], shadow: [210,336,91,10], mini: '101 67 213 282',
  },
  flask: {
    outer: 'M179 61Q210 53 241 61L239 70V127Q239 139 246 153L302 300Q313 326 288 330H132Q107 326 118 300L174 153Q181 139 181 127V70Z',
    inner: 'M187 67H233V130Q233 144 240 158L296 302Q303 321 286 324H134Q117 321 124 302L180 158Q187 144 187 130Z',
    profile: [[67,23],[135,23],[160,32],[290,82],[307,86],[319,81],[324,73]], bottom: 323, top: 151,
    shine: 'M192 79V127Q192 145 182 166L134 300Q130 310 139 313', shine2: 'M228 78V130Q228 145 239 171L286 291',
    rim: [210,62,31,7], shadow: [210,338,106,11], mini: '104 44 212 305',
  },
  volumetric: {
    outer: 'M196 53Q210 48 224 53V163C224 197 277 222 286 266C297 311 267 336 210 336C153 336 123 311 134 266C143 222 196 197 196 163Z',
    inner: 'M201 56H219V164C219 200 272 224 281 267C291 307 264 330 210 331C156 330 129 307 139 267C148 224 201 200 201 164Z',
    profile: [[56,9],[166,9],[190,16],[218,40],[251,65],[279,73],[299,66],[318,48],[328,24],[331,5]], bottom: 330, top: 121,
    shine: 'M205 66V160C205 202 158 232 149 267Q139 298 164 313', shine2: 'M215 67V159C215 202 263 232 273 266',
    rim: [210,53,14,4], shadow: [210,343,87,10], mini: '119 37 182 318',
  },
  cylinder: {
    outer: 'M187 45L181 34L201 39Q220 35 233 43V305Q233 316 223 319V329H197V319Q187 316 187 305Z',
    inner: 'M192 46Q210 51 228 45V305Q228 312 219 313H201Q192 312 192 305Z',
    profile: [[45,18],[305,18],[313,10]], bottom: 310, top: 67,
    shine: 'M196 55V302', shine2: 'M225 55V303',
    rim: [210,43,23,6], shadow: [210,354,63,7], mini: '146 22 130 343',
  },
  burette: {
    outer: 'M198 22Q213 18 230 22L227 32V273Q227 280 220 285V310L217 333L212 339L209 310V286Q202 281 202 273V32Z',
    inner: 'M207 28H222V272L218 280H211L207 273Z',
    profile: [[28,7.5],[273,7.5],[280,3.5]], bottom: 276, top: 45,
    shine: 'M210 34V274', shine2: 'M224 34V270',
    rim: [214,23,16,4], shadow: [213,357,102,8], mini: '118 9 175 354',
  },
};

function radiusAt(shape, y) {
  const p = shape.profile;
  if (y <= p[0][0]) return p[0][1];
  for (let i=1;i<p.length;i++) if (y<=p[i][0]) {
    const [a,r] = p[i-1], [b,s] = p[i]; return r+(s-r)*(y-a)/(b-a);
  }
  return p.at(-1)[1];
}

// Integrating cross-sectional area makes broad flask bodies fill slowly and necks
// fill quickly. The nominal graduation/mark is the visual calibration point.
function profileLevel(shape, fraction) {
  const samples=[];let total=0;
  for(let y=shape.bottom;y>shape.top;y-=0.5){total+=radiusAt(shape,y)**2*0.5;samples.push([y,total]);}
  const target=total*clamp(fraction,0,1);
  return samples.find(([,area])=>area>=target)?.[0] ?? shape.top;
}

export function vesselLevel(type, volume, capacity) {
  const shape=SHAPES[type]; if(!shape)return null;
  if(type==='burette')return f(276-clamp(volume/50,0,1)*231);
  if(type==='cylinder')return f(310-clamp(volume/100,0,1)*243);
  if(type==='volumetric'&&volume>=100)return f(121-clamp((volume-100)/20,0,1)*62);
  return f(profileLevel(shape,volume/(type==='volumetric'?100:capacity)));
}

function definitions(id, colour, interior) {
  return `<defs>
    <linearGradient id="${id}-glass" x1="0" x2="1"><stop stop-color="#7faaa9" stop-opacity=".32"/><stop offset=".08" stop-color="#f5ffff" stop-opacity=".8"/><stop offset=".2" stop-color="#d5ebed" stop-opacity=".18"/><stop offset=".52" stop-color="#ffffff" stop-opacity=".04"/><stop offset=".82" stop-color="#c0dcdf" stop-opacity=".12"/><stop offset=".96" stop-color="#7eaaad" stop-opacity=".33"/><stop offset="1" stop-color="#d8eff0" stop-opacity=".7"/></linearGradient>
    <linearGradient id="${id}-edge" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#73999a"/><stop offset=".22" stop-color="#bed5d4"/><stop offset=".53" stop-color="#71969a"/><stop offset=".8" stop-color="#c3dada"/><stop offset="1" stop-color="#6e9596"/></linearGradient>
    <linearGradient id="${id}-liquid" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="${colour}" stop-opacity=".28"/><stop offset=".55" stop-color="${colour}" stop-opacity=".55"/><stop offset="1" stop-color="${colour}" stop-opacity=".82"/></linearGradient>
    <linearGradient id="${id}-sheen"><stop stop-color="#ffffff" stop-opacity="0"/><stop offset=".35" stop-color="#ffffff" stop-opacity=".64"/><stop offset=".62" stop-color="#ffffff" stop-opacity=".14"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}-metal"><stop stop-color="#52666b"/><stop offset=".32" stop-color="#aab8b9"/><stop offset=".5" stop-color="#e0e6e3"/><stop offset=".72" stop-color="#809293"/><stop offset="1" stop-color="#506368"/></linearGradient>
    <linearGradient id="${id}-paper" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fffefa"/><stop offset=".55" stop-color="#f3f0e5"/><stop offset="1" stop-color="#d6d2c2"/></linearGradient>
    <linearGradient id="${id}-foam"><stop stop-color="#d3dcd6"/><stop offset=".17" stop-color="#fffefa"/><stop offset=".58" stop-color="#f7f8f0"/><stop offset=".88" stop-color="#e0e6dc"/><stop offset="1" stop-color="#bfcfc6"/></linearGradient>
    <radialGradient id="${id}-shadow"><stop stop-color="#355253" stop-opacity=".23"/><stop offset="1" stop-color="#355253" stop-opacity="0"/></radialGradient>
    ${interior?`<clipPath id="${id}-inside"><path d="${interior}"/></clipPath>`:''}
  </defs>`;
}

function stand(id, side=153) {
  return `<g class="sl-apparatus-stand"><path d="M120 341L274 338L300 351L292 358H123L109 351Z" fill="url(#${id}-metal)" stroke="#627779" stroke-width="1.2"/><path d="M120 341L143 345H280" fill="none" stroke="#d1dbd8"/><rect x="${side}" y="23" width="7" height="320" rx="3" fill="url(#${id}-metal)"/><ellipse cx="${side+3.5}" cy="23" rx="3.5" ry="2" fill="#d1dedb"/>${[100,236].map(y=>`<path d="M${side+3} ${y}H198" stroke="#7b8c8a" stroke-width="6"/><rect x="${side-5}" y="${y-9}" width="17" height="19" rx="3" fill="url(#${id}-metal)" stroke="#738582"/><path d="M${side-12} ${y}H${side-3}" stroke="#455f63" stroke-width="3"/><path d="M198 ${y-6}Q211 ${y-11}227 ${y-6}M198 ${y+6}Q211 ${y+11}227 ${y+6}" fill="none" stroke="#637775" stroke-width="3"/>`).join('')}</g>`;
}

function graduations(type, capacity, id) {
  if(type==='volumetric')return `<g class="sl-graduations"><path data-calibration-mark="100" d="M196 121Q210 125 224 121M196 121Q210 117 224 121" fill="none" stroke="#567977" stroke-width="1.3"/><text x="210" y="266" text-anchor="middle" font-size="13">100 mL</text><text x="210" y="283" text-anchor="middle" font-size="9">20 °C</text></g>`;
  const marks=[];
  if(type==='burette') {
    for(let ml=0;ml<=50;ml++){
      const y=vesselLevel(type,50-ml,50),major=ml%10===0;
      marks.push(`<path d="M${major?211:ml%5===0?214:217} ${y}H226"/>${major?`<text x="207" y="${y+3}" text-anchor="end">${ml}</text>`:''}`);
    }
    return `<g class="sl-graduations" font-size="9" stroke-width=".8">${marks.join('')}<text x="248" y="36" text-anchor="middle">mL</text></g>`;
  }
  if(type==='cylinder'){
    for(let ml=2;ml<=100;ml+=2){const y=vesselLevel(type,ml,100),major=ml%10===0;marks.push(`<path d="M${major?210:218} ${y}H229"/>${major?`<text x="206" y="${y+3}" text-anchor="end">${ml}</text>`:''}`);}
    return `<g class="sl-graduations" font-size="8.5" stroke-width=".9">${marks.join('')}<text x="210" y="57" text-anchor="middle">mL</text></g>`;
  }
  for(let ml=50;ml<=capacity;ml+=50){const y=vesselLevel(type,ml,capacity),radius=radiusAt(SHAPES[type],y),x=type==='flask'?186+radius*.3:210+radius*.35,tick=type==='flask'?12:17;marks.push(`<path d="M${f(x)} ${y}h${tick}"/><text x="${f(x+tick+5)}" y="${y+3}">${ml}</text>`);}
  return `<g class="sl-graduations" font-size="9" stroke-width="1">${marks.join('')}<text x="${type==='beaker'?189:171}" y="${type==='beaker'?163:285}" font-size="13" text-anchor="middle">250 mL</text><path d="${type==='beaker'?'M157 184H214V219H157Z':'M154 291H192V310H154Z'}" fill="#f8ffff" fill-opacity=".2" stroke="#b6ccca" stroke-opacity=".5"/></g>`;
}

function sediment(id, shape, mixed, level, colour='#f6f4e8') {
  const bottom=shape.bottom;
  const grains=Array.from({length:27},(_,i)=>{
    const x=136+(i*47%149),y=mixed?level+9+(i*29%Math.max(1,Math.floor(bottom-level-9))):bottom-2-(i*11%8);
    return `<ellipse cx="${x}" cy="${f(y)}" rx="${1.2+i%3*.6}" ry="${.7+i%2*.5}" fill="${colour}" stroke="#a3b5b1" stroke-width=".45"/>`;
  }).join('');
  return `<g class="sl-vessel-sediment" clip-path="url(#${id}-inside)">${mixed?`<rect x="115" y="${level}" width="194" height="${bottom-level}" fill="${colour}" fill-opacity=".26"/>`:`<path d="M112 ${bottom-7}Q148 ${bottom-12}186 ${bottom-5}T309 ${bottom-7}V${bottom+7}H112Z" fill="${colour}" stroke="#a3b5b1"/>`}${grains}</g>`;
}

function tiltedSurface(shape,level,angle,pivot,center) {
  // Weighted cross-sections keep the illustrated free surface horizontal when a
  // vessel is tilted. This affects artwork only, never the chemical state.
  const radians=angle*Math.PI/180,sin=Math.sin(radians),cos=Math.cos(radians),points=[];
  let filled=0;
  for(let y=shape.profile[0][0];y<=shape.bottom;y+=2){
    const r=radiusAt(shape,y);
    for(let i=0;i<16;i++){
      const offset=(i+.5)/8-1,weight=Math.sqrt(1-offset*offset)*r*r;
      const rotated=pivot[1]+(center+offset*r-pivot[0])*sin+(y-pivot[1])*cos;
      points.push([rotated,weight]);if(y>=level)filled+=weight;
    }
  }
  points.sort((a,b)=>b[0]-a[0]);let accumulated=0;
  for(const [y,weight] of points){accumulated+=weight;if(accumulated>=filled)return f(y);}
  return level;
}

function glassBody(v,e,look,id,mini,options={}) {
  const s=SHAPES[e.type],level=vesselLevel(e.type,v.volume,e.capacity),cx=e.type==='burette'?214.5:210;
  const radius=radiusAt(s,level),ry=e.type==='burette'?2:e.type==='cylinder'?3:clamp(radius*.13,2,9);
  const [sx,sy,srx,sry]=s.shadow,[rx,rypos,rrx,rry]=s.rim;
  const tilt=options.tilt||0,pivot=options.pivot||[cx,s.bottom];
  const plane=tilt&&v.volume>0?tiltedSurface(s,level,tilt,pivot,cx):level;
  const liquid=v.volume>0&&!v.dry&&!look.pureSolid?`<g class="sl-vessel-liquid" data-liquid-level="${level}" clip-path="url(#${id}-inside)">${tilt?`<g transform="rotate(${-tilt} ${pivot.join(' ')})"><rect x="-600" y="${plane}" width="1600" height="900" fill="url(#${id}-liquid)"/><path d="M-600 ${plane}H1000" stroke="${look.colour}" stroke-opacity=".85" stroke-width="2"/></g>`:`<rect x="105" y="${level}" width="211" height="${s.bottom-level+6}" fill="url(#${id}-liquid)"/><ellipse cx="${cx}" cy="${level}" rx="${f(radius)}" ry="${ry}" fill="${look.colour}" fill-opacity=".32" stroke="${look.colour}" stroke-opacity=".8" stroke-width="1"/><path class="sl-meniscus" d="M${f(cx-radius)} ${level-1}Q${cx} ${level+3} ${f(cx+radius)} ${level-1}" stroke="#547f87" stroke-opacity=".65" fill="none" stroke-width=".8"/>`}</g>`:'';
  return `${definitions(id,look.colour,s.inner)}${options.scene?'':`<ellipse cx="${sx}" cy="${sy}" rx="${srx}" ry="${sry}" fill="url(#${id}-shadow)"/>`}
    ${e.type==='burette'&&options.support!==false?stand(id):''}
    ${e.type==='cylinder'?`<g class="sl-cylinder-base"><path d="M174 326L245 326L267 337L249 350H173L153 338Z" fill="url(#${id}-glass)" stroke="url(#${id}-edge)" stroke-width="1.8"/><path d="M155 336L177 344H246L264 336M174 326L177 344M245 326L246 344" stroke="#a3bebb" fill="none" stroke-width="1"/><ellipse cx="210" cy="329" rx="25" ry="6" fill="url(#${id}-glass)" stroke="#a4bdbb"/></g>`:''}
    <path class="sl-glass-body" d="${s.outer}" fill="url(#${id}-glass)" stroke="url(#${id}-edge)" stroke-width="1.8" stroke-linejoin="round"/>
    <ellipse cx="${rx}" cy="${rypos}" rx="${rrx}" ry="${rry}" fill="#dceded" fill-opacity=".12" stroke="#8babad" stroke-width="1.4"/>
    ${liquid}${look.layerFraction?`<g class="sl-material-layers" clip-path="url(#${id}-inside)"><rect x="105" y="${level}" width="211" height="${Math.max(2,vesselLevel(e.type,v.volume*(1-look.layerFraction),e.capacity)-level)}" fill="#d4bb7d" fill-opacity=".75"/><path d="M105 ${vesselLevel(e.type,v.volume*(1-look.layerFraction),e.capacity)}H316" stroke="#9b854d" stroke-width="1.4"/></g>`:''}${look.solid?sediment(id,s,look.pureSolid?true:v.mixed,look.pureSolid?Math.min(level,s.bottom-15):level,look.solidColour):''}
    <g clip-path="url(#${id}-inside)"><path d="${s.shine}" stroke="#ffffff" stroke-width="${e.type==='burette'?2:4.5}" stroke-opacity=".82" fill="none" stroke-linecap="round"/><path d="${s.shine2}" stroke="#ffffff" stroke-width="1.7" stroke-opacity=".65" fill="none"/><rect x="${e.type==='cylinder'?193:e.type==='burette'?208:144}" y="36" width="${e.type==='cylinder'?12:e.type==='burette'?6:35}" height="299" fill="url(#${id}-sheen)" opacity=".5"/></g>
    ${mini?'':graduations(e.type,e.capacity,id)}
    <path d="M${rx-rrx} ${rypos}A${rrx} ${rry} 0 0 0 ${rx+rrx} ${rypos}" stroke="#c0d8d5" stroke-width="3" fill="none"/><path d="M${rx-rrx+2} ${rypos+1}A${rrx-2} ${rry-1} 0 0 0 ${rx+rrx-2} ${rypos+1}" stroke="#f9ffff" stroke-opacity=".9" stroke-width="1" fill="none"/>
    ${e.type==='burette'?`<g class="sl-stopcock"><rect x="204" y="287" width="22" height="18" rx="4" fill="#c9dfdd" stroke="#83a7a6"/><path d="M190 296H241" stroke="#507c80" stroke-width="5" stroke-linecap="round"/><rect x="230" y="285" width="9" height="23" rx="4" fill="#567f86" stroke="#466b73"/><circle cx="215" cy="296" r="5.2" fill="#dbe6db" stroke="#6b9294"/><path d="M213 319L214 332" stroke="#ffffff" stroke-width="2"/></g>`:''}`;
}

function cup(v,look,id) {
  const wet=v.volume>0&&!v.dry&&!look.pureSolid;
  return `${definitions(id,look.colour,'')}<ellipse cx="210" cy="343" rx="86" ry="12" fill="url(#${id}-shadow)"/>
    <path d="M126 152L144 320Q210 344 276 320L294 152Z" fill="url(#${id}-foam)" stroke="#b1c2b7" stroke-width="1.5"/>
    <path d="M132 158L150 315Q210 335 270 315L288 158" fill="none" stroke="#e7ede4" stroke-width="3"/>
    <ellipse cx="210" cy="151" rx="84" ry="23" fill="#f9faf2" stroke="#b7c9bd" stroke-width="1.5"/>
    <ellipse cx="210" cy="150" rx="74" ry="18" fill="#d3ded0" stroke="#a8baab"/>
    <ellipse cx="210" cy="154" rx="68" ry="13" fill="${wet?look.colour:'#e8ecdf'}" fill-opacity="${wet?'.68':'1'}" ${wet?'class="sl-vessel-liquid"':''}/>
    ${wet?'<path d="M154 154Q205 165 266 153" fill="none" stroke="#f8fffa" stroke-opacity=".75"/>':''}${look.pureSolid?'<ellipse class="sl-vessel-sediment" cx="210" cy="151" rx="53" ry="13" fill="#e3d8af" stroke="#b4a987"/>':''}
    <path d="M127 152Q210 180 293 152M128 159Q210 188 292 159M130 168Q210 196 290 168" fill="none" stroke="#fdfdf8" stroke-width="3"/>
    <path d="M140 200L152 304M143 204L155 305" stroke="#fffef9" stroke-width="2" opacity=".8"/>
    <path d="M149 318Q210 337 271 318" stroke="#adbdad" opacity=".6" fill="none"/>
    <text x="210" y="259" text-anchor="middle" class="sl-apparatus-label">INSULATED CUP</text>`;
}

function filter(v,look,id,mini) {
  const residue=look.solid||v.dry,wet=v.volume>0&&!v.dry&&!look.pureSolid;
  const grains=residue?Array.from({length:38},(_,i)=>`<ellipse cx="${171+(i*37%79)}" cy="${(v.dry?230:162)+(i*13%17)}" rx="${1+i%4*.7}" ry="${.7+i%3*.4}" fill="#fffefa" stroke="#cccabb" stroke-width=".5"/>`).join(''):'';
  if(v.dry)return `${definitions(id,look.colour,'')}<ellipse cx="210" cy="273" rx="126" ry="18" fill="url(#${id}-shadow)"/><ellipse cx="210" cy="246" rx="125" ry="42" fill="url(#${id}-glass)" stroke="url(#${id}-edge)" stroke-width="2"/><ellipse cx="210" cy="238" rx="109" ry="34" fill="url(#${id}-paper)" stroke="#cccbbc"/><path d="M112 238H308M210 207V270M137 215L281 260M137 261L280 215" stroke="#d5d3c6" stroke-width=".8"/><ellipse cx="210" cy="239" rx="43" ry="14" fill="#eeeadd"/>${grains}<path d="M91 246Q210 298 330 245" fill="none" stroke="#f4ffff" stroke-opacity=".8" stroke-width="2"/>`;
  return `${definitions(id,look.colour,'')}<ellipse cx="212" cy="352" rx="102" ry="9" fill="url(#${id}-shadow)"/>
    ${mini?'':`<g class="sl-filter-support"><rect x="276" y="88" width="7" height="252" rx="3" fill="url(#${id}-metal)"/><path d="M273 336L310 348H236L246 339Z" fill="url(#${id}-metal)" stroke="#748989"/><path d="M280 188H247M280 183V197" stroke="#7d9592" stroke-width="5"/><ellipse cx="210" cy="189" rx="68" ry="11" fill="none" stroke="#7d9592" stroke-width="3"/></g>`}
    <path d="M111 156L200 274V328L213 337L219 329V274L309 156Z" fill="url(#${id}-glass)" stroke="url(#${id}-edge)" stroke-width="1.7"/>
    <ellipse cx="210" cy="156" rx="99" ry="23" fill="url(#${id}-glass)" stroke="#96b5b1" stroke-width="1.6"/>
    <path d="M126 154L210 262L294 154Z" fill="url(#${id}-paper)" stroke="#c7cbbd" stroke-width="1.2"/>
    <ellipse cx="210" cy="154" rx="84" ry="20" fill="#faf9ee" stroke="#d2d3c3"/>
    <path d="M126 154Q210 176 294 154L210 252Z" fill="${wet?look.colour:'#e7e7d8'}" fill-opacity="${wet?'.38':'.65'}" ${wet?'class="sl-vessel-liquid"':''}/>
    <path d="M210 252V168M167 141L210 252" stroke="#c5cbbc" stroke-opacity=".7" fill="none"/>
    ${residue?`<ellipse cx="210" cy="170" rx="43" ry="11" fill="${look.solidColour||'#eeede1'}"/>`:''}${grains}
    <path d="M117 158Q210 181 304 158M207 278V324" stroke="#f6ffff" stroke-width="2" fill="none" stroke-opacity=".85"/>`;
}

export function vesselArtwork(v, equipment, look, options={}) {
  const {miniature=false,scene=false,idSuffix=''}=options;
  const type=equipment.type,id=`sl-apparatus-${equipment.id}-${miniature?'mini':'stage'}${idSuffix?`-${idSuffix}`:''}`;
  const viewBox=miniature?(SHAPES[type]?.mini||'101 115 220 240'):'0 0 420 375';
  return `<svg class="${miniature?'sl-vessel-icon':scene?'sl-transfer-apparatus':'sl-glass'} sl-apparatus-${type}" ${scene?'width="420" height="375"':''} data-apparatus="${type}" viewBox="${viewBox}" ${miniature||scene?'aria-hidden="true"':`role="img" aria-label="${escape(equipment.name)}: ${escape(look.text)}"`} focusable="false">
    ${miniature?'':`<title>${escape(equipment.name)}</title><desc>${escape(look.text)}. ${type==='cylinder'?'Tall glass cylinder with a hexagonal base and volume graduations.':type==='burette'?'Graduated glass burette held on a stand, with a stopcock and delivery tip.':type==='volumetric'?'Bulb-shaped flask with a narrow neck and a single 100 mL calibration mark.':type==='filter'?'Folded filter paper in a glass funnel; dried paper is shown on a watch glass.':'Original illustration of laboratory apparatus.'}</desc>`}
    ${type==='cup'?cup(v,look,id):type==='filter'?filter(v,look,id,miniature||scene):glassBody(v,equipment,look,id,miniature,options)}
  </svg>`;
}
