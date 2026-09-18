import assert from 'node:assert/strict';

export async function checkGlassware({base,connection,evaluate,click,waitFor,screenshot}) {
  await connection('Page.navigate',{url:base});await waitFor('.sl-vessel-icon');
  const equipment=[['beaker','beaker'],['beaker-b','beaker'],['flask','flask'],['volumetric','volumetric'],['cylinder','cylinder'],['burette','burette'],['cup','cup'],['filter','filter']];
  assert.equal(await evaluate('document.querySelectorAll(".sl-vessel-icon").length'),8);
  for(const [id,type] of equipment){
    await click(`[data-lab="vessel"][data-vessel="${id}"]`);
    assert.equal(await evaluate('document.querySelector(".sl-stage .sl-glass").dataset.apparatus'),type);
    assert.equal(await evaluate('(()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.length===new Set(ids).size;})()'),true,'All gradient and clipping references must be unique');
    if(id!=='burette')assert.equal(await evaluate('document.querySelectorAll(".sl-stage .sl-vessel-liquid").length'),0,'An empty vessel must not show liquid');
    if(id==='cylinder')await screenshot('glassware-cylinder-workbench.png','.sl-bench');
    if(id==='burette')await screenshot('glassware-burette-workbench.png','.sl-stage');
  }
  // A contact sheet exercises the production renderer at empty, partial and marked
  // volumes. It is only mounted inside this isolated browser test page.
  await evaluate(`(async()=>{
    const {vesselArtwork}=await import('/src/lab-glassware.js');
    const {EQUIPMENT}=await import('/src/lab-data.js');
    const {emptyVessel}=await import('/src/lab-engine.js');
    const items=EQUIPMENT.filter(e=>e.id!=='beaker-b');
    const figures=items.map((e,i)=>{
      const v=emptyVessel(e.id);v.volume=e.id==='volumetric'?100:e.capacity*.55;
      const color=i===2?'#bddbdc':i===5?'#bddbdc':'#77b4cb';
      return '<figure style="margin:0;padding:15px;background:#f5f7f0;border:1px solid #d9e1dc;border-radius:10px"><figcaption style="font:14px system-ui;text-align:center">'+e.name+'</figcaption>'+vesselArtwork(v,e,{colour:color,text:'Visual verification sample',solid:e.id==='filter'})+'</figure>';
    });
    const e=EQUIPMENT.find(e=>e.id==='filter'),v=emptyVessel('filter');v.dry=true;
    figures.push('<figure style="margin:0;padding:15px;background:#f5f7f0;border:1px solid #d9e1dc;border-radius:10px"><figcaption style="font:14px system-ui;text-align:center">Dry filter residue on watch glass</figcaption>'+vesselArtwork(v,{...e,id:'filter-dry'},{colour:'#bddbdc',text:'Dry residue',solid:true})+'</figure>');
    document.body.innerHTML='<main class="science-lab" style="max-width:1440px"><div id="apparatus-sheet" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">'+figures.join('')+'</div></main>';
  })()`);
  assert.equal(await evaluate('document.querySelector(".sl-apparatus-volumetric .sl-vessel-liquid").dataset.liquidLevel'),'121');
  await screenshot('glassware-contact-sheet.png','#apparatus-sheet');
  await connection('Page.navigate',{url:base});await waitFor('.sl-vessel-icon');
  await click('[data-lab="vessel"][data-vessel="cylinder"]');
  for(const width of [390,320]){
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Vessel layout at ${width}px`);
    if(width===390)await screenshot('glassware-cylinder-mobile.png','.sl-bench');
  }
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  // Leave the subsequent workflow checks a clean isolated session.
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');
  console.log('PASS: all vessel shapes, empty states, unique SVG references, volumetric mark alignment, and mobile layouts');
}
