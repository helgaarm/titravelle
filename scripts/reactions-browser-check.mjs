import assert from 'node:assert/strict';

export async function checkReactions({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const key='titravelle-science-lab-v2';
  const act=(action,extra='')=>click(`[data-lab="${action}"]${extra}`);
  const change=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const state=()=>evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const open=()=>evaluate('document.querySelector(".sl-analysis-tools").open=true');
  const add=async(stock,ml=10)=>{await act('reagent',`[data-reagent="${stock}"]`);await fill('#sl-dose',String(ml));await act('add');};
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await evaluate(`localStorage.removeItem('${key}')`);
  await connection('Page.reload');await waitFor('.sl-reagent');
  await click('#sl-ideal');await open();await act('predict-equations');
  assert.match(await text('#sl-prediction'),/Add reagents/);
  await add('hcl',20);await add('naoh',5);
  assert.match(await text('#sl-prediction'),/0.5 mmol/);
  assert.match(await text('#sl-prediction'),/HCl\(aq\) \+ NaOH\(aq\) → NaCl\(aq\) \+ H₂O\(l\)/);
  const original=JSON.stringify(await state());await act('predict-equations');assert.equal(JSON.stringify(await state()),original);
  await fill('#sl-draft-equations','My prediction: the acid will remain in excess.');
  await act('save-equations');const note=(await state()).draft.equations;
  assert.ok(note.startsWith('My prediction:'));assert.match(note,/0.50000 mmol/);
  await act('save-equations');assert.equal((await state()).draft.equations,note);
  await act('snapshot');assert.equal((await state()).notes[0].draft.equations,note);
  await connection('Page.reload');await waitFor('.sl-reagent');await open();await act('predict-equations');
  assert.match(await text('#sl-prediction'),/0.5 mmol/);
  await add('naoh',5);assert.match(await text('#sl-prediction'),/1 mmol/);
  await act('undo');assert.match(await text('#sl-prediction'),/0.5 mmol/);
  assert.equal((await state()).notes[0].draft.equations,note);
  await evaluate('document.querySelector(".sl-analysis").open=true');await act('display','[data-display="equation"]');
  assert.match(await text('.sl-equation-compact'),/Strong acid–base neutralization/);
  assert.equal((await text('.sl-equation-compact')).includes('Silver chloride precipitation'),false);
  await screenshot('equations-neutralization-desktop.png','.sl-analysis-tools');
  await act('vessel','[data-vessel="flask"]');assert.match(await text('#sl-prediction'),/Add reagents/);
  await add('salt');assert.match(await text('#sl-prediction'),/No new reaction recorded/);
  await add('silver');assert.match(await text('#sl-prediction'),/Silver chloride precipitation/);assert.match(await text('#sl-prediction'),/NaNO₃/);
  await evaluate('document.querySelector("#sl-prediction .sl-equilibrium-details").open=true');
  await screenshot('equations-precipitation-desktop.png','.sl-analysis-tools');
  for(const width of [390,320]) {
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`No page overflow at ${width}px`);
    assert.equal(await evaluate('[...document.querySelectorAll("#sl-prediction .sl-generated-equation")].every(e=>e.scrollWidth<=e.clientWidth+1)'),true,'Equations wrap within cards');
    await screenshot(`equations-mobile-${width}.png`,'.sl-analysis-tools');
  }
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await act('vessel','[data-vessel="beaker-b"]');await add('copper');await add('acetic');
  assert.match(await text('#sl-prediction'),/predictions are withheld/);
  assert.equal(await evaluate('document.querySelectorAll("#sl-prediction .sl-reaction-card").length'),0);
  await change('#sl-mode','assessment');assert.equal(await evaluate('Boolean(document.querySelector(".sl-predictor"))'),false);
  assert.equal(await evaluate('Boolean(document.querySelector(".sl-equation-compact"))'),false);
  await change('#sl-mode','guided');
  await act('vessel','[data-vessel="flask"]');await act('empty');assert.match(await text('#sl-prediction'),/Add reagents/);
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: generated equations, quantities, read-only recalculation, notebook append/deduplication, snapshots, reload, undo, sample switching, unsupported chemistry, assessment, and mobile wrapping');
}
