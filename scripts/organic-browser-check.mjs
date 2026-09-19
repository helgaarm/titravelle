import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function checkOrganic({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const key='titravelle-science-lab-v2',state=()=>evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const act=(a)=>click(`[data-organic="${a}"]`),tab=t=>click(`[data-lab="organic-tab"][data-tab="${t}"]`);
  const change=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  await change('#sl-shelf-scope','aqueous');await fill('#sl-shelf-search','copper');assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),1);assert.match(await text('.sl-reagents'),/Copper/);
  await change('#sl-shelf-group','Acids');assert.match(await text('.sl-reagents'),/No matches/);await click('[data-lab="shelf-clear"]');assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),74);
  assert.equal(await evaluate('document.querySelector(".sl-shelf-scroll").clientHeight<=355'),true);
  await click('[data-lab="page"][data-page="studies"]');await click('[data-lab="study"][data-study="soi18"]');await click('[data-lab="confirm-new"]');await waitFor('.og-layout');
  assert.equal((await state()).study,'soi18');assert.match(await text('.og-scope'),/unvalidated/i);
  const guideStep=()=>evaluate('document.querySelector(".og-guide-step").dataset.guideCurrent');
  assert.equal(await guideStep(),'feed');assert.equal(await evaluate('document.querySelectorAll(".og-guide-sequence li").length'),13);
  const unstarted=JSON.stringify((await state()).organic);
  await click('.og-guide-sequence summary');await click('[data-lab="guide-review"][data-step="cool"]');
  await click('[data-lab="guide-settings"]');assert.equal((await state()).station,'reaction');
  assert.deepEqual(await evaluate('["minutes","temperature","pressure"].map(n=>document.querySelector(`[name="${n}"]`).value)'),['60','30','1013']);
  assert.equal(JSON.stringify((await state()).organic),unstarted,'Guide preview and suggested settings must not run chemistry');
  assert.equal(await evaluate('document.activeElement.dataset.organic'),'advance');
  await click('[data-lab="guide-current"]');assert.equal(await evaluate('document.querySelector(".og-guide-step").dataset.guideStep'),'feed');
  await click('[data-lab="guide-open"]');assert.equal((await state()).station,'prepare');
  await click('.og-guide-sequence summary');await screenshot('soi-guided-sequence-desktop.png','.og-guide');
  await fill('#sl-shelf-search','methoxide');assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),1);await click('[data-lab="organic-reagent"][data-reagent="methoxide"]');assert.match(await text('.sl-shelf-selected'),/Corrosive/);await click('[data-lab="shelf-clear"]');
  await tab('reaction');await act('charge-fame');assert.match(await text('#toast'),/feed gate/);assert.equal((await state()).organic.charged.fame,false);
  await tab('prepare');await act('dry-lots');await act('kf-lots');await act('feed-gc');await act('standard-apparatus');await click('#sl-ventilation-toggle');
  assert.equal((await state()).ventilationOn,true);assert.ok((await state()).organic.feedGC.purity>99.5);
  assert.equal(await guideStep(),'condition');
  await screenshot('soi-feed-desktop.png','.og-content');
  await tab('reaction');await act('charge-fame');
  const advance=async(min,temp,pressure)=>{await fill('#org-minutes',String(min));await fill('#org-temperature',String(temp));await fill('#org-pressure',String(pressure));await act('advance');};
  await advance(60,50,50);await act('charge-soa');await advance(30,50,50);await act('catalyst');await act('sample');
  for(let i=0;i<5;i++){await advance(60,110,1);await act('sample');}
  assert.equal(await guideStep(),'cool');
  assert.ok((await state()).organic.samples.at(-1).nmr.ds>7.9);await screenshot('soi-reactor-desktop.png','.og-content');
  const before=JSON.stringify((await state()).organic);await tab('analysis');await tab('reaction');assert.equal(JSON.stringify((await state()).organic),before,'Changing views must not resample or run chemistry');
  await advance(60,30,1013);await tab('workup');await act('neutralize');await act('separate');await act('dry-product');await fill('#org-minutes','60');await act('dry-product');
  await tab('analysis');await act('qc');assert.ok((await state()).organic.samples.at(-1).final);assert.match(await text('.og-content'),/all|DS/);
  assert.equal(await guideStep(),'materials');
  await tab('materials');await act('materials');await act('friction');assert.equal((await state()).organic.friction.rows.length,42);
  await tab('report');assert.match(await text('.og-conclusion'),/High-purity scenario/);assert.match(await text('.og-content'),/synthetic run only/);await act('snapshot');
  assert.match(await text('.og-guide-progress'),/13 of 13 steps recorded/);
  const saved=await state();assert.ok(saved.notes.at(-1).organicReport.includes('SOI-18'));const serialized=JSON.stringify(saved.organic);
  await connection('Page.reload');await waitFor('.og-layout');assert.equal(JSON.stringify((await state()).organic),serialized);
  assert.match(await text('.og-guide-progress'),/run saved/);
  await tab('analysis');for(const width of [390,320]){await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Organic analysis fits ${width}px`);}
  await screenshot('soi-guided-sequence-mobile.png','.og-guide');
  await screenshot('soi-analysis-mobile.png','.og-content');await tab('prepare');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await screenshot('soi-shelf-mobile.png','.sl-inventory');
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  const downloads=await mkdtemp(resolve('artifacts','organic-downloads-'));await connection('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await tab('report');await act('export-report');let downloaded;
  for(let i=0;i<50;i++){try{downloaded=await readFile(resolve(downloads,'soi-18-laboratory-report.md'),'utf8');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  assert.match(downloaded,/Mass|mass balance/);assert.match(downloaded,/Environmental screen/);
  await act('export-html');let html;
  for(let i=0;i<50;i++){try{html=await readFile(resolve(downloads,'soi-18-laboratory-report.html'),'utf8');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  assert.match(html,/<svg/);assert.match(html,/Pressure gauge/);assert.match(html,/Environmental screen/);assert.ok(!/<script\b/.test(html));
  await click('[data-lab="page"][data-page="notebook"]');assert.ok(await evaluate('Boolean(document.querySelector("[data-lab=note-organic]"))'));
  await click('[data-lab="page"][data-page="bench"]');await tab('reaction');const oldMass=(await state()).organic.inputMass;
  await advance(10,50,1);await click('[data-lab="undo"]');assert.equal((await state()).organic.inputMass,oldMass);assert.equal(JSON.stringify((await state()).organic),serialized);
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: searchable grouped shelves, SOI feed gates, reactor/analysis/work-up/QC/control workflow, fixed readings, mass records, persistence, undo, snapshots, exports and mobile layout');
}
