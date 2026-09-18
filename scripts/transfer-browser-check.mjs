import assert from 'node:assert/strict';

export async function checkTransfers({base,connection,evaluate,click,fill,waitFor,screenshot}) {
  const change=(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const act=action=>click(`[data-lab="${action}"]`);
  const saved=()=>evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2"))');
  const setup=async(from,to,ml,tool)=>{await change('#sl-from',from);await change('#sl-to',to);await fill('#sl-transfer-ml',String(ml));await change('#sl-transfer-tool',tool);};
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');
  await connection('Page.reload');await waitFor('.sl-reagent');
  await click('#sl-ideal');await click('[data-lab="reagent"][data-reagent="copper"]');await fill('#sl-dose','25');await act('add');await act('add');
  await setup('beaker','flask',20,'cylinder');await act('transfer');
  await waitFor('.sl-transfer-scene[data-phase="delivering"]');
  assert.equal(await evaluate('document.querySelector(".sl-transfer-scene").dataset.mode'),'pour');
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-pour-stream"))'),true);
  const committed=await saved();assert.equal(committed.vessels.beaker.volume,30);assert.equal(committed.vessels.flask.volume,20);
  const displayed=await evaluate('(()=>{const d=document.querySelector(".sl-transfer-scene").dataset;return +d.sourceVolume + +d.targetVolume + +d.inTransit;})()');assert.ok(Math.abs(displayed-50)<0.03);
  await evaluate('(()=>{const b=document.querySelector("[data-lab=transfer]");b.disabled=false;b.click();})()');assert.equal((await saved()).log.length,committed.log.length);
  await screenshot('transfer-pouring-desktop.png','.sl-stage');
  await act('finish-transfer');assert.equal((await saved()).log.length,committed.log.length);
  await act('undo');assert.equal((await saved()).vessels.beaker.volume,50);assert.equal((await saved()).vessels.flask.volume,0);
  console.log('PASS: pouring stream, changing levels, exactly-once commit, skip, and undo');

  await setup('beaker','flask',10,'pipette');await act('transfer');
  await waitFor('.sl-transfer-scene[data-phase="moving"]');
  assert.ok(Number(await evaluate('document.querySelector(".sl-transfer-scene").dataset.inTransit'))>0);
  assert.equal(await evaluate('document.querySelector(".sl-transfer-scene").dataset.targetVolume'),'0');
  await waitFor('.sl-transfer-scene[data-phase="delivering"]');await screenshot('transfer-pipette-desktop.png','.sl-stage');
  await waitFor('.sl-stage[aria-busy="false"]');assert.equal((await saved()).vessels.flask.volume,10);
  await connection('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await setup('beaker','flask',5,'pipette');await act('transfer');await waitFor('.sl-transfer-scene[data-phase="delivering"]');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await screenshot('transfer-pipette-mobile.png','.sl-stage');await act('finish-transfer');
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  console.log('PASS: pipette aspiration, in-transit volume, delivery, and mobile animation');

  await click('[data-lab="reagent"][data-reagent="naoh"]');await act('rinse');await act('fill-burette');
  await setup('burette','beaker-b',2,'burette');await act('transfer');await waitFor('.sl-transfer-scene[data-phase="delivering"]');
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-transfer-drops"))'),true);
  await screenshot('transfer-burette-desktop.png','.sl-stage');
  await click('[data-lab="page"][data-page="notebook"]');const navigated=JSON.stringify(await saved());
  await evaluate('new Promise(resolve=>setTimeout(resolve,2000))');assert.equal(await evaluate('Boolean(document.querySelector(".sl-empty"))'),true);assert.equal(JSON.stringify(await saved()),navigated);
  await click('[data-lab="page"][data-page="bench"]');
  await setup('beaker','flask',1,'pipette');await act('transfer');const beforeReload=await saved();await connection('Page.reload');await waitFor('.sl-reagent');
  assert.equal((await saved()).log.length,beforeReload.log.length);assert.equal(await evaluate('Boolean(document.querySelector(".sl-transfer-scene"))'),false);
  console.log('PASS: burette droplets, navigation cleanup, and reload without duplicate transfer');

  await connection('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await setup('beaker','flask',1,'pipette');await act('transfer');await waitFor('.sl-transfer-scene[data-reduced-motion="true"]');
  assert.equal(await evaluate('document.querySelectorAll(".sl-moving-pipette,.sl-transfer-drops,.sl-pour-stream").length'),0);await waitFor('.sl-stage[aria-busy="false"]');
  await connection('Emulation.setEmulatedMedia',{features:[]});
  await setup('flask','flask',1,'pipette');const beforeInvalid=JSON.stringify(await saved());await act('transfer');assert.equal(JSON.stringify(await saved()),beforeInvalid);assert.equal(await evaluate('Boolean(document.querySelector(".sl-transfer-scene"))'),false);
  // Pour-all follows the same validated engine operation and supports small screens.
  await connection('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
  await setup('beaker','beaker-b',1,'pipette');await act('pour');await waitFor('.sl-transfer-scene[data-phase="delivering"]');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await act('finish-transfer');assert.equal((await saved()).vessels.beaker.volume,0);
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');
  console.log('PASS: reduced motion, invalid-operation handling, and pour-all at 320px');
}
