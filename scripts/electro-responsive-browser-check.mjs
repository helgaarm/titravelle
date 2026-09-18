import assert from 'node:assert/strict';

export async function checkElectroResponsiveness({base,connection,evaluate,click,waitFor,screenshot}){
  const state=()=>evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2"))');
  const pause=ms=>evaluate(`new Promise(resolve=>setTimeout(resolve,${Number(ms)}))`);
  await connection('Page.navigate',{url:base});await waitFor('.sl-reagent');
  // Representative long-run archive, compact enough for the browser quota.
  await evaluate(`(async()=>{
    const {createLab,validateLab}=await import('/src/lab-engine.js');
    const {electroPreset,operateElectro}=await import('/src/electro-engine.js');
    const s=createLab(72);s.station='electro';s.study='electro-water';s.ideal=true;
    let e=electroPreset('water');for(const key of Object.keys(e.predictions))e.predictions[key]='Uncertain';
    for(const [action,args] of [['standard-wires',{}],['power',{enabled:true}],['advance',{seconds:60}],['power',{enabled:false}]])e=operateElectro(e,action,args,{ideal:true}).state;
    const row=e.records.at(-1);e.time=34440;e.config.sampleInterval=60;
    e.records=Array.from({length:7200},(_,i)=>({time:27241+i,charge:Math.min(e.charge,Number(e.charge.toPrecision(5))),voltage:3,current:.01,temperature:25,leftMass:5,rightMass:5,hydrogen:0,oxygen:0,leftPH:7,rightPH:7,measured:{voltage:3,current:.01,leftMass:5,rightMass:5},concentrations:{left:{},right:{}}}));
    e.records[e.records.length-1]={...row,time:e.time};s.electro=e;
    s.notes=[{title:'Preserved notebook',date:new Date().toISOString(),draft:{observations:'Keep this note'},measurements:[],log:[]}];
    if(!validateLab(s))throw Error('Invalid long-run fixture');
    localStorage.setItem('titravelle-science-lab-v2',JSON.stringify(s));
  })()`);
  await connection('Page.reload');await waitFor('#el-quick-start');
  assert.equal((await state()).electro.records.length,7200);
  await click('#el-quick-start');
  await evaluate('window.controlNodes=[document.querySelector("#el-quick-stop"),document.querySelector("#el-tab-results"),document.querySelector("#el-voltage-range")]');
  await pause(600);
  assert.equal(await evaluate('window.controlNodes.every(node=>node.isConnected)'),true,'Live readings must preserve control identity');
  await evaluate('window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException("Storage full","QuotaExceededError")}');
  await pause(2200);
  assert.match(await evaluate('document.querySelector("#sl-save-status").textContent'),/Storage unavailable/,'Live autosave failures must remain visible without a page redraw');
  await evaluate('Storage.prototype.setItem=window.originalSetItem');
  for(const panel of ['results','advanced','report','cell']){
    await click(`#el-tab-${panel}`);assert.equal(await evaluate('document.querySelector("[role=tab][aria-selected=true]").dataset.panel'),panel);
    assert.equal(await evaluate('document.querySelector("#el-quick-stop").disabled'),false,'Stop remains available in every view');
  }
  await evaluate('document.querySelector("#el-tab-cell").focus()');
  for(const [key,panel] of [['ArrowRight','results'],['End','report'],['Home','cell'],['ArrowLeft','report']]){
    await connection('Input.dispatchKeyEvent',{type:'keyDown',key});await connection('Input.dispatchKeyEvent',{type:'keyUp',key});
    assert.equal(await evaluate('document.activeElement.dataset.panel'),panel);
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-selected")'),'true');
  }
  await click('#el-tab-cell');
  await evaluate('window.scrollBy(0,400)');
  assert.ok(await evaluate('Math.abs(document.querySelector("#el-workspace-nav").getBoundingClientRect().top)<2'),'View navigation stays reachable while scrolling');
  await screenshot('electro-responsive-toolbar.png','#el-workspace-nav');
  await screenshot('electro-responsive-console.png',null,{viewport:true});
  // Hold the actual mouse button across several live updates. Replacing the
  // control between pointer down/up would lose this click in the old renderer.
  const point=await evaluate('(()=>{const r=document.querySelector("#el-quick-stop").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');
  await connection('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await pause(450);
  await connection('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  const stopped=await state();assert.equal(stopped.electro.power,false);assert.ok(stopped.electro.time>34440);
  await pause(400);assert.deepEqual((await state()).electro,stopped.electro,'No queued step runs after Stop');
  await click('#el-tab-report');await click('#el-quick-start');await pause(350);await click('#el-quick-stop');
  assert.equal((await state()).electro.power,false,'Start and Stop work away from the circuit');
  await click('#el-quick-start');await click('#el-workspace-nav [data-lab="new-run"]');
  assert.equal(await evaluate('document.querySelector("#modal").open'),true);assert.equal((await state()).electro.power,false);
  const pausedTime=(await state()).electro.time;await click('[data-lab="cancel-new"]');await pause(300);
  assert.equal((await state()).electro.time,pausedTime,'Cancelling reset keeps a stopped, stable sample');
  await click('#el-workspace-nav [data-lab="new-run"]');await click('[data-lab="confirm-new"]');await pause(350);
  let fresh=await state();assert.equal(fresh.electro.time,0);assert.equal(fresh.electro.volume,200);assert.equal(fresh.electro.power,false);assert.equal(fresh.notes[0].title,'Preserved notebook');
  for(const width of [390,320]){
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    for(const panel of ['cell','results','advanced','report']){
      await click(`#el-tab-${panel}`);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
      if(panel!=='cell')assert.equal(await evaluate('document.querySelector(".el-layout .og-content").getBoundingClientRect().top<document.querySelector(".el-layout .sl-inventory").getBoundingClientRect().top'),true,'Mobile view switches reveal the selected results before the chemical shelf');
    }
    await evaluate('document.querySelector("#el-workspace-nav").scrollIntoView({block:"start"});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await screenshot(`electro-responsive-toolbar-${width}.png`,null,{viewport:true});
  }
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await click('#el-tab-cell');await click('[data-electro="standard-wires"]');await click('[data-electro="run-uncertain"]');await pause(300);
  await click('#el-workspace-nav [data-lab="restart-free"]');await click('[data-lab="confirm-new"]');await pause(400);
  fresh=await state();assert.equal(fresh.study,null);assert.equal(fresh.electro,undefined);assert.equal(fresh.notes[0].title,'Preserved notebook');
  const cleanVessels=await evaluate("import('/src/lab-engine.js').then(({createLab})=>createLab(1).vessels)");
  assert.deepEqual(fresh.vessels,cleanVessels,'Clean desk restores the standard empty bench, including the burette wetting volume');
  await evaluate('localStorage.removeItem("titravelle-science-lab-v2")');await connection('Page.reload');await waitFor('.sl-reagent');
  console.log('PASS: 7,200-record live controls, real pointer click during updates, keyboard tabs, sticky/mobile navigation, cross-view Start/Stop, and reset cancellation/completion without stale timers');
}
