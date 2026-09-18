import { APP_NAME, brandMark } from './identity.js';
import { REAGENT, EQUIPMENT, EQUIPMENT_BY_ID, DELIVERY, STUDIES, MODES, SPECIES } from './lab-data.js';
import { createLab, operate, chemistry, predictEquations, appearance, validateLab, validStudy, measurementsCSV } from './lab-engine.js';
import { CALCULATORS, calculate, checkEquation, EQUATION_SPECIES } from './lab-analysis.js';
import { equationsAsText } from './lab-reactions.js';
import { vesselArtwork } from './lab-glassware.js';
import { describeTransfer, transferScene, animateTransfer } from './lab-transfer.js';
import { benchSafety, stockSafety } from './lab-safety.js';
import { shelfView } from './lab-shelf.js';
import { MATERIAL, defaultForm, materialRows, hasMaterials } from './lab-materials.js';
import { LAB_STATIONS, LAB_MATERIALS, LAB_TOOLS, FREE_LAB, stationOf, openStation, restartLab } from './lab-workspace.js';
import { operateOrganic, organicReport } from './organic-engine.js';
import { organicView, organicPrecautions, organicFormArgs, organicPrintable } from './organic-ui.js';
import { organicGuide, organicGuideView } from './organic-guide.js';
import { createElectro, operateElectro, importVessel } from './electro-engine.js';
import { advancedElectro, electroReport, electroCSV } from './electro-analysis.js';
import { electroView, electroFormArgs, electroPrintable } from './electro-ui.js';
import { PREDICTIONS } from './electro-data.js';

