import assert from 'node:assert/strict';
import {MINERAL_PORTIONS,mineralProtocol} from '../src/mineral-protocol.js';
export async function checkMinerals({base,connection,evaluate,click,fill,text,waitFor,screenshot}){
  const state=()=>evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2"))');
  const check=async selector=>{
    const {result}=await connection('Runtime.evaluate',{expression:'document'});
    try{
      const reply=await connection('Runtime.callFunctionOn',{objectId:result.objectId,functionDeclaration:'function(selector){const el=this.querySelector(selector);if(!el)throw Error("Missing checkbox");el.checked=true;el.dispatchEvent(new Event("change",{bubbles:true}));}',arguments:[{value:selector}]});
      if(reply.exceptionDetails)throw Error('Could not check the requested control.');
    }finally{await connection('Runtime.releaseObject',{objectId:result.objectId});}
  };
  const openNotes=()=>evaluate('document.querySelector("#mn-observation-notes").open=true');
  const record=async message=>{await openNotes();await fill('#mn-observe-interpretation',message);await check('#mn-record-form [name=reviewed]');await click('[data-mineral=record]');};
  const selectReagent=async reagent=>{await fill('#mn-reagent',reagent);await evaluate('document.querySelector("#mn-reagent").dispatchEvent(new Event("change",{bubbles:true}))');};
  const perform=async (route,index)=>{
    const plan=mineralProtocol(route,index);
    await fill('#mn-apparatus',plan.apparatus);await fill('#mn-source',plan.source);await click('[data-mineral=bench-load]');
    assert.equal((await state()).mineral.pending,null,'Loading apparatus must not generate analytical evidence');
    if(plan.reagent){await selectReagent(plan.reagent);await click('[data-mineral=bench-add]');}
    if(plan.assay)for(const lane of ['blank','positive','sample','spike'])await click(`[data-mineral=bench-control][data-lane=${lane}]`);
    if(plan.mix)await click('[data-mineral=bench-mix]');
    if(plan.apparatus==='filter')await click('[data-mineral=bench-filter]');
    if(plan.apparatus==='microscope')await click('[data-mineral=bench-focus]');
    if(['counter','photometer'].includes(plan.apparatus))await click('[data-mineral=bench-background]');
    if(route==='A'&&index===0){
      const prepared=(await state()).mineral;
      await connection('Page.reload');await waitFor('#mn-run');assert.deepEqual((await state()).mineral,prepared);
      assert.equal(await evaluate('document.querySelector("#mn-reagent").value'),plan.reagent);
      for(const width of [390,320]){
        await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
        await evaluate('document.querySelector("#mn-apparatus-form").scrollIntoView({block:"start"})');
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
        const scrollBefore=await evaluate('scrollY');await click('[data-mineral=bench-mix]');
        assert.equal(await evaluate('document.activeElement.dataset.mineral'),'bench-mix');
        assert.ok(Math.abs(await evaluate('scrollY')-scrollBefore)<250,'Setup actions keep the active controls in view');
        await click('[data-mineral=bench-mix]');
        await screenshot(`mineral-apparatus-${width}.png`,null,{viewport:true});
      }
      await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
    }
    await click('#mn-run');const result=(await state()).mineral;
    assert.equal(result.pending.route,route);assert.equal(result.runs[route].bench.completed,true);
    assert.ok(result.pending.procedure.length>=2);assert.equal(await evaluate('document.querySelector("#mn-observation-notes").open'),false);
    if((route==='A'&&[0,1,2].includes(index))||route==='D')await screenshot(`mineral-bench-${route}-${index}.png`,'#mn-workbench');
  };
  const changeMode=async mode=>{await fill('#sl-mode',mode);await evaluate('document.querySelector("#sl-mode").dispatchEvent(new Event("change",{bubbles:true}))');};
  const draftValues=()=>evaluate('Object.fromEntries([...document.querySelector("#mn-conclusion-form").elements].filter(el=>el.name).map(el=>[el.name,el.type==="checkbox"?el.checked:el.value]))');
  const aDraft={confidence:'Probable',reason:'A draft: compare the cleared precipitate with B before deciding.',compared:true};
  const bDraft={confidence:'Inconclusive',reason:'B draft: the control response needs separate reasoning.',compared:true};
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await click('[data-lab=page][data-page=studies]');
  assert.equal(await evaluate('document.querySelectorAll("[data-study^=mineral-]").length'),5);
  await click('[data-study=mineral-all]');await click('[data-lab=confirm-new]');await waitFor('#mn-preparation');
  assert.equal(await evaluate('document.querySelector("#mn-split").disabled'),true);
  await click('[data-mineral=bench-weigh][data-portion=A]');assert.match(await text('#toast'),/homogenise|tare/i);
  await click('[data-mineral=bench-homogenise]');
  for(const portion of Object.keys(MINERAL_PORTIONS)){await click('[data-mineral=bench-tare]');await click(`[data-mineral=bench-weigh][data-portion=${portion}]`);}
  assert.equal((await state()).mineral.preparation.weighed.length,6);
  await screenshot('mineral-preparation.png','#mn-preparation');
  await check('#mn-nugget');await click('[data-mineral=split]');
  assert.equal((await state()).mineral.pending.step,'split');await openNotes();
  await fill('#mn-observe-interpretation','Reference preserved; independent routes prevent carry-over.');
  await connection('Page.reload');await waitFor('#mn-observation-notes');await openNotes();
  assert.equal(await evaluate('document.querySelector("#mn-observe-interpretation").value'),'Reference preserved; independent routes prevent carry-over.');
  await record('Reference preserved; independent routes prevent carry-over.');
  const preserved=(await state()).mineral.portions.Original;
  const beforeMode=(await state()).mineral;
  await changeMode('student');assert.equal(await evaluate('Boolean(document.querySelector(".mn-advice"))'),false);
  await changeMode('assessment');assert.equal(await evaluate('Boolean(document.querySelector(".mn-equation"))'),false);
  assert.match(await text('#mn-workbench'),/fume hood OFF/);
  await click('#mn-run');assert.equal((await state()).mineral.runs.A.index,0);assert.match(await text('#toast'),/Load/i);
  await changeMode('guided');assert.deepEqual((await state()).mineral,beforeMode);
  assert.equal(await evaluate('Boolean(document.querySelector(".mn-advice"))'),true);
  await fill('#mn-apparatus','reactor');await fill('#mn-source','Original:solid');await click('[data-mineral=bench-load]');
  assert.equal((await state()).mineral.runs.A.bench,undefined,'Protected reference cannot be loaded for digestion');
  await fill('#mn-source','A:solid');await click('[data-mineral=bench-load]');
  await selectReagent('mineral:min-nitric');await click('[data-mineral=bench-add]');
  assert.equal((await state()).mineral.runs.A.bench.charge,0);assert.match(await text('#toast'),/fume hood/);
  await fill('#mn-charge','99');await click('[data-mineral=bench-reset]');
  assert.equal((await state()).mineral.runs.A.bench.loaded,false,'Invalid unsubmitted dose must not block clearing the setup');
  await click('[data-lab=ventilation]');assert.equal((await state()).ventilationOn,true);
  for(const route of ['A','B','C','D']){
    await click(`#mn-tab-${route}`);
    for(let index=0;index<5;index++){
      await perform(route,index);
      if(route==='A'&&index===2){
        assert.equal(await evaluate('document.querySelectorAll(".mn-vial-card").length'),4);
        await screenshot('mineral-silver-controls.png','.mn-vials');
      }
      await record(`Observed stage ${index+1} for aliquot ${route}; compare controls and retained fractions before assigning identity.`);
      assert.equal((await state()).mineral.pending,null);
    }
    if(route==='A'){
      assert.equal((await draftValues()).confidence,'','An unanswered conclusion must not default to a negative result');
      await fill('#mn-conclusion-reason',aDraft.reason);await click('[data-mineral=conclude]');
      assert.equal((await state()).mineral.runs.A.conclusion,null);assert.equal((await draftValues()).reason,aDraft.reason);
      await fill('#mn-conclusion-confidence',aDraft.confidence);await check('#mn-conclusion-compared');
      const checkpoint=(await state()).mineral;
      await click('#mn-tab-B');await click('#mn-tab-A');assert.deepEqual(await draftValues(),aDraft);
      await click('#mn-tab-report');await click('#mn-tab-A');assert.deepEqual(await draftValues(),aDraft);
      await click('[data-lab=page][data-page=notebook]');await click('[data-lab=page][data-page=bench]');
      await click('[data-lab=aqueous-station]');await click('[data-tab=mineral]');assert.deepEqual(await draftValues(),aDraft);
      for(const mode of ['student','assessment','professor','free','guided']){await changeMode(mode);assert.deepEqual(await draftValues(),aDraft);}
      assert.deepEqual((await state()).mineral,checkpoint,'Navigation and modes do not alter chemistry or the draft');
      await connection('Page.reload');await waitFor('#mn-conclusion-form');assert.deepEqual(await draftValues(),aDraft);
      await screenshot('mineral-conclusion-draft.png','#mn-conclusion-form');
      continue;
    }
    if(route==='B'){
      await fill('#mn-conclusion-confidence',bDraft.confidence);await fill('#mn-conclusion-reason',bDraft.reason);await check('#mn-conclusion-compared');
      await click('#mn-tab-A');assert.deepEqual(await draftValues(),aDraft);await click('[data-mineral=conclude]');
      assert.deepEqual((await state()).mineral.runs.A.learner,{confidence:aDraft.confidence,reason:aDraft.reason});
      await click('[data-lab=undo]');assert.deepEqual(await draftValues(),aDraft);await click('[data-mineral=conclude]');
      await click('#mn-tab-B');assert.deepEqual(await draftValues(),bDraft);
      await connection('Page.reload');await waitFor('#mn-conclusion-form');assert.deepEqual(await draftValues(),bDraft);
    }else{
      await fill('#mn-conclusion-form [name=confidence]','Inconclusive');await fill('#mn-conclusion-form [name=reason]','The controls, recovery and specificity limit the claim.');await check('#mn-conclusion-form [name=compared]');
    }
    await click('[data-mineral=conclude]');
    assert.ok((await state()).mineral.runs[route].conclusion);
  }
  assert.deepEqual((await state()).mineral.portions.Original,preserved);
  assert.equal((await state()).mineral.journal.length,21);
  await click('#mn-tab-report');assert.equal(await evaluate('Boolean(document.querySelector("#mn-truth"))'),false);
  assert.match(await text('.mn-content'),/No colour-to-ppm/);
  for(const width of [390,320]){
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('document.querySelector(".mn-nav").scrollIntoView({block:"start"})');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await screenshot(`mineral-report-${width}.png`,null,{viewport:true});
    await click('#mn-tab-D');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await click('#mn-tab-report');
  }
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await fill('#mn-instrument-form [name=method]','ms');await click('[data-mineral=instrument]');await waitFor('#mn-truth');
  assert.equal((await state()).mineral.revealed,true);assert.equal((await state()).mineral.instruments.length,1);
  await screenshot('mineral-instrument-comparison.png','#mn-truth');
  await click('[data-mineral=export-report]');await click('[data-mineral=export-csv]');await click('[data-mineral=snapshot]');
  assert.ok((await state()).notes.at(-1).mineralReport.includes('ground truth'));
  const completed=(await state()).mineral;
  await changeMode('assessment');assert.equal(await evaluate('Boolean(document.querySelector("#mn-truth, #mn-instrument-form, .mn-model-feedback, .mn-equation, .mn-advice"))'),false);
  await screenshot('mineral-assessment.png',null,{viewport:true});
  assert.match(await text('.mn-content'),/ICP-MS/);await click('#mn-tab-A');assert.match(await text('.mn-conclusion'),/A draft:/);
  assert.equal(await evaluate('Boolean(document.querySelector(".mn-model-feedback"))'),false);
  await click('#mn-tab-report');
  await evaluate('globalThis.mineralDownloads=[];const originalURL=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{mineralDownloads.push(blob.text());return originalURL(blob);};');
  await click('[data-mineral=export-report]');await click('[data-mineral=export-csv]');await click('[data-mineral=snapshot]');
  assert.ok(!(await state()).notes.at(-1).mineralReport.includes('## Simulator ground truth'));
  await click('[data-lab=page][data-page=notebook]');await click('[data-lab=note-mineral]');await click('[data-lab=export]');
  const downloads=await evaluate('Promise.all(mineralDownloads)');assert.equal(downloads.length,4);
  assert.ok(downloads.every(content=>!content.includes('## Simulator ground truth')));
  assert.match(downloads[0],/A draft:/);assert.match(downloads[1],/Observed stage/);
  const notebookExport=JSON.parse(downloads[3]);assert.ok(notebookExport.notes.every(note=>!note.mineralReport?.includes('## Simulator ground truth')));
  await click('[data-lab=page][data-page=bench]');await changeMode('professor');
  assert.deepEqual((await state()).mineral,{...completed,route:'A'});assert.equal(await evaluate('Boolean(document.querySelector("#mn-truth"))'),true);
  await changeMode('guided');
  // Keep the original unrestricted snapshot as the one checked below.
  await click('[data-mineral=snapshot]');
  await click('[data-lab=page][data-page=notebook]');assert.match(await text('.sl-study-grid'),/Mineral concentrate investigation/);await click('[data-lab=note-mineral]');
  await click('[data-lab=page][data-page=bench]');await click('[data-lab=aqueous-station]');
  assert.equal((await state()).mineral.revealed,true);
  await fill('#sl-shelf-scope','mineral');await evaluate('document.querySelector("#sl-shelf-scope").dispatchEvent(new Event("change",{bubbles:true}))');
  assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),13);
  await click('[data-reagent=min-thiosulfate]');await click('[data-lab=add-material]');assert.ok((await state()).vessels.beaker.materials);
  await click('[data-tab=mineral]');await click('[data-lab=restart-free]');await click('[data-lab=confirm-new]');
  assert.equal((await state()).mineral,undefined);assert.ok((await state()).notes.at(-1).mineralReport);
  await click('[data-lab=undo]');assert.equal((await state()).mineral.revealed,true);
  await connection('Page.reload');await waitFor('#mn-tab-A');assert.equal((await state()).mineral.revealed,true);
  console.log('PASS: hands-on mineral preparation and four analytical routes, apparatus/reagents/controls, reload persistence, independent drafts, mode-safe reports, instruments, shared shelf/reset/undo and mobile layout');
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');await connection('Page.reload');await waitFor('.sl-reagent');
}
