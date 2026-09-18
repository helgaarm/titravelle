// Cooperatively run one-second chemistry steps, yielding frequently to input.
// Speed is simulated seconds per wall-clock second, not per timer callback.
export function createElectroRunner({step,update,speed,onError,now=()=>performance.now(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}) {
  let active=false,timer=null,generation=0,last=0,lastUpdate=0,pending=0;
  function stop(){active=false;generation++;if(timer!==null)cancel(timer);timer=null;pending=0;}
  function frame(token){
    if(!active||token!==generation)return;
    timer=null;
    try {
      const started=now(),rate=Math.max(0,speed());
      pending=Math.min(rate/4,pending+Math.min(250,Math.max(0,started-last))*rate/1000);
      last=started;
      let count=0;
      while(active&&pending>=1&&count<8&&now()-started<8){
        pending--;count++;
        if(step()===false){stop();update(false);return;}
      }
      if(started-lastUpdate>=200){lastUpdate=started;update(true);}
      if(active&&token===generation)timer=schedule(()=>frame(token),16);
    } catch(error){stop();onError(error);}
  }
  return {start(){if(active)return;active=true;pending=0;last=lastUpdate=now();const token=++generation;timer=schedule(()=>frame(token),16);},stop,get running(){return active;}};
}
