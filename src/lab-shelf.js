export const escapeHTML = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function filterShelf(items,query='',group='all',scope='all') {
  const normalized=String(query).normalize('NFKD').toLowerCase().trim();
  return items.filter(r=>(scope==='all'||r.scope===scope)&&(group==='all'||r.group===group)&&`${r.name} ${r.formula} ${r.group} ${r.id}`.normalize('NFKD').toLowerCase().includes(normalized));
}
export function shelfView(items,{query='',group='all',scope='all',selected=''}={}) {
  const esc=escapeHTML, filtered=filterShelf(items,query,group,scope), active=items.find(r=>r.catalogId===selected);
  return `<div class="sl-section-head"><h2>Chemical shelf</h2><span>${items.length} stocks & references</span></div>
    <div class="sl-shelf-filters"><label>Find a substance<input type="search" id="sl-shelf-search" value="${esc(query)}" placeholder="Name or formula…" autocomplete="off"></label>
    <label>Collection<select id="sl-shelf-scope">${[['all','All materials'],['aqueous','Aqueous stocks'],['organic','Organic materials & references'],['dry','Common dry materials'],['electro','Electrochemistry materials'],['mineral','Mineral analysis & standards']].map(([id,label])=>`<option value="${id}" ${id===scope?'selected':''}>${label}</option>`).join('')}</select></label>
    <label>Category<select id="sl-shelf-group">${['all',...new Set(items.map(r=>r.group))].map(g=>`<option value="${esc(g)}" ${g===group?'selected':''}>${g==='all'?'All categories':esc(g)}</option>`).join('')}</select></label>
    <div class="sl-shelf-count"><span role="status">${filtered.length} of ${items.length} shown</span><button type="button" data-lab="shelf-clear">Clear filters</button></div></div>
    <div class="sl-reagents sl-shelf-scroll" tabindex="0" aria-label="All laboratory materials">${filtered.map(r=>`<button type="button" data-lab="${r.scope==='aqueous'?'reagent':r.scope==='organic'?'organic-reagent':'material-reagent'}" data-reagent="${esc(r.id)}" class="sl-reagent ${selected===r.catalogId?'selected':''}" aria-pressed="${selected===r.catalogId}"><span class="sl-formula">${esc(r.formula)}</span><span>${esc(r.name)}<small>${esc(r.group)} · ${r.scope==='organic'?'Organic':r.scope==='dry'?'Dry material':r.scope==='electro'?'Electrochemistry':r.scope==='mineral'?'Mineral analysis':'Aqueous'}</small></span></button>`).join('')||'<p class="sl-shelf-empty">No matches. Try a shorter name or clear the filters.</p>'}</div>
    ${active?`<div class="sl-shelf-selected"><strong>Selected: ${esc(active.name)}</strong>${!filtered.includes(active)?'<p>Selection retained outside this filter.</p>':''}<p>${esc(active.use)}</p>${active.hint?`<p>${esc(active.hint)}</p>`:''}</div>`:''}`;
}
