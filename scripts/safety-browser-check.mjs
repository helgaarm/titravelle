import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function checkSafety({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const key='titravelle-science-lab-v2',act=(action,extra='')=>click(`[data-lab="${action}"]${extra}`);
  const state=()=>evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const change=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const add=async(id,ml,c='0.1')=>{await act('reagent',`[data-reagent="${id}"]`);await change('#sl-concentration',c);await change('#sl-tool','beaker');await fill('#sl-dose',String(ml));await act('add');};
  const checked=()=>evaluate('document.querySelector("#sl-ventilation-toggle").getAttribute("aria-checked")');
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  assert.equal(await checked(),'false');
  assert.match(await text('.sl-stock-safety'),/Acid stock/);
  await click('#sl-ideal');for(const reagent of ['salt','water','hcl','copper'])await add(reagent,50,'1');
  assert.match(await text('.sl-hazard-list'),/Copper-containing material/);
  assert.match(await text('.sl-hazard-list'),/Strongly acidic/);
  assert.match(await text('#announcer'),/Precautions:.*Copper/);
  await act('vessel','[data-vessel="flask"]');
  assert.match(await text('.sl-hazard-list'),/Beaker A/,'Warnings include unselected vessels');
  await act('vessel','[data-vessel="beaker"]');await fill('#sl-seconds','180');await act('heat');
  assert.match(await text('.sl-ventilation-status'),/Ventilation precaution.*OFF/);
  const before=await state();
  await evaluate('document.querySelector("#sl-ventilation-toggle").focus()');
  await connection('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await connection('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.equal(await checked(),'true');assert.equal(await evaluate('document.activeElement.id'),'sl-ventilation-toggle');
  const after=await state();assert.deepEqual(after.vessels,before.vessels);assert.equal(after.time,before.time);assert.equal(after.seed,before.seed);
  assert.match(await text('.sl-hazard-list'),/Copper-containing/);assert.match(await text('.sl-ventilation-status'),/precautions still apply/);
  await act('undo');assert.equal(await checked(),'false');assert.deepEqual((await state()).vessels,before.vessels);
  await click('#sl-ventilation-toggle');await connection('Page.reload');await waitFor('.sl-reagent');assert.equal(await checked(),'true');
  await click('.sl-safety-details summary');assert.match(await text('.sl-safety-details'),/Collect copper solutions/);
  await screenshot('hazards-ventilation-on-desktop.png','.sl-safety');
  await click('#sl-ventilation-toggle');await screenshot('hazards-ventilation-off-desktop.png','.sl-safety');
  await change('#sl-mode','assessment');
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-analysis-tools"))'),false);
  assert.match(await text('.sl-hazard-list'),/Copper/);
  assert.equal(await evaluate('/(?:0\.86|0\.25 mol|pH =)/.test(document.querySelector(".sl-safety").textContent)'),false);
  for(const width of [390,320]) {
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Safety panel fits ${width}px`);
  }
  await screenshot('hazards-ventilation-mobile.png','.sl-safety');
  await connection('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await click('#sl-ventilation-toggle');assert.equal(await evaluate('getComputedStyle(document.querySelector(".sl-hood-flow")).animationName'),'none');
  await connection('Emulation.setEmulatedMedia',{features:[]});
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await act('snapshot');const note=(await state()).notes.at(-1);
  assert.equal(note.safety.ventilationOn,true);assert.ok(note.safety.notices.some(n=>n.id==='copper'));
  await act('page','[data-page="notebook"]');assert.match(await text('.sl-snapshot-safety'),/hood ON/);
  const downloads=await mkdtemp(resolve('artifacts','safety-downloads-'));
  await connection('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await act('export');let exported;
  for(let n=0;n<50;n++){try{exported=JSON.parse(await readFile(resolve(downloads,'titravelle-laboratory-notebook.json'),'utf8'));break;}catch{await new Promise(r=>setTimeout(r,50));}}
  assert.equal(exported?.safety.ventilationOn,true);assert.deepEqual(exported.notes.at(-1).safety,note.safety);
  await act('page','[data-page="bench"]');await act('new-run');await act('confirm-new');
  assert.equal(await checked(),'true','A fresh bench preserves the ventilation setting');
  assert.equal((await state()).vessels.beaker.volume,0);
  assert.equal((await state()).notes.at(-1).safety.ventilationOn,true);
  // Old saves acquire a usable off control without discarding the existing sample.
  await add('hcl',10);await evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('${key}'));delete s.ventilationOn;localStorage.setItem('${key}',JSON.stringify(s));})()`);
  await connection('Page.reload');await waitFor('.sl-reagent');assert.equal(await checked(),'false');assert.equal((await state()).vessels.beaker.volume,10);
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: bench-wide hazard prompts, heating ventilation warning, keyboard switch, persistence, undo, assessment, mobile/reduced motion, notebook/export, new runs and old saves');
}
