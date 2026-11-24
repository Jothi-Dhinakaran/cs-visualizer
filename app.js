/* app.js — UI controller: topic list, input form, playback engine, pseudocode & state panels. */
(function () {
  'use strict';
  const { h } = window.CSViz;
  const GROUPS = ['DSA', 'Operating Systems', 'Computer Networks'];
  const SECTIONS = ['Sorting', 'Searching & Arrays', 'Linear Structures', 'Hashing', 'Trees', 'Graphs', 'Recursion & Backtracking', 'Dynamic Programming', 'Greedy', 'Strings'];
  const rank = (arr, x) => { const i = arr.indexOf(x); return i < 0 ? arr.length : i; };
  // stable sort: group order, then section order, then registration order
  const viz = window.CSViz.list().map((v, i) => [v, i]).sort((a, b) => rank(GROUPS, a[0].group) - rank(GROUPS, b[0].group) || rank(SECTIONS, a[0].section) - rank(SECTIONS, b[0].section) || a[1] - b[1]).map((x) => x[0]);
  const $ = (id) => document.getElementById(id);
  const S = { v: null, params: {}, steps: [], meta: null, idx: 0, pseudo: [], error: null, timer: null };

  /* ── topics ── */
  function buildTopics() {
    const nav = $('topics'); let group = null, section = null;
    nav.replaceChildren();
    viz.forEach((v) => {
      if (v.group !== group) { group = v.group; section = null; nav.appendChild(h('div', { class: 'group' }, group)); }
      if (v.section && v.section !== section) { section = v.section; nav.appendChild(h('div', { class: 'section' }, section)); }
      nav.appendChild(h('button', { type: 'button', 'data-id': v.id, 'data-text': (v.title + ' ' + v.group + ' ' + (v.section || '')).toLowerCase(), onclick: () => select(v.id) }, v.title));
    });
  }
  function filterTopics(q) {
    q = q.trim().toLowerCase();
    const kids = [...$('topics').children];
    kids.forEach((el, i) => {
      if (el.tagName === 'BUTTON') el.hidden = !!q && !el.dataset.text.includes(q);
      else { // show headers only if some following button (before the next group) matches
        let any = !q; for (let j = i + 1; j < kids.length && !kids[j].classList.contains('group') && (el.classList.contains('group') || !kids[j].classList.contains('section')); j++) if (kids[j].tagName === 'BUTTON' && !kids[j].hidden) any = true;
        el.hidden = !any;
      }
    });
  }

  function select(id) {
    pause();
    S.v = viz.find((x) => x.id === id);
    document.querySelectorAll('#topics button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    $('viz-title').textContent = S.v.title; $('viz-blurb').textContent = S.v.blurb;
    buildForm(); S.params = readParams(); rebuild(false);
  }

  /* ── input form ── */
  function buildForm() {
    const f = $('input-form'); f.replaceChildren();
    S.v.inputs.forEach((inp) => {
      let ctl;
      const common = { id: 'in-' + inp.key, name: inp.key };
      if (inp.type === 'select') ctl = h('select', common, inp.options.map(([val, lab]) => h('option', { value: val, selected: val === inp.value }, lab)));
      else if (inp.type === 'checkbox') ctl = h('input', { ...common, type: 'checkbox', checked: inp.value });
      else if (inp.type === 'range') {
        const out = h('span', { class: 'muted' }, inp.value);
        ctl = h('div', { class: 'range-row' }, h('input', { ...common, type: 'range', min: inp.min, max: inp.max, step: inp.step || 1, value: inp.value, oninput: (e) => { out.textContent = e.target.value; } }), out);
      } else ctl = h('input', { ...common, type: inp.type, value: inp.value, min: inp.min, max: inp.max });
      let tools = null;
      if (inp.type === 'text' && /^\s*-?\d+(\s*,\s*-?\d+)+\s*$/.test(inp.value)) tools = listTools(ctl, inp);
      f.appendChild(h('label', { class: inp.type === 'checkbox' ? 'check' : '' }, inp.type === 'checkbox' ? [ctl, inp.label] : [inp.label, ctl, tools]));
    });
    f.appendChild(h('button', { class: 'btn primary', type: 'submit' }, 'Apply / Rebuild'));
    f.onsubmit = (e) => { e.preventDefault(); applyForm(); };
    f.onchange = (e) => { if (e.target.type === 'range' || e.target.tagName === 'SELECT' || e.target.type === 'checkbox') applyForm(); };
    f.oninput = (e) => {
      if (e.target.dataset.skip) return;
      if (e.target.type === 'range') applyForm(true);
      else if (e.target.type === 'text' || e.target.type === 'number') { clearTimeout(liveT); liveT = setTimeout(() => applyForm(false), 600); } // live rebuild while typing
    };
  }
  /* quick editing for numeric-list inputs: add, remove last, random, shuffle */
  function listTools(field, inp) {
    const nums = () => field.value.split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => !Number.isNaN(x));
    const base = inp.value.split(/[\s,;]+/).map(Number);
    let lo = Math.min(...base), hi = Math.max(...base); if (hi - lo < 9) hi = lo + 9;
    const set = (arr) => { field.value = arr.join(', '); applyForm(false); };
    const add = h('input', { type: 'number', placeholder: 'value', 'data-skip': '1', style: { width: '72px' } });
    const doAdd = () => { if (add.value !== '') { set([...nums(), Number(add.value)]); add.value = ''; add.focus(); } };
    add.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    const btn = (txt, title, fn) => h('button', { type: 'button', class: 'btn', title, style: { padding: '3px 8px' }, onclick: fn }, txt);
    const rnd = () => { const n = Math.min(12, Math.max(4, nums().length || base.length)); set(Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)))); };
    const shuffle = () => { const a = nums(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } set(a); };
    return h('div', { class: 'row', style: { marginTop: '4px', gap: '4px', flexWrap: 'wrap' } }, add, btn('＋', 'Append value', doAdd), btn('−', 'Remove last value', () => set(nums().slice(0, -1))), btn('🎲', 'Random array', rnd), btn('⇄', 'Shuffle', shuffle));
  }
  function readParams() {
    const p = {};
    S.v.inputs.forEach((inp) => {
      const el = $('in-' + inp.key);
      p[inp.key] = inp.type === 'checkbox' ? el.checked : (inp.type === 'number' || inp.type === 'range') ? parseFloat(el.value) : el.value;
      if (Number.isNaN(p[inp.key])) p[inp.key] = inp.value;
    });
    return p;
  }
  function applyForm(keep) { pause(); S.params = readParams(); rebuild(!!keep); }
  function setParam(key, value) {
    const el = $('in-' + key); if (el) el.value = value;
    pause(); S.params = readParams(); rebuild(true);
  }

  /* ── build + draw ── */
  function rebuild(keepStep) {
    try {
      const res = S.v.build({ ...S.params });
      S.steps = res.steps; S.meta = res.meta; S.error = null;
      S.pseudo = typeof S.v.pseudo === 'function' ? S.v.pseudo(S.params) : S.v.pseudo;
    } catch (e) { S.steps = []; S.error = e.message; S.pseudo = []; }
    S.idx = keepStep ? Math.min(S.idx, Math.max(S.steps.length - 1, 0)) : 0;
    draw();
  }

  let liveT = null;
  function draw() {
    const canvas = $('canvas'); canvas.replaceChildren();
    const step = S.steps[S.idx], total = S.steps.length;
    if (S.error) {
      canvas.appendChild(h('div', { class: 'error' }, '⚠ ' + S.error));
      $('step-msg').textContent = 'Fix the input and press Apply.';
    } else if (step) {
      try { S.v.render(canvas, step, { params: S.params, meta: S.meta, index: S.idx, steps: S.steps, setParam }); }
      catch (e) { canvas.appendChild(h('div', { class: 'error' }, 'Render error: ' + e.message)); console.error(e); }
      $('step-msg').textContent = step.msg;
    }
    // pseudocode
    const on = step ? [].concat(step.line) : [];
    $('pseudo').replaceChildren(...S.pseudo.map((t, i) => h('li', { class: on.includes(i) ? 'on' : '' }, t)));
    // inspector
    const ins = $('inspector'); ins.replaceChildren();
    if (step) {
      const before = S.idx > 0 ? S.steps[S.idx - 1].state : {};
      for (const [k, v] of Object.entries(step.state)) {
        ins.appendChild(h('tr', { class: JSON.stringify(before[k]) !== JSON.stringify(v) ? 'changed' : '' }, h('td', {}, k), h('td', {}, window.CSViz.fmt(v))));
      }
    }
    // controls
    $('step-count').textContent = total ? `${S.idx + 1} / ${total}` : '0 / 0';
    const scrub = $('scrub'); scrub.max = Math.max(total - 1, 0); scrub.value = S.idx;
    $('btn-back').disabled = S.idx <= 0; $('btn-reset').disabled = S.idx <= 0;
    $('btn-fwd').disabled = S.idx >= total - 1;
    $('btn-play').disabled = !total;
    $('btn-play').textContent = S.timer ? '⏸ Pause' : (S.idx >= total - 1 && total ? '↺ Replay' : '▶ Play');
  }

  /* ── playback ── */
  const delay = () => 2100 - Number($('speed').value) * 200;
  function go(i) { S.idx = Math.max(0, Math.min(S.steps.length - 1, i)); draw(); }
  function pause() { if (S.timer) { clearTimeout(S.timer); S.timer = null; } if (S.steps.length) draw(); }
  function tick() {
    if (S.idx >= S.steps.length - 1) { pause(); return; }
    go(S.idx + 1);
    S.timer = setTimeout(tick, delay());
    draw();
  }
  function play() {
    if (S.timer) { pause(); return; }
    if (S.idx >= S.steps.length - 1) S.idx = 0;
    S.timer = setTimeout(tick, 0); draw();
  }

  /* ── context for the AI tutor ── */
  function getContext() {
    const step = S.steps[S.idx]; if (!S.v || !step) return null;
    const nx = S.steps[S.idx + 1], ln = [].concat(step.line)[0];
    return {
      title: S.v.title, group: S.v.group, params: S.params, index: S.idx + 1, total: S.steps.length,
      lineText: (S.pseudo[ln] || '').trim(), msg: step.msg, why: step.why, state: step.state,
      prevMsg: S.idx > 0 ? S.steps[S.idx - 1].msg : null,
      next: nx ? { msg: nx.msg, why: nx.why } : null, viva: S.v.viva,
    };
  }
  window.CSApp = { getContext, pause };

  /* ── wiring ── */
  document.addEventListener('DOMContentLoaded', () => {
    buildTopics();
    $('topic-filter').oninput = (e) => filterTopics(e.target.value);
    $('btn-play').onclick = play;
    $('btn-fwd').onclick = () => { pause(); go(S.idx + 1); };
    $('btn-back').onclick = () => { pause(); go(S.idx - 1); };
    $('btn-reset').onclick = () => { pause(); go(0); };
    $('scrub').oninput = (e) => { const i = Number(e.target.value); pause(); go(i); };
    $('speed').oninput = (e) => { $('speed-val').textContent = e.target.value; };
    document.addEventListener('keydown', (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || $('settings').open) return;
      if (e.key === 'ArrowRight') { pause(); go(S.idx + 1); }
      else if (e.key === 'ArrowLeft') { pause(); go(S.idx - 1); }
      else if (e.key === ' ') { e.preventDefault(); play(); }
      else if (e.key === 'Home') { pause(); go(0); }
    });
    window.AITutor.init();
    if (viz.length) select(viz[0].id);
  });
})();