export const LAB_KEY = 'titravelle-science-lab-v2';
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (n, digits = 2) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
const option = (value, label, selected) => `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(label)}</option>`;
const button = (action, label, extra = '', primary = false) => `<button type="button" class="sl-button ${primary ? 'sl-primary' : ''}" data-lab="${action}" ${extra}>${label}</button>`;
const field = (id, label, value, extra = '') => `<label>${label}<input id="${id}" type="number" value="${esc(value)}" ${extra}></label>`;
const select = (id, label, options) => `<label>${label}<select id="${id}">${options}</select></label>`;
const equipmentOptions = selected => EQUIPMENT.map(e => option(e.id, e.name, selected)).join('');
const download = (name, contents, type) => { const url = URL.createObjectURL(new Blob([contents], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

export function startLab() {
  let state = createLab(), storageOK = true, recovered = false;
  try { const raw = localStorage.getItem(LAB_KEY); if (raw) { const saved = JSON.parse(raw); if (validateLab(saved)) state = saved; else recovered = true; } } catch { storageOK = false; }
  let page = 'bench', display = 'macro', reagent = 'hcl', concentration = 0.1, dose = 10, tool = 'pipette', from = 'beaker', to = 'flask', transferMl = 10, transferTool = 'pipette', seconds = 60, calculator = 'dilution', calculation = '', equationResult = '', graph = 'ph', graphVessel = 'flask', pendingStudy = null;
  let undo = [], toastTimer, activeTransfer=null, stopTransfer=null;
  let equationsVisible = false;
  let guidePreview = null;
  let electroPanel='cell',electroTimer=null,electroSpeed=60,electroTerminal=null,electroSupplyDraft=null,electroPredictionDraft=null,electroDragging=false;
  const stopElectroTimer=()=>{if(electroTimer!==null){clearInterval(electroTimer);electroTimer=null;}};
  let shelfQuery='', shelfGroup='all', shelfScope='all';
  let selectedCatalog=LAB_MATERIALS.some(r=>r.catalogId===state.shelfSelection)?state.shelfSelection:(stationOf(state)==='aqueous'?'aqueous:hcl':'organic:fame');
  if(selectedCatalog.startsWith('aqueous:'))reagent=selectedCatalog.split(':')[1];
  let materialMass=1,materialVolume=1,materialForm=defaultForm(selectedCatalog.split(':')[1]),transferMass=1;
  const selectedStock=()=>LAB_MATERIALS.find(r=>r.catalogId===selectedCatalog);
  const weighedSelection=()=>selectedStock()?.scope!=='aqueous';
  const save = () => { try { state.shelfSelection=selectedCatalog;localStorage.setItem(LAB_KEY, JSON.stringify(state)); storageOK = true; } catch { storageOK = false; } };
  const notify = message => { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 6500); document.querySelector('#announcer').textContent = message; };
  const allStudies = () => [...STUDIES, ...state.customStudies];
  const study = () => allStudies().find(e => e.id === state.study) || FREE_LAB;
  const remember = () => { undo.push(structuredClone(state)); if (undo.length > 20) undo.shift(); };
  function draw() {
    const focused = document.activeElement?.id, cursor = document.activeElement?.selectionStart;
    const openDetails = new Map([...document.querySelectorAll('.science-lab details')].map(d=>[d.querySelector('summary')?.textContent,d.open]));
    document.querySelector('#app').innerHTML = `<header class="app-header"><a class="brand" href="/" aria-label="${APP_NAME} home"><span class="brand-mark">${brandMark}</span><span class="brand-word">${APP_NAME}<small>CHEMISTRY STUDIES</small></span></a><nav class="main-nav" aria-label="Main navigation">${[['bench','Workbench'],['studies','Experiments'],['notebook','Lab notebook']].map(([id,label]) => `<button class="nav-item ${page === id ? 'active' : ''}" data-lab="page" data-page="${id}" ${page === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav><span class="simulation-label"><span class="status-dot"></span>VIRTUAL LABORATORY</span></header>
      <main id="main" class="science-lab" tabindex="-1">${page === 'bench' ? bench() : page === 'studies' ? catalog() : notebook()}</main>
      <footer class="app-footer"><span>Observe. Measure. Explain. Repeat.</span><span id="sl-save-status">${storageOK ? 'Saved on this device' : 'Storage unavailable — export your notebook'}</span></footer>`;
    for (const d of document.querySelectorAll('.science-lab details')) { const key=d.querySelector('summary')?.textContent; if(openDetails.has(key))d.open=openDetails.get(key); }
    const concentrationControl=document.getElementById('sl-concentration');
    const speedControl=document.getElementById('el-speed');if(speedControl)speedControl.value=String(electroSpeed);
    if(electroTimer!==null)for(const control of document.querySelectorAll('.el-form input,.el-form select,.el-form textarea,[data-electro]'))if(control.dataset.electro!=='pause'&&!control.closest('#el-supply-form'))control.disabled=true;
    if(concentrationControl)concentrationControl.disabled=['water','unknown'].includes(reagent)||REAGENT[reagent].group==='Indicators';
    if(activeTransfer){
      for(const control of document.querySelectorAll('.science-lab button,.science-lab input,.science-lab select'))if(control.dataset.lab!=='finish-transfer')control.disabled=true;
    }
    if (focused) { const el = document.getElementById(focused); el?.focus({preventScroll:true}); if (typeof cursor === 'number' && ['text','search'].includes(el?.type)) el.setSelectionRange(cursor,cursor); }
  }
  function finishTransfer(redraw=true) {
    stopTransfer?.();stopTransfer=null;activeTransfer=null;
    if(redraw)draw();
  }
  function showTransfer(before,result,args,action) {
    activeTransfer=describeTransfer(before,state,args,action);
    draw();
    const host=document.querySelector('#sl-transfer-host');
    const stage=document.querySelector('.sl-stage');
    const bounds=stage.getBoundingClientRect();
    if(bounds.top<0||bounds.bottom>innerHeight)stage.scrollIntoView({behavior:'instant',block:'center'});
    document.querySelector('[data-lab="finish-transfer"]')?.focus({preventScroll:true});
    document.querySelector('#announcer').textContent=`Transferring from ${EQUIPMENT_BY_ID[args.from].name} to ${EQUIPMENT_BY_ID[args.to].name}.`;
    stopTransfer=animateTransfer(host,activeTransfer,()=>{
      const restoreFocus=document.activeElement?.dataset.lab==='finish-transfer';
      finishTransfer();notify(result.message);
      if(restoreFocus)document.querySelector(`[data-lab="${action}"]`)?.focus({preventScroll:true});
    });
  }
  const sharedShelf = () => shelfView(LAB_MATERIALS,{query:shelfQuery,group:shelfGroup,scope:shelfScope,selected:selectedCatalog})+(weighedSelection()?materialControls():'');
  function materialControls() {
    const material=selectedStock(),v=state.vessels[state.selected];
    return `<section class="sl-material-controls"><h3>Use in a vessel</h3>${select('sl-material-vessel','Receiving vessel',equipmentOptions(state.selected))}${material.id==='nitrogen'?`<p>Open-vessel gas flow; no retained gas mass or oxygen-level prediction.</p>${button('nitrogen',`Turn nitrogen ${v.nitrogenOn?'off':'on'}`)}`:`${field('sl-material-mass','Weighed amount (g)',materialMass,'min="0.0001" max="250" step="0.0001"')}${material.id==='water'?'<p>Water uses 1 g/mL in the existing volume model.</p>':`${field('sl-material-volume','Assigned occupied volume (mL)',materialVolume,'min="0.0001" max="250" step="0.0001"')}${select('sl-material-form','Physical form of addition',[['solid','Solid'],['liquid','Liquid']].map(([id,label])=>option(id,label,materialForm)).join(''))}<p class="sl-small">Enter a measured or assumed occupied volume for capacity and the drawing. Defaults are placeholders; density, contraction and exact dissolved volume are not calculated.</p>`}${button('add-material',`Weigh & add to ${esc(EQUIPMENT_BY_ID[state.selected].name)}`,'',true)}`}${stationOf(state)!=='aqueous'?button('aqueous-station','View receiving vessel'):''}</section>`;
  }
  function materialInventory(v) {
    const rows=materialRows(v);if(!rows.length&&!v.nitrogenOn)return '';
    return `<section class="sl-operation sl-material-inventory"><h3>Material sample · ${num(v.mass,4)} g total</h3>${v.nitrogenOn?'<p>Nitrogen flow ON · dissolved gas and oxygen concentration uncalculated.</p>':''}${rows.length?`<p>Tracked additions after transfers. These are not confirmed species after reaction. The balance also includes water and any aqueous solutes.</p><div class="sl-table-wrap"><table class="sl-table"><thead><tr><th>Material</th><th>Mass (g)</th><th>Assigned mL</th><th>Added as</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.material.name)}</td><td>${num(r.mass,5)}</td><td>${num(r.volume,5)}</td><td>${r.form}</td></tr>`).join('')}</tbody></table></div><p class="sl-small">Mix before a representative partial transfer; transfer the whole sample to move all layers and solids. Wait lets the schematic mixture settle. Organic phase regions are illustrations, not calculated phase amounts.</p>${rows.some(r=>r.id==='methoxide')&&v.waterMass>0?'<p class="sl-warning">Known water reaction: CH₃ONa + H₂O → CH₃OH + NaOH. Conversion and heat release are unresolved; ingredient quantities remain an additions ledger.</p>':''}`:''}</section>`;
  }
  function stationControls() {
    return `<section class="sl-panel sl-workspace" aria-label="Laboratory equipment"><div class="sl-section-head"><div><h2>Equipment & instruments</h2><p class="sl-small">Switch tools at any time. Samples and readings stay in place.</p></div>${button('restart-free','Restart without experiment')}</div><nav class="og-tabs" aria-label="Laboratory work areas">${LAB_STATIONS.map(([id,label])=>button(id==='aqueous'?'aqueous-station':'organic-tab',label,`data-tab="${id}" ${stationOf(state)===id?'aria-current="page"':''}`)).join('')}</nav><label>Open equipment<select id="sl-equipment"><option value="">Choose equipment or an instrument…</option>${LAB_TOOLS.map(t=>option(t.id,t.name,'')).join('')}</select></label><p class="sl-small">All shelf materials can be used in the vessel bench. Specialized organic analyses use the reactor, feed or isolated product; importing arbitrary bench samples into that analysis is not yet supported.</p></section>`;
  }
  function bench() {
    const e=study(), aqueous=stationOf(state)==='aqueous';
    const header=`<div class="sl-heading"><div><div class="sl-eyebrow">THE OPEN LABORATORY</div><h1>Your chemistry laboratory.</h1><p>${!e.id?'Free exploration. No experiment selected. Use the shared shelf and equipment to explore your own question.':state.mode==='free'?'Follow your question with the shared shelf and equipment.':`Experiment guide: <strong>${esc(e.title)}</strong>. All equipment is available.`}</p></div><div class="sl-mode">${select('sl-mode','Learning mode',Object.entries(MODES).map(([id,label])=>option(id,label,state.mode)).join(''))}${aqueous||stationOf(state)==='electro'?`<label class="sl-check"><input id="sl-ideal" type="checkbox" ${state.ideal?'checked':''}>Ideal measurements</label>`:'<p class="sl-small">Organic tools use an open research view and their own stated uncertainties.</p>'}</div></div>${stationControls()}${safetyPanel()}${state.organic&&( !aqueous || Object.values(state.organic.charged).some(Boolean))?organicPrecautions(state.organic):''}${state.mode==='guided'&&aqueous&&e.id&&e.id!=='soi18'?`<details class="sl-guide" open><summary>Your investigation · ${esc(e.question)}</summary><ol>${e.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details>`:''}`;
    const guide = state.study==='soi18' && state.organic ? organicGuideView(state.organic,state,guidePreview) : '';
    return header+guide+(aqueous?aqueousBench():stationOf(state)==='electro'?electroView(state.electro,{shelf:sharedShelf(),selected:selectedCatalog,panel:electroPanel,running:electroTimer!==null,guided:Boolean(e.preset)&&state.mode==='guided',canUndo:undo.length>0,selectedTerminal:electroTerminal,supplyDraft:electroSupplyDraft,predictionDraft:electroPredictionDraft}):organicView(state.organic,{tab:stationOf(state),shelf:sharedShelf(),canUndo:undo.length>0}));
  }
  function aqueousBench() {
    const e = study(), v = state.vessels[state.selected], c = chemistry(v), look = appearance(v), assessment = state.mode === 'assessment';
    return `
      <div class="sl-context"><span>Model clock <strong>${num(state.time)} s</strong> · Room 25 °C</span><span>${state.ideal ? 'Uncertainty and handling losses off' : 'Instrument uncertainty and handling losses on'}</span>${button('undo','Undo last operation',undo.length ? '' : 'disabled')}${button('new-run','New run')}</div>
      ${assessment ? '<p class="sl-advice">Assessment mode hides instructions, model contents, equations, hints, and solution feedback. Safety precautions, your measurements and notebook remain available. This local learning mode is not a secure examination system.</p>' : ''}
      <div class="sl-layout"><aside class="sl-panel sl-inventory">${sharedShelf()}${weighedSelection()?'':`<div class="sl-stock-controls">${select('sl-concentration','Stock concentration',[0.01,0.1,1].map(n => option(String(n),`${n.toFixed(n === 1 ? 2 : 3)} mol/L`,String(concentration))).join(''))}<p>${reagent === 'unknown' ? 'Unknown U is hydrochloric acid. Its concentration is not on the bottle.' : REAGENT[reagent].group === 'Indicators' ? 'Trace indicator solution. Use 0.10 mL per sample; acid–base effects of the dye are omitted.' : reagent === 'water' ? 'Distilled water contains no added solute.' : 'Aqueous stock; each selected concentration has its own solute amount.'}</p></div>${stockPrecautions()}`}</aside>
      <section class="sl-panel sl-bench"><div class="sl-section-head"><h2>Workbench</h2><span>${esc(EQUIPMENT_BY_ID[v.id].name)}</span></div><div class="sl-vessels" role="group" aria-label="Select laboratory equipment">${EQUIPMENT.map(eq => `<button data-lab="vessel" data-vessel="${eq.id}" aria-pressed="${v.id === eq.id}" class="${v.id === eq.id ? 'selected' : ''}"><span class="sl-vessel-thumbnail">${vesselArtwork(state.vessels[eq.id], eq, appearance(state.vessels[eq.id]), { miniature: true })}</span>${esc(eq.name)}<small>${state.vessels[eq.id].dry ? 'Dry residue' : `${num(state.vessels[eq.id].volume,1)} mL · model volume`}</small></button>`).join('')}</div>
        <div class="sl-stage" aria-busy="${Boolean(activeTransfer)}"><div class="sl-stage-label"><span>${esc(EQUIPMENT_BY_ID[v.id].name)}</span><span>${v.mixed ? 'Mixed' : 'Not mixed'}</span></div>${activeTransfer ? `<div id="sl-transfer-host">${transferScene(activeTransfer)}</div>` : vesselArtwork(v,EQUIPMENT_BY_ID[v.id],look)}<p class="sl-observation" id="sl-observation" ${activeTransfer ? 'hidden' : ''}>${esc(look.text)}${state.log.at(-1)?.text.includes('Bubbles') ? ' · Gas was released during the last operation.' : ''}</p><div class="sl-stage-actions">${activeTransfer ? button('finish-transfer','Skip animation') : button('mix','Mix sample')+button('empty','Empty vessel')}</div></div>
        ${materialInventory(v)}
        ${weighedSelection()?`<div class="sl-operation"><h3>Add selected material</h3><p>${esc(selectedStock().name)} · set the amount and receiving vessel in the shelf controls.</p>${selectedStock().id==='nitrogen'?'':button('add-material','Weigh & add selected material','',true)}</div>`:`<div class="sl-operation"><h3>Dispense into selected vessel</h3><div class="sl-controls">${field('sl-dose','Nominal volume (mL)',dose,'min="0.01" max="250" step="0.01"')}${select('sl-tool','Measuring tool',Object.entries(DELIVERY).filter(([id]) => id !== 'burette').map(([id,d]) => option(id,d.name,tool)).join(''))}</div>${button('add',`Add ${esc(REAGENT[reagent].name)}`,'',true)}</div>`}
        <details class="sl-operation" open><summary>Transfer between vessels</summary><div class="sl-controls">${select('sl-from','Source',equipmentOptions(from))}${select('sl-to','Receiver',equipmentOptions(to))}${field('sl-transfer-ml','Nominal volume (mL)',transferMl,'min="0.01" step="0.01"')}${select('sl-transfer-tool','Transfer tool',Object.entries(DELIVERY).map(([id,d]) => option(id,d.name,transferTool)).join(''))}</div><div class="sl-row">${button('transfer','Transfer measured amount')}${button('pour',hasMaterials(state.vessels[from])?'Transfer entire sample':'Transfer all liquid')}</div><div class="sl-controls">${field('sl-transfer-mass','Sample mass to transfer (g)',transferMass,'min="0.0001" max="250" step="0.0001"')}</div>${button('transfer-mass','Transfer sample by mass')}<p class="sl-small">Mass transfer carries a representative portion of every tracked ingredient. Mix first for a partial transfer.</p></details>
        <details class="sl-operation"><summary>Prepare, separate & control temperature</summary><div class="sl-equipment-actions">${button('rinse','Condition burette with selected stock')}${button('fill-burette','Fill burette to zero mark')}${button('mark','Fill volumetric flask to 100 mL mark')}${button('filter','Filter selected sample into receiver')}${button('wash','Wash filter into receiver')}${button('dry','Dry selected filter residue')}</div><p class="sl-small">Filtration and washings use the receiver chosen above. Tare the empty filter before collecting a residue. A new burette contains 0.5 mL rinse water.</p><div class="sl-controls">${field('sl-seconds','Elapsed time (s)',seconds,'min="1" max="600" step="1"')}</div><div class="sl-row">${button('heat','Hotplate · 50 W')}${button('cool','Cooling bath · 5 °C')}${button('wait','Wait at room temperature')}</div></details>
      </section>
      <aside class="sl-panel sl-instruments"><div class="sl-section-head"><h2>Instruments</h2><span>Take a reading</span></div><div class="sl-readout"><span>Last measurement</span><strong id="sl-last-reading">${state.measurements.length ? `${num(state.measurements.at(-1).value,4)} <small>${esc(state.measurements.at(-1).unit)}</small>` : '—'}</strong><p>${state.measurements.length ? `${esc(EQUIPMENT_BY_ID[state.measurements.at(-1).vessel].name)} · ${num(state.measurements.at(-1).time)} s` : 'Select a sample, then an instrument.'}</p></div><div class="sl-instrument-buttons">${[['ph','pH meter'],['temperature','Thermometer'],['mass','Analytical balance'],['volume','Volume reading'],['burette','Burette meniscus']].map(([kind,label]) => button('measure',label,`data-kind="${kind}"`)).join('')}</div><div class="sl-row">${button('calibrate',state.meterCalibrated ? 'pH meter calibrated' : 'Calibrate pH meter')}${button('tare','Tare current load')}${button('endpoint','Mark observed endpoint')}</div><p class="sl-small">${state.meterCalibrated ? 'Calibration active.' : 'pH meter has not been calibrated.'} Balance zero: ${num(state.balanceTare,4)} g. Readings persist when you change views.</p>
        ${c.warning ? `<p class="sl-warning">${esc(c.warning)}</p>` : ''}
        ${!assessment ? `<details class="sl-analysis"><summary>Connect observation to chemistry</summary><div class="sl-row">${['macro','particle','equation'].map(id => button('display',id[0].toUpperCase()+id.slice(1),`data-display="${id}" aria-pressed="${display===id}"`)).join('')}</div>${display === 'macro' ? '<p>Describe the colour, clarity, and visible solid before assigning chemical identities.</p>' : display === 'particle' ? particles(v,c) : equationResults(true)}</details>` : ''}
        <details class="sl-analysis"><summary>Model boundaries & references</summary><p>Ideal aqueous activities and additive volumes; equilibrium constants are fixed at 25 °C even during heating. Strong-acid/base heat release is modeled for simple acid/base mixtures; copper/sulfate reaction heats and heat of dilution are omitted. Temperature is limited to 5–80 °C; boiling and evaporation are not modeled, except the supported filter drying operation.</p><p>Copper with chloride, sulfate, strong acid, water, or hydroxide uses coupled ligand, protonation, hydrolysis, and Cu(OH)₂ equilibria. Concentrated solutions give qualitative estimates. Competing copper chemistry with acetate, carbonate, or silver, other copper minerals, and copper-residue drying are not modeled. Mixing is needed for representative sampling and suspended-solid transfer; colours are qualitative.</p><p>These are virtual teaching operations.</p><a href="https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch18/complex.php" target="_blank" rel="noreferrer">Purdue · Solubility equilibria ↗</a><br><a href="https://openstax.org/books/chemistry/pages/5-2-calorimetry" target="_blank" rel="noreferrer">OpenStax · Calorimetry ↗</a><br><a href="https://github.com/usgs-coupled/phreeqc3/blob/master/database/minteq.v4.dat" target="_blank" rel="noreferrer">USGS · Copper equilibrium constants ↗</a></details>
      </aside></div>
      <section class="sl-results"><div class="sl-panel">${plot()}${measurementTable(state.measurements.slice(-12))}<div class="sl-row">${button('csv','Export all readings · CSV')}${button('endpoint','Mark observed endpoint')}</div>${state.endpoints.length ? `<p class="sl-small">Observed endpoint readings: ${state.endpoints.map(x => `${num(x.value)} mL`).join(', ')}. Subtract the initial reading for each trial.</p>` : ''}</div><div class="sl-panel sl-draft">${draft()}</div></section>
      ${assessment ? '' : analysisTools()}
      ${e.id && ['guided','professor'].includes(state.mode) ? `<details class="sl-panel sl-log"><summary>Discussion · compare with your conclusion</summary><p>${esc(e.analysis)}</p></details>` : ''}
      <details class="sl-panel sl-log"><summary>Procedure log · ${state.log.length} operations</summary><ol>${state.log.slice(-50).map(r => `<li><time>${num(r.time)} s</time> ${esc(r.text)}</li>`).join('') || '<li>Your actions will be recorded here.</li>'}</ol></details>
      ${state.mode === 'professor' ? professor() : ''}`;
  }
  function safetyCard(item) {
    return `<article class="sl-safety-card" data-hazard="${esc(item.id)}"><h3>${esc(item.title)}</h3>${item.vessels?.length ? `<p class="sl-safety-location">${item.vessels.map(esc).join(' · ')}</p>` : ''}<p>${esc(item.detail)}</p><p><strong>Precaution:</strong> ${esc(item.precaution)}</p></article>`;
  }
  function snapshotSafety(note) {
    if (typeof note.safety?.ventilationOn !== 'boolean') return '';
    const notices = Array.isArray(note.safety.notices) ? note.safety.notices.filter(n=>n && typeof n.title==='string' && typeof n.precaution==='string') : [];
    return `<details class="sl-snapshot-safety"><summary>Precautions at snapshot · hood ${note.safety.ventilationOn ? 'ON' : 'OFF'}</summary><p>Simulated local exhaust setting; not a measured exposure.</p><ul>${notices.map(n=>`<li><strong>${esc(n.title)}</strong><br>${esc(n.precaution)}</li>`).join('')}</ul></details>`;
  }
  function stockPrecautions() {
    const stock = stockSafety(reagent, concentration);
    return `<section class="sl-stock-safety" aria-label="Selected stock precautions"><h3>Before dispensing</h3>${stock.notices.length ? `<ul>${stock.notices.map(n=>`<li>${esc(n.title)}</li>`).join('')}</ul><details><summary>Stock precautions</summary>${stock.notices.map(safetyCard).join('')}</details>` : `<p>${esc(stock.summary)}</p>`}</section>`;
  }
  function safetyPanel() {
    const report = benchSafety(state), on = report.ventilationOn;
    return `<section class="sl-panel sl-safety" aria-labelledby="sl-safety-title">
      <div class="sl-safety-heading"><div><div class="sl-eyebrow">PLAN YOUR PRECAUTIONS</div><h2 id="sl-safety-title">Hazards & ventilation</h2></div><span class="sl-small">Qualitative guidance · all vessels</span></div>
      <div class="sl-safety-grid"><div class="sl-ventilation ${on ? 'is-on' : 'is-off'}">
        <svg class="sl-hood" viewBox="0 0 240 134" aria-hidden="true"><path d="M104 19V5h32v14" fill="#e0e9e3" stroke="#708980" stroke-width="2"/><path d="M29 120V27q0-8 8-8h166q8 0 8 8v93M22 120h196" fill="#f9fbf7" stroke="#708980" stroke-width="2"/><path d="M39 37h162v13H39z" fill="#dce6df"/><path d="M178 57v55M183 57v55" stroke="#a3b6aa"/><path d="M81 81v29q0 4 4 4h29q4 0 4-4V81M78 81h7m29 0h7" fill="#e5f0eb" stroke="#6c8c82" stroke-width="2"/><path d="M83 99h33v11q0 2-3 2H86q-3 0-3-2z" fill="#9cbeb7"/><g class="sl-hood-flow" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M47 89h17q5 0 5-5V65h91V36M47 102h15M126 98h31q9 0 9-9V65"/><path d="m155 41 5-5 5 5m-4 29 5-5 5 5"/></g><circle cx="190" cy="32" r="4" class="sl-hood-light"/></svg>
        <div class="sl-ventilation-label"><strong>Fume hood ventilation</strong><span class="sl-ventilation-badge">${on ? 'ON' : 'OFF'}</span></div>
        <button type="button" id="sl-ventilation-toggle" class="sl-button sl-ventilation-toggle" data-lab="ventilation" role="switch" aria-checked="${on}" aria-label="Fume hood ventilation" aria-describedby="sl-ventilation-help"><span class="sl-switch-track" aria-hidden="true"><span></span></span>Turn ${on ? 'off' : 'on'}</button>
        <p id="sl-ventilation-help" class="sl-small">Simulates local exhaust at the workbench. Room ventilation is separate; an open window or room fan does not replace a chemical fume hood.</p>
      </div><div class="sl-safety-overview"><p class="sl-ventilation-status ${report.needsHood && !on ? 'sl-warning' : ''}">${esc(report.ventilationMessage)}</p>
        <h3>Current samples & run record</h3><p class="sl-small">${esc(report.summary)}</p>
        ${report.notices.length ? `<ul class="sl-hazard-list">${report.notices.map(n=>`<li data-hazard-summary="${esc(n.id)}"><strong>${esc(n.title)}</strong>${n.vessels.length ? `<span>${n.vessels.map(esc).join(' · ')}</span>` : ''}</li>`).join('')}</ul>` : ''}
        <p class="sl-safety-ppe"><strong>For real laboratory work:</strong> splash goggles, lab coat, closed shoes and gloves selected for the chemicals and task. Follow the instructor’s procedure and the actual bottle safety data sheet (SDS).</p>
        <p class="sl-small">Airborne concentrations, exposure and hood performance are not calculated. Turning this switch on does not certify safe conditions or change the reaction calculation.</p>
      </div></div>
      <details class="sl-safety-details"><summary>Precautions, explanations & sources</summary><div class="sl-safety-cards">${report.notices.map(safetyCard).join('')}</div><p class="sl-small">These prompts cover the modeled ingredients and conditions, not every possible hazard. Missing alerts do not establish safety. Concentration, formulation and handling affect classification; neutralization and filtration do not necessarily remove toxicity.</p><p class="sl-small">References: <a href="https://ehrs.upenn.edu/health-safety/lab-safety/fume-hoods" target="_blank" rel="noreferrer">Penn EHRS · fume hoods</a>; <a href="https://www.cdc.gov/niosh/npg/npgd0332.html" target="_blank" rel="noreferrer">NIOSH · hydrogen chloride</a>; <a href="https://www.cdc.gov/niosh/npg/npgd0565.html" target="_blank" rel="noreferrer">sodium hydroxide</a>; <a href="https://www.cdc.gov/niosh/npg/npgd0150.html" target="_blank" rel="noreferrer">copper dusts and mists</a>; <a href="https://www.cdc.gov/niosh/npg/npgd0557.html" target="_blank" rel="noreferrer">silver</a>; <a href="https://www.ncbi.nlm.nih.gov/books/NBK590820/" target="_blank" rel="noreferrer">NTP · phenolphthalein</a>. Substance references do not classify every diluted mixture. Supplier examples: <a href="https://www.sigmaaldrich.com/US/en/product/mm/102784" target="_blank" rel="noreferrer">0.1 M copper sulfate</a> and <a href="https://www.sigmaaldrich.com/US/en/product/mm/109081" target="_blank" rel="noreferrer">0.1 M silver nitrate</a>.</p></details>
    </section>`;
  }
  function particles(v,c) {
    if (c.warning) return '<p>Speciation is unavailable for this mixture.</p>';
    if(c.speciation)return `<p class="sl-small">Calculated aqueous species, not particle measurements. Concentrations are approximated as activities.</p><div class="sl-particles">${c.speciation.aqueous.filter(s=>s.moles>1e-10).map(s=>`<span>${esc(s.label)}<small>${num(s.moles*1000,5)} mmol</small></span>`).join('')}</div>${c.copperSolid>1e-12?`<p>Solid Cu(OH)₂: ${num(c.copperSolid*1000,5)} mmol</p>`:''}`;
    return `<p class="sl-small">Conceptual inventory; numbers are model amounts, not measured results. Atom-scale positions are not simulated.</p><div class="sl-particles">${Object.entries(c.dissolved).filter(([,n])=>n>1e-12).map(([id,n]) => `<span>${esc(SPECIES[id].label)}<small>${num(n*1000,5)} mmol</small></span>`).join('') || '<span>H₂O · solvent</span>'}</div>${c.solid ? `<p>Solid AgCl: ${num(c.solid*1000,5)} mmol</p>` : ''}`;
  }
  function plot() {
    const trial = Number(state.vessels[graphVessel].trial || 0);
    const rows = state.measurements.filter(r => r.kind === graph && r.vessel === graphVessel && (r.trial || 0) === trial), xlabel = graph === 'ph' ? 'Cumulative burette delivery to this vessel (mL)' : 'Elapsed time (s)';
    const points = rows.map(r => ({x: graph === 'ph' ? r.delivered : r.time,y:r.value}));
    const xMax = Math.max(1,...points.map(p=>p.x)), yMin = graph === 'ph' ? Math.min(0,...points.map(p=>p.y)) : Math.floor(Math.min(20,...points.map(p=>p.y))-1), yMax = graph === 'ph' ? Math.max(14,...points.map(p=>p.y)) : Math.ceil(Math.max(30,...points.map(p=>p.y))+1);
    const coords = points.map(p=>`${52+p.x/xMax*440},${190-(p.y-yMin)/(yMax-yMin)*150}`).join(' ');
    return `<div class="sl-section-head"><h2>Evidence, point by point</h2><span>Recorded readings · current trial ${trial+1}</span></div><div class="sl-controls">${select('sl-graph','Vertical axis',option('ph','pH',graph)+option('temperature','Temperature (°C)',graph))}${select('sl-graph-vessel','Sample',equipmentOptions(graphVessel))}</div><svg class="sl-chart" viewBox="0 0 540 246" role="img" aria-label="${graph === 'ph' ? 'pH' : 'Temperature'} graph with ${points.length} recorded points. Values are in the measurement table."><path d="M52 35V190H500" fill="none" stroke="currentColor" opacity=".45"/><text x="10" y="24">${graph === 'ph' ? 'pH' : '°C'}</text>${[0,.5,1].map(t => `<text x="41" y="${194-t*150}" text-anchor="end">${num(yMin+t*(yMax-yMin),1)}</text><path d="M52 ${190-t*150}H500" stroke="currentColor" opacity=".09"/><text x="${52+t*440}" y="211" text-anchor="middle">${num(t*xMax,1)}</text>`).join('')}${points.length ? `<polyline points="${coords}" fill="none" stroke="var(--sl-green)" stroke-width="2"/>${points.map(p=>`<circle cx="${52+p.x/xMax*440}" cy="${190-(p.y-yMin)/(yMax-yMin)*150}" r="3" fill="var(--sl-green)"><title>${num(p.x)}; ${num(p.y)}</title></circle>`).join('')}` : '<text x="280" y="114" text-anchor="middle">Take a measurement to begin.</text>'}<text x="275" y="238" text-anchor="middle">${xlabel}</text></svg>`;
  }
  function measurementTable(rows) {
    return `<div class="sl-table-wrap"><table class="sl-table"><caption>Measurements${rows.length === 12 ? ' · latest 12' : ''}</caption><thead><tr><th scope="col">Time</th><th scope="col">Sample</th><th scope="col">Instrument</th><th scope="col">Reading</th><th scope="col">± random bound</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${num(r.time)} s</td><td>${esc(EQUIPMENT_BY_ID[r.vessel]?.name || r.vessel)}</td><td>${esc(r.kind)}</td><td>${num(r.value,4)} ${esc(r.unit)}</td><td>${num(r.uncertainty,4)}</td></tr>`).join('') || '<tr><td colspan="5">No readings yet. Measuring is a separate action from adding a reagent.</td></tr>'}</tbody></table></div><p class="sl-small">Random bounds exclude calibration and handling biases. Full reading metadata is included in CSV.</p>`;
  }
  function draft() {
    return `<div class="sl-section-head"><h2>Your laboratory notebook</h2><span>Working draft</span></div><p class="sl-small">Write your reasoning. Actions and readings are attached automatically when you save a snapshot.</p><div class="sl-notebook-fields">${Object.entries(state.draft).map(([id,text])=>`<label>${id === 'errors' ? 'Sources of error & next trial' : esc(id[0].toUpperCase()+id.slice(1))}<textarea data-draft="${esc(id)}" id="sl-draft-${esc(id)}" rows="${['hypothesis','conclusion'].includes(id)?3:2}" maxlength="10000" placeholder="${id === 'hypothesis' ? 'What do you predict, and why?' : id === 'conclusion' ? 'What does your evidence support?' : 'Your notes…'}">${esc(text)}</textarea></label>`).join('')}</div>${button('snapshot','Save notebook snapshot','',true)}`;
  }
  function analysisTools() {
    const calc = CALCULATORS[calculator];
    return `<details class="sl-panel sl-analysis-tools"><summary>Calculation desk & equation checker</summary>
      <section class="sl-predictor" aria-labelledby="sl-predictor-title"><div class="sl-predictor-heading"><div><span class="sl-eyebrow">FROM YOUR EXPERIMENT</span><h2 id="sl-predictor-title">Predict & calculate reaction equations</h2><p>Selected sample: <strong>${esc(EQUIPMENT_BY_ID[state.selected].name)}</strong>. Use the reagents and amounts you added or transferred.</p></div>${button('predict-equations',equationsVisible ? 'Recalculate equations' : 'Calculate & show equations','',true)}</div>
      <p class="sl-small">Balanced equations and quantities from the lab model; these are predictions, not measured identification of a real sample. Results update as you work. Unsupported chemistry is identified explicitly.</p>
      <div id="sl-prediction">${equationsVisible ? equationResults() : '<p class="sl-prediction-empty">Add or mix reagents, then calculate to see the reactions for this vessel.</p>'}</div></section>
      <div class="sl-analysis-grid"><div>${select('sl-calculator','Calculation',Object.entries(CALCULATORS).map(([id,c])=>option(id,c.title,calculator)).join(''))}<p class="sl-formula-text">${esc(calc.formula)}</p><div class="sl-controls">${calc.labels.map((label,i)=>label !== 'Not used' ? field(`sl-calc-${i}`,label,'','step="any"') : `<input type="hidden" id="sl-calc-${i}" value="0">`).join('')}</div>${button('calculate','Calculate from my values')}<output id="sl-calculation">${esc(calculation)}</output></div><div><h3>Check atoms and charge</h3><label>Equation · ASCII formulas<input id="sl-equation" type="text" placeholder="Ag+ + Cl- -> AgCl" maxlength="500"></label>${button('equation','Check my equation')}<output id="sl-equation-result">${esc(equationResult)}</output><details><summary>Supported species notation</summary><p>${Object.keys(EQUATION_SPECIES).map(esc).join(', ')}</p><p>Use spaces around the + between terms. Coefficients are optional positive integers. This checker checks conservation; it does not prove that a reaction occurs.</p></details></div></div></details>`;
  }
  function equationResults(compact = false) {
    const report = predictEquations(state.vessels[state.selected]);
    if (report.warning) return `<p class="sl-warning">${esc(report.warning)}</p>`;
    const amount = n => n < 0.00001 ? (n*1000).toExponential(3) : num(n*1000,5);
    return `<div class="sl-equation-report ${compact ? 'sl-equation-compact' : ''}"><p class="sl-equation-summary">${esc(report.summary)}</p>
      ${report.mixture ? mixtureResults(report.mixture,compact) : ''}
      ${report.reactions.length ? '<p class="sl-small">Reactions recorded here since the vessel was emptied. Amounts are cumulative over mixing steps, not the quantity currently in the vessel. Transferred history stays with its original vessel.</p>' : ''}
      <div class="sl-reaction-cards">${report.reactions.map(r=>`<article class="sl-reaction-card" data-reaction="${esc(r.id)}"><div class="sl-reaction-title"><h3>${esc(r.title)}</h3><span class="sl-balanced">${r.balanced ? 'Atoms & charge balanced' : 'Balance unavailable'}</span></div><span class="sl-small">Net ionic equation</span><p class="sl-generated-equation">${esc(r.equation)}</p>
        ${compact ? '' : r.molecular.length ? r.molecular.map(m=>`<div class="sl-molecular"><span class="sl-small">Molecular form · identified stock pairing</span><p class="sl-generated-equation">${esc(m.equation)}</p><p class="sl-small">Spectator ions: ${esc(m.spectators)}. This form applies to the steps with those identified stocks.</p></div>`).join('') : '<p class="sl-small">Net ionic form shown: a unique molecular stock pairing is not known for this mixture.</p>'}
        <p class="sl-reaction-amount"><strong>${amount(r.moles)} mmol</strong> · ${esc(r.quantity)} · ${num(r.steps,0)} ${r.steps===1?'step':'steps'}</p>${compact ? '' : `<p class="sl-small">${esc(r.detail)}</p>`}</article>`).join('')}</div>
      ${report.equilibria.length ? `<details class="sl-equilibrium-details" ${report.mixture&&!compact?'open':''}><summary>Current equilibria · ${report.equilibria.length}</summary><p class="sl-small">Equilibria present in the current liquid, rather than additional completed reaction events. Constants are fixed at 25 °C. A solid in an equilibrium equation may be a potential phase; its presence is stated below.</p>${report.equilibria.map(e=>`<div class="sl-equilibrium"><h3>${esc(e.title)}</h3><p class="sl-generated-equation">${esc(e.equation)}</p><p class="sl-small">${esc(e.calculation)}</p></div>`).join('')}</details>` : ''}
      ${report.notices.map(n=>`<p class="sl-small">${esc(n)}</p>`).join('')}
      ${!compact && (report.reactions.length || report.equilibria.length) ? `<div class="sl-row">${button('save-equations','Add equations to notebook')}<span class="sl-small">Appends to your Equations notes.</span></div>` : ''}
      ${compact ? '' : '<p class="sl-small sl-equation-key">(aq) aqueous · (s) solid · (l) liquid · (g) gas · ⇌ equilibrium. <a href="https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions" target="_blank" rel="noreferrer">Equation conventions ↗</a></p>'}</div>`;
  }
  function mixtureResults(m,compact) {
    const value=n=>n===0?'0':n<0.0001?n.toExponential(2):Number(n.toPrecision(3)).toLocaleString('en-US',{maximumSignificantDigits:3});
    return `<section class="sl-mixture"><p class="sl-model-limit"><strong>${esc(m.quality)}</strong><br>${esc(m.limit)}</p>
      <div class="sl-mixture-metrics"><span>Final volume<strong>${num(m.volume,2)} mL</strong></span><span>Calculated pH<strong>≈ ${m.pH.toFixed(2)}</strong></span><span>Ionic strength<strong>≈ ${value(m.ionicStrength)} mol/L</strong></span><span>Cu(OH)₂ solid<strong>${m.solidMoles>1e-12?`≈ ${value(m.solidMass)} g`:'Not predicted'}</strong></span></div>
      <div class="sl-mixture-explanation">${m.descriptions.slice(0,compact?1:undefined).map(p=>`<p>${esc(p)}</p>`).join('')}</div>
      ${compact?'':`<div class="sl-mixture-tables"><div class="sl-table-wrap"><table class="sl-table"><caption>Analytical totals · n / final volume</caption><thead><tr><th scope="col">Component</th><th scope="col">Amount (mmol)</th><th scope="col">Total (mol/L)</th></tr></thead><tbody>${m.totals.map(t=>`<tr><th scope="row">${esc(t.label)}</th><td>${value(t.moles*1000)}</td><td>${value(t.concentration)}</td></tr>`).join('')}</tbody></table></div>
      <div class="sl-table-wrap"><table class="sl-table"><caption>Dissolved species · calculated estimates</caption><thead><tr><th scope="col">Species</th><th scope="col">Free / complex (mol/L)</th><th scope="col">% of total Cu</th></tr></thead><tbody>${m.species.filter(s=>s.concentration>1e-8).map(s=>`<tr><th scope="row">${esc(s.label)}</th><td>≈ ${value(s.concentration)}</td><td>${s.copperAtoms?value(s.copperFraction*100)+'%':'—'}</td></tr>`).join('')}</tbody></table></div></div>
      <p class="sl-small">Species below 10⁻⁸ mol/L are omitted from this table but remain in the calculation. Cu²⁺ denotes hydrated copper; CuSO₄(aq) is a dissolved neutral complex, not solid copper sulfate. Copper percentages count atoms (two per dimer); the remaining copper, if any, is solid.</p>
      <details class="sl-mixture-method"><summary>How the coupled calculation works</summary><ol><li>Convert each conserved amount to an analytical concentration: C<sub>T</sub> = n / V. V = ${num(m.volume/1000,6)} L. For ${esc(m.totals[0]?.label||'the sample')}: ${value(m.totals[0]?.moles||0)} mol / ${value(m.volume/1000)} L = ${value(m.totals[0]?.concentration||0)} mol/L.</li><li>At a trial [H⁺], solve copper and ligand balances together. For example, C<sub>T,Cl</sub> = [Cl⁻] + [CuCl⁺] + 2[CuCl₂] + 3[CuCl₃⁻] + 4[CuCl₄²⁻]. Bound ligands are not counted as free ions.</li><li>Adjust [H⁺] until dissolved positive and negative charges balance. pH ≈ −log₁₀[H⁺], [OH⁻] = Kw/[H⁺], and I = ½Σcᵢzᵢ².</li><li>Test Q = [Cu²⁺][OH⁻]² against Ksp. If solid forms, solve its amount with Q = Ksp. Current Q ≈ ${value(m.ionProduct)}; Ksp = ${value(m.ksp)}.</li></ol><p class="sl-small">Largest element/charge residual: ${m.residual.toExponential(1)} mol/L. Numerical convergence does not establish accuracy of the ideal-concentration approximation. <a href="https://github.com/usgs-coupled/phreeqc3/blob/master/database/minteq.v4.dat" target="_blank" rel="noreferrer">Constants: USGS MINTEQ database ↗</a></p></details>`}</section>`;
  }
  function catalog() {
    return `<div class="sl-heading"><div><div class="sl-eyebrow">NINE CONNECTED INVESTIGATIONS</div><h1>One bench. More ways to ask.</h1><p>Choose a guide for a new run. The shared shelf and all equipment are also available directly from the Workbench.</p>${button('restart-free','Restart without experiment')}</div></div><div class="sl-study-grid">${allStudies().map(e=>`<article class="sl-study"><span class="sl-study-code">${esc(e.code || 'CUSTOM')} / ${esc(e.topic || 'Professor study')}</span><h2>${esc(e.title)}</h2><p>${esc(e.objective)}</p><p class="sl-question">${esc(e.question)}</p>${button('study','Prepare a new run',`data-study="${esc(e.id)}"`)}</article>`).join('')}</div>`;
  }
  function notebook() {
    return `<div class="sl-heading"><div><div class="sl-eyebrow">YOUR EVIDENCE & REASONING</div><h1>A record you can return to.</h1><p>Saved snapshots are independent of your working draft.</p></div><div class="sl-row">${button('export','Export notebook · JSON')}</div></div><div class="sl-study-grid">${state.notes.map((n,i)=>`<article class="sl-study"><span class="sl-study-code">${esc(n.mode)} · ${n.ideal?'IDEAL':'REALISTIC'} · VIRTUAL LAB</span><h2>${esc(n.title)}</h2><time>${esc(new Date(n.date).toLocaleString())}</time><p>${n.electro?.records.length??n.measurements.length} readings · ${n.log.length} operations</p>${snapshotSafety(n)}${n.organicReport?button('note-organic','Download organic report',`data-index="${i}"`):''}${n.electroReport?button('note-electro','Download electrochemistry report',`data-index="${i}"`):''}${Object.entries(n.draft).filter(([,t])=>t).map(([id,t])=>`<h3>${esc(id)}</h3><p class="sl-preserve">${esc(t)}</p>`).join('')}<details><summary>Measurements and procedure</summary>${n.electro?`<p>${n.electro.records.length} electrochemistry readings are saved in this snapshot. Use Export readings for the recorded data, or Download electrochemistry report for equations and interpretation.</p>`:measurementTable(n.measurements)}<ol>${n.log.map(r=>`<li>${num(r.time)} s · ${esc(r.text)}</li>`).join('')}</ol></details>${button('note-csv','Export readings',`data-index="${i}"`)}</article>`).join('') || '<p class="sl-empty">Save a snapshot from the workbench to keep your first investigation.</p>'}</div>`;
  }
  function professor() {
    const template = { id:'custom-my-question',title:'My investigation',objective:'What students will investigate',question:'What changes when…?',steps:['Prepare two samples.','Measure and compare.'],analysis:'Instructor discussion after the experiment.' };
    return `<details class="sl-panel sl-professor"><summary>Professor tools · data-driven studies & model answer</summary><p>Define an investigation using existing engine operations. This adds guidance, not new reaction rules.</p><label>Experiment definition · JSON<textarea id="sl-custom-json" rows="10">${esc(JSON.stringify(template,null,2))}</textarea></label>${button('custom','Add or update study')}<div class="sl-row">${button('reveal','Reveal current unknown concentration')}</div>${state.revealed ? `<p id="sl-answer">Unknown U: ${state.unknown.toFixed(3)} mol/L</p>` : ''}<p class="sl-small">Professor mode and assessment mode are local learning tools, without accounts or access controls.</p></details>`;
  }
  function askNew(id) {
    stopElectroTimer();
    pendingStudy = id;
    const dialog = document.querySelector('#modal');
    dialog.innerHTML = `<h2 id="dialog-title">${id === null ? 'Restart without an experiment?' : 'Prepare a fresh bench?'}</h2><p>This resets the aqueous vessels, organic reactor, electrochemistry cell, readings and working draft. Saved snapshots and the ventilation setting are kept. To keep your samples, cancel and switch equipment on the Workbench.</p>${id === null ? '<p>You will return to free exploration with no experiment selected. The shared shelf and all equipment remain available.</p>' : `<p>Continue with <strong>${esc(allStudies().find(s=>s.id===id)?.title)}</strong>, or restart without an experiment.</p>`}<div class="sl-row">${button('cancel-new','Keep current run')}${id === null ? '' : button('confirm-free','Restart without experiment')}${button('confirm-new',id === null ? 'Restart without experiment' : 'Prepare fresh bench','',true)}</div>`;
    dialog.showModal();
  }
  function newRun(id) {
    guidePreview=null;
    stopElectroTimer();electroPanel='cell';electroTerminal=null;electroSupplyDraft=null;electroPredictionDraft=null;
    const fresh = restartLab(state,id);remember();state=fresh;
    page='bench';display='macro';equationsVisible=false;calculation=equationResult='';
    shelfQuery='';shelfGroup='all';shelfScope='all';reagent='hcl';concentration=.1;dose=10;tool='pipette';
    from='beaker';to='flask';transferMl=10;transferTool='pipette';seconds=60;graphVessel='flask';
    materialMass=1;materialVolume=1;transferMass=1;
    selectedCatalog=state.study==='soi18'?'organic:fame':study().preset==='water'?'electro:electro-sulfate':study().preset?'aqueous:copper':'aqueous:hcl';materialForm=defaultForm(selectedCatalog.split(':')[1]);save();draw();
    document.querySelector('#main')?.focus({preventScroll:true});window.scrollTo({top:0});
    if(state.study===null)notify('Fresh lab ready. No experiment selected; saved notebook entries are kept.');
  }
  document.addEventListener('pointerdown',event=>{if(event.target.id==='el-voltage-range')electroDragging=true;});
  document.addEventListener('pointerup',()=>{electroDragging=false;});
  document.addEventListener('pointercancel',()=>{electroDragging=false;});
  function captureSupplyDraft(el) {
    if(!el.closest('#el-supply-form'))return;
    if(el.id==='el-voltage-range')document.getElementById('el-supply-voltage').value=el.value;
    if(el.name==='voltage')document.getElementById('el-voltage-range').value=el.value;
    electroSupplyDraft=Object.fromEntries([...document.querySelector('#el-supply-form').elements].filter(x=>x.name).map(x=>[x.name,x.value]));
    const status=document.getElementById('el-supply-status');if(status)status.textContent='Unapplied changes';
  }
  function prepareElectroPredictions(uncertain,context){
    const values={...state.electro.predictions,...electroPredictionDraft};
    if(uncertain)for(const [id] of PREDICTIONS)if(!String(values[id]||'').trim())values[id]='Uncertain — compare with the measured result.';
    const missing=PREDICTIONS.find(([id])=>!String(values[id]||'').trim());
    if(missing){
      const feedback=document.getElementById('el-start-feedback');feedback.hidden=false;feedback.textContent='Predictions are needed before the first run. Write them above, or choose “Mark unanswered uncertain & start”.';
      document.getElementById('el-start-uncertain')?.focus();
      document.getElementById('announcer').textContent='Before starting, enter your predictions or choose Mark unanswered uncertain and start.';
      return null;
    }
    return PREDICTIONS.some(([id])=>values[id].trim()!==state.electro.predictions[id])?operateElectro(state.electro,'predictions',values,context).state:state.electro;
  }
  document.addEventListener('input', event => {
    if(event.target.closest('#el-supply-form')){captureSupplyDraft(event.target);return;}
    if(event.target.closest('#el-prediction-form')){
      electroPredictionDraft={...state.electro.predictions,...electroPredictionDraft,[event.target.name]:event.target.value};
      const count=PREDICTIONS.filter(([id])=>String(electroPredictionDraft[id]||'').trim()).length;
      document.getElementById('el-prediction-count').textContent=`${count} of 7 predictions prepared`;
      document.getElementById('el-start-uncertain').hidden=count===7;return;
    }
    const el = event.target;
    if(el.id==='sl-shelf-search'){shelfQuery=el.value;draw();return;}
    if (el.dataset.draft) { state.draft[el.dataset.draft] = el.value.slice(0,10000); save(); const status = document.querySelector('#sl-save-status'); if (status) status.textContent = storageOK ? 'Saved on this device' : 'Storage unavailable — export your notebook'; }
    const n = Number(el.value);
    if (el.id === 'sl-dose') dose = n;
    if(el.id==='sl-material-mass')materialMass=n;
    if(el.id==='sl-material-volume')materialVolume=n;
    if(el.id==='sl-transfer-mass')transferMass=n;
    if (el.id === 'sl-transfer-ml') transferMl = n;
    if (el.id === 'sl-seconds') seconds = n;
  });
  document.addEventListener('change', event => {
    if(activeTransfer)return;
    const el = event.target;
    if(el.id==='el-speed'){electroSpeed=Number(el.value);return;}
    if(el.closest('#el-supply-form')){captureSupplyDraft(el);return;}
    const changes = {
      'sl-shelf-group':()=>{shelfGroup=el.value;},
      'sl-shelf-scope':()=>{shelfScope=el.value;},
      'sl-material-form':()=>{materialForm=el.value;}, 'sl-material-vessel':()=>{state.selected=el.value;},
      'sl-equipment':()=>{stopElectroTimer();const item=LAB_TOOLS.find(t=>t.id===el.value);if(item){state=openStation(state,item.station);if(item.vessel)state.selected=item.vessel;if(item.panel)electroPanel=item.panel;}},
      'sl-mode':()=>{state.mode=el.value;state.revealed=false;display='macro';}, 'sl-ideal':()=>{state.ideal=el.checked;},
      'sl-concentration':()=>{concentration=Number(el.value);}, 'sl-tool':()=>{tool=el.value;}, 'sl-from':()=>{from=el.value;}, 'sl-to':()=>{to=el.value;},
      'sl-transfer-tool':()=>{transferTool=el.value;}, 'sl-graph':()=>{graph=el.value;}, 'sl-graph-vessel':()=>{graphVessel=el.value;}, 'sl-calculator':()=>{calculator=el.value;calculation='';},
    };
    if(changes[el.id]){const target=el.id==='sl-equipment'?LAB_TOOLS.find(t=>t.id===el.value):null;changes[el.id]();save();draw();if(target?.anchor)document.getElementById(target.anchor)?.scrollIntoView({block:'center'});}
  });
  document.addEventListener('click', event => {
    const electroControl=event.target.closest('[data-electro]');
    if(electroControl&&!electroControl.disabled&&!activeTransfer&&stationOf(state)==='electro'){
      try{
          const action=electroControl.dataset.electro,context={ideal:state.ideal,ventilationOn:state.ventilationOn===true};
          if(action==='terminal'){
            if(state.electro.power)throw Error('Stop the output before changing wires.');
            const terminal=electroControl.dataset.terminal;
            if(!electroTerminal||electroTerminal===terminal){electroTerminal=electroTerminal===terminal?null:terminal;draw();return;}
            const result=operateElectro(state.electro,'wire',{from:electroTerminal,to:terminal},context);remember();state.electro=result.state;electroTerminal=null;save();draw();notify('Wire connected.');return;
          }
          if(action==='cancel-wire'){electroTerminal=null;draw();return;}
          if(action==='supply'){const result=operateElectro(state.electro,'supply',electroFormArgs(electroControl),context);remember();state.electro=result.state;electroSupplyDraft=null;save();draw();notify(result.message);return;}
        if(action==='export-csv'){download('electrochemistry-measurements.csv',electroCSV(state.electro),'text/csv;charset=utf-8');return;}
        if(action==='export-report'){download('electrochemistry-report.md',electroReport(state.electro,context.ventilationOn),'text/markdown;charset=utf-8');return;}
        if(action==='export-html'){download('electrochemistry-report.html',electroPrintable(state.electro),'text/html;charset=utf-8');return;}
        if(action==='export-json'){download('electrochemistry-run.json',JSON.stringify({application:APP_NAME,source:'Electrochemistry teaching model; synthetic readings',ventilationOn:state.ventilationOn,run:state.electro},null,2),'application/json');return;}
        if(action==='snapshot'){
          if(state.notes.length>=100)throw Error('Export your notebook before adding another snapshot.');
          stopElectroTimer();state.notes.push({title:study().preset?study().title:'Electrochemistry investigation',date:new Date().toISOString(),study:state.study,mode:state.mode,ideal:state.ideal,
            draft:{objective:study().preset?study().objective:'Explore electrode reactions, charge and material balances.',conclusion:'See the attached report and predictions. Instrument results are synthetic.'},log:state.electro.operations.map(r=>({time:r.time,text:r.message})),measurements:[],electro:structuredClone(state.electro),electroReport:electroReport(state.electro,context.ventilationOn),safety:benchSafety(state)});save();draw();notify('Electrochemistry run saved in the shared lab notebook.');return;
        }
        if(action==='new-cell'){
          stopElectroTimer();const dialog=document.querySelector('#modal');dialog.innerHTML=`<h2 id="dialog-title">Start a new cell trial?</h2><p>This clears only the electrochemistry cell, measurements and predictions. Bench vessels, the organic reactor and saved notebook entries are kept.</p><div class="sl-row">${button('cancel-new','Keep cell')}${button('confirm-electro-cell','Prepare empty cell','',true)}</div>`;dialog.showModal();return;
        }
          if(action==='run'||action==='run-uncertain'){
            if(electroTimer!==null)return;
            const predicted=prepareElectroPredictions(action==='run-uncertain',context);if(!predicted)return;
            const configured=operateElectro(predicted,'supply',electroFormArgs(electroControl),context).state;
            const result=operateElectro(configured,'power',{enabled:true},context);remember();state.electro=result.state;electroSupplyDraft=null;electroPredictionDraft=null;electroTerminal=null;document.getElementById('el-prediction-details').open=false;
          electroTimer=setInterval(()=>{try{const next=operateElectro(state.electro,'advance',{seconds:electroSpeed},{ideal:state.ideal,ventilationOn:state.ventilationOn===true});state.electro=next.state;if(!state.electro.power)stopElectroTimer();save();if(!electroDragging||!state.electro.power)draw();}catch(error){stopElectroTimer();draw();notify(error.message);}},250);save();draw();return;
        }
        if(action==='pause'){stopElectroTimer();state.electro=operateElectro(state.electro,'power',{enabled:false},context).state;save();draw();return;}
        if(electroTimer!==null)throw Error('Pause the accelerated timer before changing the cell or taking a manual step.');
        if(action==='advanced'){const result=advancedElectro(state.electro,electroFormArgs(electroControl));remember();state.electro.advanced=result;save();draw();notify('Independent model study recorded; the workbench cell was not consumed.');return;}
        if(action==='import-vessel'){const args=electroFormArgs(electroControl),result=importVessel(state.electro,state.vessels[args.vessel],args.ml);remember();state.electro=result.state;state.vessels[args.vessel]=result.vessel;save();draw();notify(result.message);return;}
        const args=action==='power'?{enabled:!state.electro.power}:action==='remove-wire'?{index:Number(electroControl.dataset.index)}:electroFormArgs(electroControl);
        if(action==='uncertain')for(const [id] of PREDICTIONS)if(!String(args[id]||'').trim())args[id]='Uncertain — compare with the measured result.';
          const prepared=action==='power'&&args.enabled?prepareElectroPredictions(false,context):state.electro;if(!prepared)return;
          const result=operateElectro(prepared,action==='uncertain'?'predictions':action,args,context);remember();state.electro=result.state;if(['predictions','uncertain','power'].includes(action))electroPredictionDraft=null;if(['wire','standard-wires','remove-wire','power'].includes(action))electroTerminal=null;save();draw();notify(result.message);return;
      }catch(error){if(['run','run-uncertain','power'].includes(electroControl.dataset.electro)){const feedback=document.getElementById('el-start-feedback');if(feedback){feedback.hidden=false;feedback.textContent=error.message;}}notify(error.message);return;}
    }
    const organicControl=event.target.closest('[data-organic]');
    if(organicControl && !organicControl.disabled && !activeTransfer && stationOf(state)!=='aqueous'){
      try {
        const action=organicControl.dataset.organic;
        if(action==='export-report'){download('soi-18-laboratory-report.md',organicReport(state.organic),'text/markdown;charset=utf-8');return;}
        if(action==='export-html'){download('soi-18-laboratory-report.html',organicPrintable(state.organic),'text/html;charset=utf-8');return;}
        if(action==='export-json'){download('soi-18-run.json',JSON.stringify({application:APP_NAME,source:'Unvalidated organic teaching scenario; not experimental evidence',ventilationOn:state.ventilationOn===true,run:state.organic},null,2),'application/json');return;}
        if(action==='snapshot'){
          if(state.notes.length>=100)throw Error('Export your notebook before adding another snapshot.');
          state.notes.push({title:state.study==='soi18'?study().title:'Organic investigation',date:new Date().toISOString(),study:state.study,mode:'research',ideal:false,draft:{objective:state.study==='soi18'?study().objective:'Explore the supported sucrose acyl-exchange scenario and its assumptions.',conclusion:'See the attached organic report. Results are synthetic.'},log:state.organic.operations.map(r=>({time:r.time*60,text:r.text})),measurements:[],organicReport:organicReport(state.organic),organic:structuredClone(state.organic),ventilationOn:state.ventilationOn===true});save();draw();notify('Organic run and full report saved to the notebook.');return;
        }
        const args=action==='standard-apparatus'?{dry:true,stir:true,nitrogen:true,vacuum:true,trap:true,calibrated:true}:organicFormArgs(organicControl);
        const result=operateOrganic(state.organic,action==='standard-apparatus'?'apparatus':action,args,{ventilationOn:state.ventilationOn===true});
        remember();state.organic=result.state;guidePreview=null;save();draw();notify(result.message);return;
      }catch(error){notify(error.message);return;}
    }
    const el = event.target.closest('[data-lab]'); if(!el || el.disabled) return;
    const action = el.dataset.lab;
    try {
      if(action==='finish-transfer'){finishTransfer();notify('Transfer complete.');document.querySelector('[data-lab="transfer"]')?.focus({preventScroll:true});return;}
      if(action==='page'){stopElectroTimer();finishTransfer(false);page=el.dataset.page;draw();window.scrollTo({top:0});return;}
      if(activeTransfer)return;
      if(action==='guide-review'||action==='guide-current'){
        guidePreview=action==='guide-current'?null:el.dataset.step;draw();
        document.querySelector('#og-guide-title')?.focus({preventScroll:true});return;
      }
      if(action==='guide-open'||action==='guide-settings'){
        if(state.study!=='soi18'||!state.organic)return;
        const step=organicGuide(state.organic,state).steps.find(s=>s.id===el.dataset.step);if(!step)return;
        state=openStation(state,step.station);save();draw();
        const target=document.querySelector(step.target),form=target?.closest('form');
        if(action==='guide-settings'&&step.settings&&form){
          for(const [name,value] of Object.entries(step.settings)){const input=form.elements.namedItem(name);if(input)input.value=value;}
          const abrupt=form.elements.namedItem('abrupt');if(abrupt)abrupt.checked=false;
          notify('Suggested simulator settings loaded. Review them and press the instrument action to run the step.');
        }
        target?.scrollIntoView({block:'center',behavior:'instant'});target?.focus({preventScroll:true});return;
      }
      if(action==='shelf-clear'){shelfQuery='';shelfGroup='all';shelfScope='all';draw();document.getElementById('sl-shelf-search')?.focus();return;}
      if(action==='organic-tab'||action==='aqueous-station'){stopElectroTimer();state=openStation(state,action==='aqueous-station'?'aqueous':el.dataset.tab);save();draw();return;}
      if(action==='electro-panel'){electroPanel=el.dataset.panel;draw();return;}
      if(action==='confirm-electro-cell'){document.querySelector('#modal').close();remember();state.electro=createElectro(state.seed);electroPanel='cell';electroTerminal=null;electroSupplyDraft=null;electroPredictionDraft=null;save();draw();notify('Empty cell ready. Other workbench samples are unchanged.');return;}
      if(action==='note-electro'){const note=state.notes[Number(el.dataset.index)];download('electrochemistry-notebook-report.md',note.electroReport,'text/markdown;charset=utf-8');return;}
      if(action==='organic-reagent'||action==='material-reagent'){const material=LAB_MATERIALS.find(r=>r.scope!=='aqueous'&&r.id===el.dataset.reagent);if(!material)return;selectedCatalog=material.catalogId;materialForm=defaultForm(material.id);save();draw();return;}
      if(action==='note-organic'){const note=state.notes[Number(el.dataset.index)];download('soi-18-notebook-report.md',note.organicReport,'text/markdown;charset=utf-8');return;}
      if(action==='reagent'){if(!REAGENT[el.dataset.reagent])return;reagent=el.dataset.reagent;selectedCatalog='aqueous:'+reagent;if(stationOf(state)!=='electro')state=openStation(state,'aqueous');if(REAGENT[reagent].group==='Indicators')dose=0.1;save();draw();return;}
      if(action==='vessel'){state.selected=el.dataset.vessel;save();draw();return;}
      if(action==='display'){display=el.dataset.display;draw();return;}
      if(action==='new-run'||action==='study'){askNew(el.dataset.study||state.study);return;}
      if(action==='restart-free'){askNew(null);return;}
      if(action==='cancel-new'){document.querySelector('#modal').close();return;}
      if(action==='confirm-new'){document.querySelector('#modal').close();newRun(pendingStudy);return;}
      if(action==='confirm-free'){document.querySelector('#modal').close();newRun(null);return;}
      if(action==='undo'){stopElectroTimer();electroTerminal=null;electroSupplyDraft=null;electroPredictionDraft=null;const old=undo.pop();if(old){const notes=state.notes;state=old;state.notes=notes;guidePreview=null;if(LAB_MATERIALS.some(r=>r.catalogId===state.shelfSelection)){selectedCatalog=state.shelfSelection;if(selectedCatalog.startsWith('aqueous:'))reagent=selectedCatalog.split(':')[1];materialForm=defaultForm(selectedCatalog.split(':')[1]);}save();draw();notify('Restored the previous operation. Saved snapshots are unchanged.');}return;}
      if(action==='snapshot'){
        if(state.notes.length>=100)throw Error('Export your notebook before starting another collection; this collection holds 100 snapshots.');
        state.notes.push({title:study().title,date:new Date().toISOString(),study:state.study,mode:state.mode,ideal:state.ideal,safety:benchSafety(state),draft:structuredClone(state.draft),measurements:structuredClone(state.measurements),log:structuredClone(state.log),endpoints:structuredClone(state.endpoints),vessels:structuredClone(state.vessels)});save();draw();notify('Notebook snapshot saved. Your conclusion is preserved as you wrote it.');return;
      }
      if(action==='csv'||action==='note-csv'){const note=action==='note-csv'?state.notes[Number(el.dataset.index)]:null;download('titravelle-measurements.csv',note?.electro?electroCSV(note.electro):measurementsCSV(note?note.measurements:state.measurements),'text/csv;charset=utf-8');return;}
      if(action==='export'){download('titravelle-laboratory-notebook.json',JSON.stringify({application:APP_NAME,version:2,source:'Virtual laboratory model; not physical measurements',notes:state.notes,draft:state.draft,measurements:state.measurements,procedure:state.log,vessels:state.vessels,safety:benchSafety(state),organic:state.organic,electro:state.electro},null,2),'application/json');return;}
      if(action==='calculate'){const values=[0,1,2].map(i=>{const x=document.getElementById(`sl-calc-${i}`);if(x.value.trim()==='')throw Error('Enter all calculation values.');return Number(x.value);});calculation=`${calculate(calculator,values).toPrecision(6)} ${CALCULATORS[calculator].unit}`;document.querySelector('#sl-calculation').textContent=calculation;return;}
      if(action==='predict-equations'){equationsVisible=true;draw();notify(`Equations calculated for ${EQUIPMENT_BY_ID[state.selected].name}.`);return;}
      if(action==='save-equations'){
        const report=predictEquations(state.vessels[state.selected]);
        if(report.warning || (!report.reactions.length && !report.equilibria.length))throw Error('There are no supported equations to save for this vessel.');
        const text=equationsAsText(report,EQUIPMENT_BY_ID[state.selected].name), old=state.draft.equations;
        if(old.includes(text)){notify('These equations are already in your notebook.');return;}
        const next=old?`${old}\n\n${text}`:text;
        if(next.length>10000)throw Error('The Equations notes are full. Save a snapshot and make space before adding more.');
        remember();state.draft.equations=next;save();draw();notify('Calculated equations appended to your notebook.');return;
      }
      if(action==='equation'){const input=document.querySelector('#sl-equation').value.split(/->|→/);if(input.length!==2)throw Error('Separate reactants and products with ->.');const result=checkEquation(...input);equationResult=result.balanced?'Atoms and charge are balanced.':`Not balanced: ${result.differences.join(', ')}.`;document.querySelector('#sl-equation-result').textContent=equationResult;return;}
      if(action==='custom'){const value=JSON.parse(document.querySelector('#sl-custom-json').value);if(!validStudy(value))throw Error('Use the displayed experiment schema with a unique custom- id and 1–20 instruction steps.');const index=state.customStudies.findIndex(e=>e.id===value.id);if(index<0){if(state.customStudies.length>=30)throw Error('Maximum 30 custom studies.');state.customStudies.push(value);}else state.customStudies[index]=value;save();notify('Study saved in the experiment collection.');return;}
      if(action==='reveal'){state.revealed=true;save();draw();return;}
      let args={vessel:state.selected};let operation=action;
      if(action==='ventilation')args.enabled=state.ventilationOn !== true;
      if(action==='add')args={...args,reagent,ml:dose,concentration,tool,temperature:25};
      if(action==='add-material')args={...args,material:selectedStock().id,mass:materialMass,volume:materialVolume,form:materialForm};
      if(action==='nitrogen')args.enabled=state.vessels[state.selected].nitrogenOn!==true;
      if(action==='transfer-mass')args={from,to,mass:transferMass};
      if(action==='transfer'||action==='pour')args={from,to,ml:transferMl,tool:transferTool};
      if(action==='measure')args.kind=el.dataset.kind;
      if(action==='rinse')args.reagent=reagent;
      if(action==='fill-burette')args={vessel:'burette',reagent,concentration};
      if(['filter','wash'].includes(action))args.to=to;
      if(['heat','cool','wait'].includes(action))args.seconds=seconds;
      const before=state,result=operate(state,operation,args);remember();state=result.state;
      const previousWarnings = new Set(benchSafety(before).notices.map(n=>n.title));
      const currentSafety = benchSafety(state), newWarnings = currentSafety.notices.filter(n=>!previousWarnings.has(n.title));
      if(newWarnings.length)result.message += ` Precautions: ${newWarnings.map(n=>n.title).join('; ')}. See Hazards & ventilation for details.`;
      if(action!=='ventilation' && currentSafety.needsHood && !currentSafety.ventilationOn)result.message += ' Local exhaust is OFF.';
      if(['transfer','pour','transfer-mass'].includes(action))state.selected=args.to;
      save();
      if(['transfer','pour','transfer-mass'].includes(action)){showTransfer(before,result,action==='transfer-mass'?{...args,ml:before.vessels[from].volume-state.vessels[from].volume,tool:'beaker'}:args,action==='transfer-mass'?'transfer':action);return;}
      draw();notify(result.message);
    } catch(error){notify(error instanceof SyntaxError?'The study definition is not valid JSON.':error.message);}
  });
  if (!state.draft.objective) state.draft.objective = study().objective;
  state=openStation(state,stationOf(state));
  save();
  document.addEventListener('submit',event=>{if(event.target.matches('.og-form,.el-form'))event.preventDefault();});
  window.addEventListener('pagehide',stopElectroTimer);
  draw();
  if(recovered)notify('The saved bench could not be read. A fresh bench is open.');
}
