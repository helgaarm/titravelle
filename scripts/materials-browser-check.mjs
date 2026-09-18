import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function checkBenchMaterials({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const key='titravelle-science-lab-v2',state=()=>evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const change=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const act=a=>click(`[data-lab="${a}"]`),choose=id=>click(`[data-lab="${id.startsWith('dry-')||['sugar','sand','citric','chalk','starch','carbon','iron','magnesium','zinc'].includes(id)?'material-reagent':'organic-reagent'}"][data-reagent="${id}"]`);
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  await change('#sl-shelf-scope','dry');assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),12);
  await choose('sugar');assert.equal((await state()).station,'aqueous');assert.equal((await state()).organic,undefined);
  await fill('#sl-material-mass','2');await fill('#sl-material-volume','1.5');await act('add-material');
  assert.equal((await state()).vessels.beaker.materials['sugar:solid'].mass,2);assert.match(await text('#sl-observation'),/Solid material/);
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-stage .sl-vessel-liquid"))'),false);
  await act('mix');await change('#sl-to','beaker-b');await fill('#sl-transfer-mass','1');await act('transfer-mass');await waitFor('.sl-stage[aria-busy="false"]');
  assert.equal((await state()).vessels['beaker-b'].materials['sugar:solid'].mass,1);await act('undo');assert.equal((await state()).vessels.beaker.materials['sugar:solid'].mass,2);
  await act('snapshot');assert.equal((await state()).notes.at(-1).vessels.beaker.materials['sugar:solid'].mass,2);
  await connection('Page.reload');await waitFor('.sl-material-controls');assert.equal((await state()).shelfSelection,'dry:sugar');assert.match(await text('.sl-material-inventory'),/Sucrose/);
  await click('[data-lab="vessel"][data-vessel="flask"]');await click('[data-lab="reagent"][data-reagent="water"]');await fill('#sl-dose','20');await act('add');
  await choose('fame');assert.equal((await state()).station,'aqueous');await fill('#sl-material-mass','2');await fill('#sl-material-volume','2');await act('add-material');
  assert.ok(await evaluate('Boolean(document.querySelector(".sl-stage .sl-material-layers"))'));await act('mix');assert.equal(await evaluate('Boolean(document.querySelector(".sl-stage .sl-material-layers"))'),false);
  await act('wait');assert.ok(await evaluate('Boolean(document.querySelector(".sl-stage .sl-material-layers"))'));await screenshot('bench-organic-layers.png','.sl-bench');
  await choose('methanol');await fill('#sl-material-mass','1');await fill('#sl-material-volume','1.27');await act('add-material');assert.match(await text('.sl-hazard-list'),/Methanol/);
  await click('[data-lab="measure"][data-kind="ph"]');assert.match(await text('#toast'),/predictions are unavailable/);
  await act('mix');await change('#sl-from','flask');await change('#sl-to','beaker-b');await fill('#sl-transfer-mass','5');await act('transfer-mass');await waitFor('.sl-stage[aria-busy="false"]');
  const transferred=(await state()).vessels['beaker-b'];assert.ok(transferred.materials['methanol:liquid'].mass>0);assert.ok(transferred.materials['fame:liquid'].mass>0);
  await act('empty');assert.equal((await state()).vessels['beaker-b'].mass,0);await act('undo');assert.deepEqual((await state()).vessels['beaker-b'],transferred);
  await click('[data-lab="organic-tab"][data-tab="prepare"]');const reactor=JSON.stringify((await state()).organic);
  await choose('sand');await change('#sl-material-vessel','cylinder');await fill('#sl-material-mass','3');await fill('#sl-material-volume','2');await act('add-material');
  assert.equal((await state()).station,'prepare');assert.equal((await state()).vessels.cylinder.materials['sand:solid'].mass,3);assert.equal(JSON.stringify((await state()).organic),reactor);
  await act('aqueous-station');await screenshot('bench-dry-materials.png','.sl-layout');
  for(const width of [390,320]){await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Weighed materials fit ${width}px`);}
  await screenshot('material-dispensing-mobile.png','.sl-inventory');
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await choose('nitrogen');await act('nitrogen');assert.equal((await state()).vessels.cylinder.nitrogenOn,true);assert.match(await text('.sl-hazard-list'),/oxygen displacement/);await act('nitrogen');
  const downloads=await mkdtemp(resolve('artifacts','material-downloads-'));await connection('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await click('[data-lab="page"][data-page="notebook"]');await act('export');let exported;
  for(let n=0;n<50;n++){try{exported=JSON.parse(await readFile(resolve(downloads,'titravelle-laboratory-notebook.json'),'utf8'));break;}catch{await new Promise(r=>setTimeout(r,50));}}
  assert.equal(exported.vessels.cylinder.materials['sand:solid'].mass,3);assert.equal(exported.notes[0].vessels.beaker.materials['sugar:solid'].mass,2);
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: dry-material shelf, weighed dispensing without reactor navigation, solids/layers, mass transfer, hazard propagation, undo, snapshots, reload, exports, nitrogen and mobile layout');
}
