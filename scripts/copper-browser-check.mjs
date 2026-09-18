import assert from 'node:assert/strict';

export async function checkCopper({base,connection,evaluate,click,fill,text,waitFor,screenshot}) {
  const key='titravelle-science-lab-v2',act=(action,extra='')=>click(`[data-lab="${action}"]${extra}`);
  const state=()=>evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
  const change=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const add=async(id,ml,c='0.1')=>{await act('reagent',`[data-reagent="${id}"]`);await change('#sl-concentration',c);await change('#sl-tool','beaker');await fill('#sl-dose',String(ml));await act('add');};
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  await click('#sl-ideal');for(const reagent of ['salt','water','hcl','copper'])await add(reagent,50,'1');
  await evaluate('document.querySelector(".sl-analysis-tools").open=true');await act('predict-equations');
  assert.match(await text('#sl-prediction'),/Coupled equilibria/);assert.match(await text('#sl-prediction'),/Concentrated mixture · qualitative estimate/);
  assert.match(await text('.sl-mixture-metrics'),/0.86/);assert.match(await text('.sl-mixture-metrics'),/200 mL/);
  assert.match(await text('#sl-prediction'),/CuCl₄²⁻/);assert.match(await text('#sl-prediction'),/HSO₄⁻/);
  assert.equal((await state()).vessels.beaker.volume,200);assert.equal(await evaluate('Boolean(document.querySelector("#sl-prediction .sl-warning"))'),false);
  const before=JSON.stringify(await state());await act('predict-equations');assert.equal(JSON.stringify(await state()),before);
  await act('measure','[data-kind="ph"]');assert.equal((await state()).measurements.at(-1).value,0.86);
  await fill('#sl-draft-equations','My comparison of chloride and sulfate.');await act('save-equations');
  assert.match((await state()).draft.equations,/My comparison/);assert.match((await state()).draft.equations,/CuCl⁺/);assert.match((await state()).draft.equations,/qualitative estimate/);
  await act('snapshot');const note=(await state()).notes[0];assert.match(note.draft.equations,/Analytical|analytical/);
  await screenshot('copper-mixture-desktop.png','.sl-predictor');
  // Existing saved mixtures gain speciation without needing historical events.
  await evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('${key}'));delete s.vessels.beaker.reactionHistory;delete s.vessels.beaker.reactionHistoryComplete;delete s.vessels.beaker.stock;localStorage.setItem('${key}',JSON.stringify(s));})()`);
  await connection('Page.reload');await waitFor('.sl-reagent');await evaluate('document.querySelector(".sl-analysis-tools").open=true');await act('predict-equations');
  assert.match(await text('.sl-mixture-metrics'),/0.86/);assert.equal((await state()).notes[0].draft.equations,note.draft.equations);
  for(const width of [390,320]) {
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`Copper report fits ${width}px`);
    assert.equal(await evaluate('[...document.querySelectorAll("#sl-prediction .sl-generated-equation")].every(e=>e.scrollWidth<=e.clientWidth+1)'),true);
  }
  await screenshot('copper-mixture-mobile.png','.sl-mixture');
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await act('empty');await add('copper',10);await add('naoh',20);
  assert.match(await text('#sl-observation'),/blue solid/);
  assert.ok(await evaluate('document.querySelector(".sl-stage .sl-vessel-sediment").innerHTML.includes("#6ab9d7")'));
  assert.match(await text('#sl-prediction'),/Copper\(II\) hydroxide precipitation/);
  await fill('#sl-equation','Cu++ + 2 OH- -> Cu(OH)2');await act('equation');assert.match(await text('#sl-equation-result'),/are balanced/);
  await screenshot('copper-hydroxide-desktop.png','.sl-stage');
  await add('hcl',25);assert.match(await text('#sl-observation'),/no visible solid/);assert.match(await text('#sl-prediction'),/Copper\(II\) hydroxide dissolution/);
  await act('undo');assert.match(await text('#sl-observation'),/blue solid/);
  await change('#sl-mode','assessment');assert.equal(await evaluate('Boolean(document.querySelector(".sl-mixture"))'),false);
  await evaluate(`localStorage.removeItem('${key}')`);await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: screenshot mixture, copper speciation and pH, high-ionic-strength explanation, notebook persistence, old saves, mobile equations, blue precipitate, acid redissolution, and undo');
}
