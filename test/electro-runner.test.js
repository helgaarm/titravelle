import test from 'node:test';
import assert from 'node:assert/strict';
import { createElectroRunner } from '../src/electro-runner.js';
import { electroPreset, operateElectro } from '../src/electro-engine.js';

function clock(){
  let time=0,id=0;const tasks=new Map();
  return {now:()=>time,schedule:(fn,delay)=>{tasks.set(++id,{fn,at:time+delay});return id;},cancel:id=>tasks.delete(id),
    elapse:ms=>{time+=ms;},run(ms){const end=time+ms;let guard=0;while(tasks.size){const [id,task]=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(task.at>end)break;tasks.delete(id);time=Math.max(time,task.at);task.fn();assert.ok(++guard<10000);}time=Math.max(time,end);},tasks};
}
test('runner follows wall-clock speed, yields work, and cancels stale callbacks after stop/restart',()=>{
  const c=clock();let steps=0,rate=240;const frames=[];
  const runner=createElectroRunner({...c,step:()=>{steps++;return true;},speed:()=>rate,update:on=>frames.push(on),onError:e=>{throw e;}});
  runner.start();runner.start();assert.equal(c.tasks.size,1);c.run(1000);assert.ok(steps>=230&&steps<=240,steps);
  const stale=[...c.tasks.values()][0].fn;runner.stop();const stopped=steps;c.run(500);stale();assert.equal(steps,stopped);
  rate=4;runner.start();stale();c.run(1000);assert.ok(steps-stopped>=3&&steps-stopped<=4);runner.stop();assert.equal(c.tasks.size,0);assert.ok(frames.length>0);
});
test('slow simulation steps yield to input and automatic shutdown cancels future work',()=>{
  const c=clock();let steps=0;const updates=[];
  const runner=createElectroRunner({...c,step:()=>{steps++;c.elapse(5);return steps<4;},speed:()=>240,update:on=>updates.push(on),onError:e=>{throw e;}});
  runner.start();c.run(16);assert.ok(steps<=2,'A callback yields after its 8 ms work budget');
  c.run(200);assert.equal(steps,4);assert.equal(runner.running,false);assert.equal(c.tasks.size,0);assert.equal(updates.at(-1),false);
});
test('runner errors stop scheduling and are reported once',()=>{
  const c=clock();const errors=[];
  const runner=createElectroRunner({...c,step:()=>{throw Error('solver failed');},speed:()=>240,update:()=>{},onError:e=>errors.push(e.message)});
  runner.start();c.run(1000);assert.deepEqual(errors,['solver failed']);assert.equal(runner.running,false);assert.equal(c.tasks.size,0);
});
function powered(){
  let e=electroPreset('water');e.config.sampleInterval=10;
  for(const key of Object.keys(e.predictions))e.predictions[key]='Uncertain';
  e=operateElectro(e,'standard-wires').state;
  return operateElectro(e,'power',{enabled:true},{ideal:false}).state;
}
test('continuous slices preserve chemistry, sampling and random sequence without mutating recorded history',()=>{
  const initial=powered(),before=structuredClone(initial);
  const whole=operateElectro(initial,'advance',{seconds:40},{ideal:false}).state;
  let sliced=initial;
  for(let i=0;i<40;i++)sliced=operateElectro(sliced,'advance',{seconds:1},{ideal:false,continuous:true}).state;
  const {operations:wholeLog,...wholeState}=whole,{operations:sliceLog,...sliceState}=sliced;
  assert.deepEqual(sliceState,wholeState);
  assert.deepEqual(initial,before);
  assert.equal(sliceLog.length,wholeLog.length);assert.equal(sliceLog.at(-1).args.seconds,40);
  Object.freeze(sliced.records);Object.freeze(sliced.operations);for(const row of sliced.records)Object.freeze(row);
  const next=operateElectro(sliced,'advance',{seconds:3},{ideal:false,continuous:true}).state;
  assert.equal(next.records.length,sliced.records.length,'Partial frames do not oversample');
  const stopped=operateElectro(next,'power',{enabled:false},{ideal:false}).state;
  assert.equal(stopped.records.at(-1).time,43);assert.equal(stopped.power,false);assert.equal(next.power,true);
  assert.equal(sliced.operations.at(-1).args.seconds,40,'Log aggregation replaces, rather than mutates, prior entries');
});
