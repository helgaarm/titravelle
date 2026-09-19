import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function checkScienceLab({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const change=async(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing select '+${JSON.stringify(selector)});el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const act=(action,extra='')=>click(`[data-lab="${action}"]${extra}`);
  const vessel=id=>act('vessel',`[data-vessel="${id}"]`);
  const reagent=id=>act('reagent',`[data-reagent="${id}"]`);
  const state=()=>evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2"))');
  const add=async(id,ml,c='0.1',tool='pipette')=>{await reagent(id);await change('#sl-concentration',c);await fill('#sl-dose',String(ml));await change('#sl-tool',tool);await act('add');};
  const fresh=async id=>{await act('page','[data-page="studies"]');await act('study',`[data-study="${id}"]`);await act('confirm-new');};
  const transfer=async(from,to,ml,tool='pipette')=>{await change('#sl-from',from);await change('#sl-to',to);await fill('#sl-transfer-ml',String(ml));await change('#sl-transfer-tool',tool);await act('transfer');await waitFor('.sl-stage[aria-busy="false"]');};
  const downloads=await mkdtemp(resolve('artifacts','science-downloads-'));
  await connection('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  const downloaded=async name=>{for(let i=0;i<60;i++){try{return await readFile(resolve(downloads,name),'utf8');}catch{await new Promise(r=>setTimeout(r,50));}}throw Error('Missing download '+name);};
  const measure=kind=>act('measure',`[data-kind="${kind}"]`);
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),76);
  assert.equal(await text('#sl-last-reading'),'—');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  await screenshot('science-lab-desktop.png');
  await click('#sl-ideal');
  await add('hcl',10);await add('universal',0.1);await act('mix');await measure('ph');
  assert.ok((await text('#sl-observation')).includes('red liquid'));
  assert.ok((await state()).measurements.at(-1).value<1.1);
  const readings=JSON.stringify((await state()).measurements);await act('page','[data-page="studies"]');await act('page','[data-page="bench"]');assert.equal(JSON.stringify((await state()).measurements),readings);
  console.log('PASS: new laboratory stocks, indicator observations, and explicit stable measurements');

  await fresh('titration');await reagent('naoh');await act('rinse');await act('fill-burette');await vessel('burette');await measure('burette');
  await vessel('flask');await add('unknown',25);await add('phenol',0.1);await act('mix');await measure('ph');
  const unknown=(await state()).unknown,equivalence=unknown*25/0.1;
  await transfer('burette','flask',10,'burette');await act('mix');await measure('ph');
  await transfer('burette','flask',equivalence-10,'burette');await act('mix');await measure('ph');
  assert.ok(Math.abs((await state()).measurements.at(-1).value-7)<0.01);
  await transfer('burette','flask',0.2,'burette');await act('mix');await measure('ph');await act('endpoint');
  assert.ok((await text('#sl-observation')).includes('pink'));assert.ok((await state()).measurements.findLast(m=>m.kind==='ph').value>10);
  assert.equal(await evaluate('document.querySelector(".sl-chart").outerHTML.includes("NaN")'),false);
  assert.equal(await evaluate('document.querySelectorAll(".sl-chart circle").length'),4);
  await fill('#sl-draft-hypothesis','<script>alert(1)</script> A sharp pH change should locate equivalence.');await fill('#sl-draft-conclusion','I overshot the indicator endpoint. I will repeat with smaller additions.');await act('snapshot');
  const note=(await state()).notes[0];await fill('#sl-draft-conclusion','A different draft.');assert.equal((await state()).notes[0].draft.conclusion,note.draft.conclusion);
  await screenshot('science-titration-desktop.png');
  await connection('Page.reload');await waitFor('.sl-reagent');assert.equal((await state()).measurements.length,6);
  await change('#sl-mode','assessment');assert.equal(await evaluate('Boolean(document.querySelector(".sl-guide"))'),false);
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-analysis-tools"))'),false);
  assert.equal(await evaluate('document.body.innerText.includes("Unknown U: ")'),false);
  assert.equal(await evaluate('document.body.innerText.includes("Connect observation to chemistry")'),false);
  await change('#sl-mode','guided');await act('csv');const csv=await downloaded('titravelle-measurements.csv');assert.ok(csv.startsWith('date,time,vessel,trial,kind'));assert.equal(csv.trim().split(/\r?\n/).length,7);
  await vessel('flask');await act('empty');assert.equal(await evaluate('document.querySelectorAll(".sl-chart circle").length'),0);assert.equal((await state()).measurements.length,6);
  console.log('PASS: unknown titration, equivalence, overshoot, graph, snapshot persistence, CSV export, trial separation, and assessment visibility');

  await fresh('precipitation');await vessel('filter');await act('tare');await vessel('beaker');await add('salt',10);await add('silver',15);await act('mix');await change('#sl-to','beaker-b');await act('filter');await vessel('filter');await measure('mass');const wet=(await state()).measurements.at(-1).value;
  await act('wash');await act('wash');await act('wash');await act('dry');await measure('mass');const dry=(await state()).measurements.at(-1).value;
  assert.ok(wet>dry);assert.ok(Math.abs(dry-0.14332)<0.0003);await act('snapshot');
  console.log('PASS: precipitation, tared filter, collection, washing, drying, and gravimetric mass');

  await fresh('dilution');await vessel('volumetric');await add('salt',10,'1');await act('mark');await act('mix');await measure('volume');assert.equal((await state()).measurements.at(-1).value,100);assert.equal((await state()).vessels.volumetric.totals.Na,0.01);
  await evaluate('document.querySelector(".sl-analysis-tools").open=true');await fill('#sl-calc-0','0.1');await fill('#sl-calc-1','100');await fill('#sl-calc-2','1');await act('calculate');assert.ok((await text('#sl-calculation')).startsWith('10.0000'));
  await fill('#sl-equation','Ag+ + Cl- -> AgCl');await act('equation');assert.ok((await text('#sl-equation-result')).includes('are balanced'));
  console.log('PASS: dilution to a calibrated mark, unit calculation, and ionic equation checker');

  await fresh('calorimetry');await vessel('cup');await act('tare');await add('hcl',50,'1','cylinder');await measure('temperature');await vessel('beaker');await add('naoh',50,'1','cylinder');await transfer('beaker','cup',50,'cylinder');await vessel('cup');await act('mix');await measure('temperature');await measure('mass');assert.equal((await state()).measurements.at(-1).value,100);
  const hot=(await state()).vessels.cup.temperature;await act('wait');await measure('temperature');assert.ok((await state()).vessels.cup.temperature<hot);
  await change('#sl-graph','temperature');await change('#sl-graph-vessel','cup');await screenshot('science-calorimetry-desktop.png');
  assert.equal(await evaluate('document.querySelectorAll(".sl-chart circle").length'),3);
  await change('#sl-mode','professor');await act('reveal');assert.ok((await text('#sl-answer')).includes('mol/L'));
  const custom={id:'custom-buffer-check',title:'A custom investigation',objective:'Test a chosen mixture.',question:'What changes?',steps:['Choose a reagent.','Measure pH.'],analysis:'Compare your measurements.'};
  await fill('#sl-custom-json',JSON.stringify(custom));await act('custom');await act('page','[data-page="studies"]');assert.ok((await text('.sl-study-grid')).includes('A custom investigation'));
  await screenshot('science-experiments-desktop.png');await act('page','[data-page="notebook"]');assert.equal(await evaluate('document.querySelectorAll(".sl-study").length'),2);assert.ok((await text('.sl-study-grid')).includes('<script>alert(1)</script>'));assert.equal(await evaluate('document.querySelectorAll(".sl-study script").length'),0);
  await act('export');const exported=JSON.parse(await downloaded('titravelle-laboratory-notebook.json'));assert.equal(exported.notes.length,2);assert.equal(exported.notes[0].draft.conclusion,note.draft.conclusion);assert.equal(Object.hasOwn(exported,'unknown'),false);
  console.log('PASS: calorimetry heat loss, professor definitions, and escaped notebook content');

  await act('page','[data-page="bench"]');await change('#sl-mode','guided');
  for(const width of [390,320]){await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Overflow at ${width}px`);}
  await connection('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('science-lab-mobile.png');
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
}
