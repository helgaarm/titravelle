import { organicEndpoint, finalDecision } from './organic-analysis.js';
import { organicMetrics } from './organic-engine.js';
import { escapeHTML as esc } from './lab-shelf.js';

const f = (n, digits = 3) => Number(n).toFixed(digits);
const control = action => `[data-organic="${action}"]`;
const check = (label, passed) => ({ label, passed: Boolean(passed) });

// Read existing evidence only. Opening the guide never samples or advances a batch.
export function organicGuide(o, { ventilationOn = false, notes = [] } = {}) {
  const steps = [], metrics = organicMetrics(o), decision = finalDecision(o);
  const add = (id, title, station, target, instruction, why, checks, options = {}) => {
    const passed = checks.every(c => c.passed);
    steps.push({ id, title, station, target, instruction, why, checks,
      settled: passed, status: passed ? 'Recorded' : 'To do', ...options });
  };
  const gc = o.feedGC, currentGC = gc?.revision === o.lotRevision;
  const feedChecks = [check('Resolved feed GC: lower purity bound ≥99.5 mol-%', currentGC && gc.resolved && gc.purity - gc.uncertainty >= 99.5),
    ...['soa', 'fame'].map(id => {
      const kf = o.kf[id], limit = id === 'soa' ? .05 : .03;
      return check(`${id === 'soa' ? 'Sucrose' : 'Methyl ester'} lot: water upper bound <${limit} wt-%${kf ? ` (measured ${f(kf.water,4)} ± ${f(kf.uncertainty,4)})` : ''}`,
        kf?.revision === o.lotRevision && kf.water + kf.uncertainty < limit);
    })];
  const needsWater = feedChecks.slice(1).some(c => !c.passed);
  const waterMeasured = ['soa','fame'].every(id => o.kf[id]?.revision === o.lotRevision);
  add('feed', 'Dry and qualify both lots', 'prepare', control(needsWater ? (waterMeasured || !o.drying.length ? 'dry-lots' : 'kf-lots') : 'feed-gc'),
    'Review the starting lots and assumptions before charging. For the default lots, dry both for 60 simulated minutes, measure Karl Fischer water, then run resolved feed GC. If water fails, dry further; if GC fails, explore feed separation. Repeat both analyses after any lot change.',
    'Drying and separation change the actual charge mass. An unresolved GC trace cannot establish isomer purity.', feedChecks,
    { warning: o.charged.fame && feedChecks.some(c => !c.passed) ? 'Feed evidence changed after charging. Review the discrepancy; locked lots require a fresh run to change their composition.' : '' });
  const apparatus = Object.entries({ dry:'Dry vessel', stir:'Stirring', nitrogen:'Nitrogen', vacuum:'Vacuum connection', trap:'Cold trap', calibrated:'Pressure calibration' }).map(([id,label]) => check(label, o.apparatus[id]));
  add('setup', 'Connect apparatus and local exhaust', 'prepare', ventilationOn ? control('standard-apparatus') : '#sl-ventilation-toggle',
    'Connect the standard apparatus, check its six settings, and switch the simulated fume hood ON. Keep local exhaust on through reaction and solvent handling.',
    'Nitrogen, vapour capture and local exhaust serve different purposes. The switch represents a control setting, not a measured exposure.',
    [check('Fume hood ON', ventilationOn), ...apparatus]);
  add('condition', 'Charge and condition the methyl ester', 'reaction', control(o.charged.fame ? 'advance' : 'charge-fame'),
    'Use “Charge qualified methyl ester” in the Reactor. Set 50 °C and 50 mbar, then advance 60 minutes for the default start. Continue only as needed until the conditioning counter reaches 30 minutes.',
    'Ramp time is included in elapsed time. Only stirred time at ≥45 °C and <200 mbar counts. Shelf additions to ordinary vessels do not charge this reactor.',
    [check('Methyl ester charged', o.charged.fame), check(`${f(o.conditionMinutes,1)} / 30 conditioning minutes`, o.conditionMinutes >= 30)],
    { settings: o.charged.fame ? { minutes:60, temperature:50, pressure:50 } : null });
  add('blend', 'Add sucrose octaacetate and blend', 'reaction', control(o.charged.soa ? 'advance' : 'charge-soa'),
    'Charge the qualified sucrose lot. Keep stirring at 50 °C and 50 mbar and advance 30 minutes; check that the blend counter reaches 30 before adding catalyst.',
    'The catalyst gate uses actual stirred blend time at ≥45 °C, not time spent on another screen.',
    [check('Sucrose lot charged', o.charged.soa), check(`${f(o.blendMinutes,1)} / 30 blending minutes`, o.blendMinutes >= 30)],
    { settings: o.charged.soa ? { minutes:30, temperature:50, pressure:50 } : null });
  add('catalyst', 'Add catalyst and take the initial sample', 'reaction', control(o.charged.catalyst ? 'sample' : 'catalyst'),
    'Review the sodium methoxide mass (0.136 g is the nominal default scenario charge), add it once, then take a 5 mg reaction sample before the high-temperature advance.',
    'Water and free acid consume active methoxide. The initial sample provides a comparison, and every aliquot removes tracked mass.',
    [check('Catalyst charged once', o.charged.catalyst)],
    { settled: o.charged.catalyst });
  const samples = o.samples.filter(s => !s.final), last = samples.at(-1), endpoint = organicEndpoint(o);
  const cooling = o.charged.catalyst && o.targetTemperature <= 40 && o.targetPressure >= 900;
  const leftReaction = o.neutralized || cooling;
  const currentSample = last?.revision === o.revision;
  const stopHeating = metrics.degradedWt >= .5;
  add('endpoint', 'Follow the reaction to an evidenced endpoint', 'reaction', control(!currentSample ? 'sample' : 'advance'),
    !last ? 'Take the initial 5 mg reaction sample. Then explore 110 °C and 1 mbar with gradual ramps, advancing 60 minutes at a time and taking a new sample after each advance.' :
      !currentSample && !leftReaction ? 'The batch changed after the last reaction sample. Take a fresh 5 mg sample before judging the endpoint.' :
      'Compare consecutive samples at least 30 minutes apart. For the default scenario, use hourly advances at 110 °C and 1 mbar and sample after each. Four hours is a review point, not an automatic endpoint; extend only while the evidence and degradation check support it.',
    'Low volatile evolution alone can mean an inactive catalyst. All endpoint checks and a current sample are needed to confirm completion.',
    [check('Latest reaction sample matches the current batch', currentSample), ...endpoint.checks.map(([label,passed]) => check(label,passed))],
    { settled: endpoint.confirmed || leftReaction, status: endpoint.confirmed ? 'Recorded' : leftReaction ? 'Review' : 'To do',
      warning: leftReaction ? 'Reaction stage closed. The checks show stored reaction evidence; they do not certify the cooled or isolated batch. Record any unconfirmed endpoint in the report.' : stopHeating ? 'Modeled degradation is at or above 0.5 wt-%. Do not keep heating just to reach a target: review the samples and use the cooling step to investigate a failed run.' : '',
      settings: currentSample && !endpoint.confirmed && !leftReaction && !stopHeating ? { minutes:60, temperature:110, pressure:1 } : null });
  const coolReady = o.temperature <= 40 && o.pressure >= 900;
  add('cool', 'Cool and return towards atmospheric pressure', 'reaction', control('advance'),
    'After reviewing the endpoint, set 30 °C and 1013 mbar and advance 60 minutes with gradual pressure changes. Check the actual readings before work-up. You may also stop an unsuccessful reaction here and document why.',
    'Neutralization requires ≤40 °C and ≥900 mbar. Cooling does not prove that the reaction succeeded.',
    [check(o.neutralized ? 'Temperature gate met when neutralized' : `Actual temperature ${f(o.temperature,1)} °C ≤40 °C`, o.temperature <= 40 || o.neutralized), check(o.neutralized ? 'Pressure gate met when neutralized' : `Actual pressure ${f(o.pressure,1)} mbar ≥900 mbar`, o.pressure >= 900 || o.neutralized)],
    { settled: o.neutralized || (o.charged.catalyst && leftReaction && coolReady), settings:{ minutes:60, temperature:30, pressure:1013 },
      status:o.neutralized || (o.charged.catalyst && leftReaction && coolReady) ? 'Recorded' : 'To do', note:o.neutralized ? 'The neutralization gate recorded acceptable conditions; current product-drying conditions may differ.' : '' });
  add('isolate', 'Neutralize and collect a product fraction', 'workup', control(o.neutralized ? 'separate' : 'neutralize'),
    'Neutralize the calculated remaining base equivalents, then run the modeled separation (10 g solvent is the default). Review the collected fraction, waste and recovery losses.',
    'The separation uses stated selectivity assumptions. A collected fraction is not yet a qualified pure product.',
    [check('Remaining base neutralized', o.neutralized), check('Separation recorded', o.purifications.length > 0)]);
  const masses = o.dryMasses, delta = masses.length > 1 ? Math.abs(masses.at(-1).mass - masses.at(-2).mass) : null;
  const qc = o.samples.filter(s => s.final && s.revision === o.revision).at(-1);
  add('dry', 'Dry, reweigh and test constant mass', 'workup', control('dry-product'),
    'Dry the isolated fraction for 90 simulated minutes, then repeat for 60 minutes. Compare the last two recorded masses; repeat controlled drying if their difference is ≥1 mg. Keep vacuum and the cold trap connected.',
    'Constant mass is one quality criterion. It does not identify the product or replace moisture and residual-solvent checks.',
    [check(`${masses.length} drying / weighing records`, masses.length >= 2), check(delta === null ? 'Two masses differ by <1 mg' : `Last mass difference ${f(delta*1000)} mg <1 mg`, delta !== null && delta < .001)],
    { settings:{ minutes:masses.length ? 60 : 90 }, ...(qc && (delta === null || delta >= .001) ? { settled:true, status:'Review', warning:'Final QC was taken without demonstrated constant mass. The run can be reported as unqualified; further drying will invalidate that QC.' } : {}) });
  add('qc', 'Run independent product quality checks', 'analysis', control('qc'),
    'Run final product QC after isolation and drying. Read every acceptance criterion: isomer purity, substitution, bound acetate, free ester, water, inorganic material, degradation and structural consistency.',
    'Purity, degree of substitution and yield answer different questions. A failed specification is a finding to report, not a reason to repeat measurements until one passes.',
    [check('Final QC matches the current batch', Boolean(qc))],
    { warning:qc && !decision.qualified ? `Current batch is unqualified: ${decision.criteria.filter(c=>!c[1]).map(c=>c[0]).join('; ')}. Continue to characterize this failed batch or review the report.` : o.samples.some(s=>s.final) && !qc ? 'Previous QC is stale because the batch changed. Run it again before interpreting materials or performance.' : '' });
  add('materials', 'Characterize the material and its limits', 'materials', control('materials'),
    'Run the materials panel. Compare thermal behavior, wetting, coating retention and morphology, then inspect the environmental screen and its unknown quantities.',
    'Synthetic material properties are controlled by explicit assumptions. A contact angle or fluorine-free composition does not establish friction performance or environmental safety.',
    [check('Materials panel matches the current batch', o.materials?.revision === o.revision)]);
  add('friction', 'Compare all six materials with matched controls', 'materials', control('friction'),
    'Keep test conditions matched and run the comparative friction panel. The default uses six independent coupons per material. Compare SOI-18 with both sucrose-ester controls, the conventional ester, wax and untreated surface across the temperature series.',
    'Use coupon-level uncertainty and the corrected comparison intervals. Repeated readings on one coupon are not independent replicates.',
    [check('Current six-material comparison recorded', o.friction?.revision === o.revision && o.friction.rows.length === 42)]);
  const saved = notes.some(n => n.organic?.revision === o.revision && n.organic?.seed === o.seed && JSON.stringify(n.organic) === JSON.stringify(o));
  add('report', 'Review the whole claim and save the evidence', 'report', control('snapshot'),
    'Read the A–D decision and failed criteria, check mass balance and deviations, and distinguish synthesis, batch quality and performance claims. Save a notebook snapshot and optionally export the complete report. State what the next experiment should test.',
    'A and B are valid unsuccessful outcomes. C does not establish exceptional performance; D is support only within this synthetic scenario.',
    [check('Current run preserved in a notebook snapshot', saved)],
    { note:`Decision: ${decision.code ?? 'Incomplete'} — ${decision.conclusion}` });
  const current = steps.find(s => !s.settled) ?? steps.at(-1);
  return { steps, current, recorded:steps.filter(s=>s.settled).length, complete:steps.every(s=>s.settled) };
}

