import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const file of [...(await readdir('src')).filter(f=>f.endsWith('.js')).map(f=>`src/${f}`), 'server.mjs']) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit',windowsHide:true});
  if(result.status!==0)process.exit(result.status||1);
}
console.log('PASS: application JavaScript syntax');
