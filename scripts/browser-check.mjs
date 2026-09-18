// Dependency-free browser smoke checks using an isolated, headless Chromium profile.
// Set BROWSER_PATH to a Chromium executable if Chrome/Edge is installed elsewhere.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { checkScienceLab } from './lab-browser-check.mjs';
import { checkGlassware } from './glassware-browser-check.mjs';
import { checkTransfers } from './transfer-browser-check.mjs';
import { checkReactions } from './reactions-browser-check.mjs';
import { checkCopper } from './copper-browser-check.mjs';
import { checkSafety } from './safety-browser-check.mjs';
import { checkOrganic } from './organic-browser-check.mjs';
import { checkWorkspace } from './workspace-browser-check.mjs';
import { checkBenchMaterials } from './materials-browser-check.mjs';
import { checkElectro } from './electro-browser-check.mjs';
import { checkSavedStateSecurity } from './security-browser-check.mjs';

async function checkNavigation({base,connection,evaluate,click,waitFor,screenshot}) {
  const readState=()=>evaluate('localStorage.getItem("titravelle-science-lab-v2")');
  const before=await readState();
  for(const suffix of ['', '?legacy=1', '#gold', '?legacy=1#notebook']) {
    await connection('Page.navigate',{url:base+suffix});await waitFor('.sl-reagent');
    assert.equal(await readState(),before,'Opening a retired bookmark preserves the current laboratory');
    assert.equal(await evaluate('document.querySelectorAll(".main-nav [data-lab=page]").length'),3);
    assert.equal(await evaluate('Boolean(document.querySelector("a[href*=legacy],a[href*=gold],.chemical-card"))'),false);
  }
  await click('[data-lab="page"][data-page="studies"]');
  assert.equal(await evaluate('document.querySelectorAll("[data-lab=study]:not([data-study^=custom])").length'),9);
  assert.equal(await evaluate('/gold experiment|legacy|earlier studies/i.test(document.body.innerText)'),false);
  await screenshot('current-experiments-desktop.png');
  for(const width of [390,320]) {
    await connection('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    for(const page of ['studies','notebook','bench']) {
      await click(`[data-lab="page"][data-page="${page}"]`);
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${page} fits ${width}px`);
      assert.equal(await evaluate('Boolean(document.querySelector("a[href*=legacy],a[href*=gold]"))'),false);
    }
  }
  await screenshot('current-lab-mobile.png');
  await click('[data-lab="new-run"]');
  assert.equal(await evaluate('document.querySelector("#modal").open'),true);
  await connection('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await connection('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate('document.querySelector("#modal").open'),false);
  assert.equal(await readState(),before,'Navigation and cancelling a new run preserve saved work');
  for(const file of ['app.js','chemistry.js','experiments.js','storage.js','gold.js','gold-real.js','gold-archive.js']) {
    assert.equal(await evaluate(`fetch('/src/${file}').then(r=>r.status)`),404);
  }
  await connection('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  console.log('PASS: nine studies, current notebook preservation, removed links/assets, retired bookmark fallback, mobile navigation, and dialog Escape');
}

const base = process.env.TEST_URL || 'http://localhost:5174';
const artifacts = resolve('artifacts');
await mkdir(artifacts, { recursive: true });
await writeFile(resolve(artifacts, 'browser-results.json'), JSON.stringify({ passed: false, status: 'running', checkedAt: new Date().toISOString() }, null, 2));
const candidates = [process.env.BROWSER_PATH, process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe`, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
let executable;
for (const candidate of candidates) { try { await access(candidate); executable = candidate; break; } catch {} }
if (!executable) throw new Error('Set BROWSER_PATH to a local Chrome or Edge executable.');
const profile = await mkdtemp(resolve(artifacts, 'browser-profile-'));
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let connection, socket;
const errors = [];
const thirdPartyRequests = [];
const pending = new Map();
let counter = 0;
const delay = ms => new Promise(r => setTimeout(r, ms));
const timeout = setTimeout(() => { child.kill(); console.error('Browser check timed out.'); process.exit(1); }, 180000);
try {
  const debuggerUrl = await new Promise((res, rej) => {
    let log = '';
    child.once('error', rej);
    child.stderr.on('data', chunk => { log += chunk; const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) res(match[1]); });
    child.once('exit', code => rej(new Error(`Browser exited (${code}) before connecting. ${log}`)));
  });
  const endpoint = `http://${new URL(debuggerUrl).host}`;
  const tabs = await fetch(endpoint + '/json/list').then(r => r.json());
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.addEventListener('open', res, { once: true }); socket.addEventListener('error', rej, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p?.reject(new Error(message.error.message)); else p?.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + message.params.exceptionDetails.exception?.description);
    if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url) && new URL(message.params.request.url).origin !== new URL(base).origin) thirdPartyRequests.push(message.params.request.url);
  });
  connection = (method, params = {}) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await connection('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const click = selector => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el || el.disabled) throw new Error('Missing or disabled control: ' + ${JSON.stringify(selector)}); el.click(); })()`);
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent`);
  const fill = (selector, value) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const waitFor = async selector => {
    for (let n = 0; n < 100; n++) { if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return; await delay(50); }
    throw new Error(`Timed out waiting for ${selector}; page: ${await evaluate('JSON.stringify({url: location.href, title: document.title, text: document.body.innerText.slice(0, 1100)})')}; errors: ${JSON.stringify(errors)}`);
  };
  const screenshot = async (name, selector) => {
    const clip = selector ? await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`) : undefined;
    const r = await connection('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip?{clip}:{}) });
    await writeFile(resolve(artifacts, name), Buffer.from(r.data, 'base64'));
  };
  await connection('Runtime.enable');
  await connection('Page.enable');
  await connection('Network.enable');
  await connection('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await checkElectro({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  if(process.env.TEST_SUITE!=='electro'&&!process.argv.includes('--electro-only')){
  await checkGlassware({base,connection,evaluate,click,waitFor,screenshot});
  await checkTransfers({base,connection,evaluate,click,fill,waitFor,screenshot});
  await checkReactions({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkCopper({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkSafety({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkOrganic({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkWorkspace({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkBenchMaterials({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkScienceLab({base,connection,evaluate,click,fill,text,waitFor,screenshot});
  await checkSavedStateSecurity({connection,evaluate,waitFor});
  await checkNavigation({base,connection,evaluate,click,waitFor,screenshot});
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(thirdPartyRequests, [], 'The application must not load third-party assets.');
  console.log('PASS: current laboratory navigation and no JavaScript exceptions');
  await writeFile(resolve(artifacts, 'browser-results.json'), JSON.stringify({ passed: true, runtimeErrors: errors, thirdPartyRequests, checkedAt: new Date().toISOString() }, null, 2));
} finally {
  clearTimeout(timeout);
  if (connection && socket?.readyState === 1) { try { await Promise.race([connection('Browser.close'), delay(2000)]); } catch {} }
  socket?.close();
  child.kill();
}