export function organicGuideView(o, context, preview = null) {
  const guide = organicGuide(o, context), step = guide.steps.find(s=>s.id===preview) ?? guide.current;
  const index = guide.steps.indexOf(step), reviewing = step.id !== guide.current.id;
  const button = (action,label,extra='') => `<button type="button" class="sl-button" data-lab="${action}" data-step="${step.id}" ${extra}>${label}</button>`;
  return `<details class="sl-panel og-guide" open><summary>Guided sequence · SOI-18: test the whole claim</summary>
    <div class="og-guide-progress"><label for="og-guide-progress">${guide.recorded} of ${guide.steps.length} steps recorded${guide.complete ? ' · run saved' : ''}</label><progress id="og-guide-progress" value="${guide.recorded}" max="${guide.steps.length}"></progress></div>
    <p class="sl-small">Progress follows your batch and stored readings. These are simulator settings, not a validated physical procedure. Review flags remain part of the evidence.</p>
    <section class="og-guide-step" data-guide-step="${step.id}" data-guide-current="${guide.current.id}" aria-labelledby="og-guide-title">
      <div class="sl-eyebrow">${reviewing ? 'REVIEWING' : guide.complete ? 'RECORDED' : 'NEXT STEP'} · ${index+1} / ${guide.steps.length} · ${esc(step.status)}</div>
      <h2 id="og-guide-title" tabindex="-1">${esc(step.title)}</h2><p>${esc(step.instruction)}</p><p class="sl-small"><strong>Why this matters:</strong> ${esc(step.why)}</p>
      <ul class="og-guide-checks">${step.checks.map(c=>`<li class="${c.passed?'is-recorded':''}"><strong>${c.passed?'Recorded':'Needed'}</strong><span>${esc(c.label)}</span></li>`).join('')}</ul>
      ${step.warning?`<p class="sl-warning">${esc(step.warning)}</p>`:''}${step.note?`<p>${esc(step.note)}</p>`:''}
      <div class="sl-row">${button('guide-open','Open step controls')}${step.settings?button('guide-settings','Load suggested settings'):''}${reviewing?button('guide-current','Return to next step'):''}${step.id==='endpoint'?'<button type="button" class="sl-button" data-lab="guide-review" data-step="cool">Review cooling / stop reaction</button>':''}${step.id==='qc'&&step.warning?'<button type="button" class="sl-button" data-lab="guide-review" data-step="report">Review outcome now</button>':''}</div>
      <p class="sl-small">Opening controls or loading settings performs no chemistry. Review the values, then use the instrument’s action button.</p>
    </section><details class="og-guide-sequence"><summary>Browse all ${guide.steps.length} steps</summary><ol>${guide.steps.map((s,i)=>`<li><button type="button" data-lab="guide-review" data-step="${s.id}" ${s.id===step.id?'aria-current="step"':''}><span>${i+1}. ${esc(s.title)}</span><small>${esc(s.status)}${s.id===guide.current.id?' · Next':''}</small></button></li>`).join('')}</ol></details></details>`;
}
