import assert from 'node:assert/strict';
export async function checkMinerals({base,connection,evaluate,click,fill,text,waitFor,screenshot}){
  const state=()=>evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2"))');
  const check=async selector=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const record=async message=>{await fill('#mn-observe-interpretation',message);await check('#mn-record-form [name=reviewed]');await click('[data-mineral=record]');};
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await click('[data-lab=page][data-page=studies]');
  assert.equal(await evaluate('document.querySelectorAll("[data-study^=mineral-]").length'),5);
  await click('[data-study=mineral-all]');await click('[data-lab=confirm-new]');await waitFor('#mn-receive');
  await check('#mn-nugget');await click('[data-mineral=split]');
  assert.equal((await state()).mineral.pending.step,'split');assert.equal(await evaluate('document.querySelector("#mn-next").disabled'),true);
  await fill('#mn-observe-interpretation','Reference preserved; independent routes prevent carry-over.');
  await connection('Page.reload');await waitFor('#mn-observe-interpretation');
  assert.equal(await evaluate('document.querySelector("#mn-observe-interpretation").value'),'Reference preserved; independent routes prevent carry-over.');
  await record('Reference preserved; independent routes prevent carry-over.');
  const preserved=(await state()).mineral.portions.Original;
  await click('#mn-next');assert.equal((await state()).mineral.runs.A.index,0);assert.match(await text('#toast'),/fume hood/);
  await click('[data-lab=ventilation]');assert.equal((await state()).ventilationOn,true);
  for(const route of ['A','B','C','D']){
    await click(`#mn-tab-${route}`);
    for(let index=0;index<5;index++){
      await click('#mn-next');assert.equal((await state()).mineral.pending.route,route);
      if(route==='A'&&index===2){
        assert.equal(await evaluate('document.querySelectorAll(".mn-vial-card").length'),4);
        await screenshot('mineral-silver-controls.png','.mn-vials');
      }
      await record(`Observed stage ${index+1} for aliquot ${route}; compare controls and retained fractions before assigning identity.`);
      assert.equal((await state()).mineral.pending,null);
    }
    await fill('#mn-conclusion-form [name=confidence]','Inconclusive');await fill('#mn-conclusion-form [name=reason]','The controls, recovery and specificity limit the claim.');await check('#mn-conclusion-form [name=compared]');await click('[data-mineral=conclude]');
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
  await click('[data-lab=page][data-page=notebook]');assert.match(await text('.sl-study-grid'),/Mineral concentrate investigation/);await click('[data-lab=note-mineral]');
  await click('[data-lab=page][data-page=bench]');await click('[data-lab=aqueous-station]');
  assert.equal((await state()).mineral.revealed,true);
  await fill('#sl-shelf-scope','mineral');await evaluate('document.querySelector("#sl-shelf-scope").dispatchEvent(new Event("change",{bubbles:true}))');
  assert.equal(await evaluate('document.querySelectorAll(".sl-reagent").length'),11);
  await click('[data-reagent=min-thiosulfate]');await click('[data-lab=add-material]');assert.ok((await state()).vessels.beaker.materials);
  await click('[data-tab=mineral]');await click('[data-lab=restart-free]');await click('[data-lab=confirm-new]');
  assert.equal((await state()).mineral,undefined);assert.ok((await state()).notes.at(-1).mineralReport);
  await click('[data-lab=undo]');assert.equal((await state()).mineral.revealed,true);
  await connection('Page.reload');await waitFor('#mn-tab-A');assert.equal((await state()).mineral.revealed,true);
  console.log('PASS: four guided mineral screens, control vials, observation/reload gates, hood interlock, preserved references, blind conclusions, instrumental comparison, shared shelf/notebook/reset/undo and mobile layout');
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');await connection('Page.reload');await waitFor('.sl-reagent');
}
