/* dsa-common.js — shared renderers & parsers used by every DSA module (window.DSA). */
(function () {
  'use strict';
  const { h, s, clamp, parseNumList } = window.CSViz;
  const DSA = {};
  const num = /^-?\d+(\.\d+)?$/;
  const coerce = (x) => (num.test(x) ? Number(x) : x);

  /* "push 5, pop, union 1 2" → [{op:'push', args:[5]}, ...]. A bare number means "insert". */
  DSA.parseOps = (text, max = 40) => {
    const ops = String(text).split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean).map((t) => {
      const p = t.split(/\s+/);
      return num.test(p[0]) ? { op: 'insert', args: p.map(coerce), raw: t } : { op: p[0].toLowerCase(), args: p.slice(1).map(coerce), raw: t };
    });
    if (ops.length > max) throw new Error(`Use at most ${max} operations.`);
    return ops;
  };

  /* integer list with validation */
  DSA.ints = (text, label, { maxLen = 20, lo = -999, hi = 999, minLen = 1 } = {}) => {
    const a = parseNumList(text, label).map(Math.round);
    if (a.length < minLen) throw new Error(`${label} needs at least ${minLen} number(s).`);
    if (a.length > maxLen) throw new Error(`${label}: use at most ${maxLen} numbers.`);
    if (a.some((x) => x < lo || x > hi)) throw new Error(`${label}: values must be between ${lo} and ${hi}.`);
    return a;
  };

  /* step factory: DSA.stepper() → {steps, push(line,msg,why,view,state)} */
  DSA.stepper = (cap = 4000) => {
    const steps = [];
    return { steps, full: () => steps.length >= cap, push(line, msg, why, view, state) { if (steps.length < cap) steps.push({ line, msg, why, view, state }); } };
  };

  /* ───── array renderers ───── */
  const ptrMap = (ptrs) => { const m = {}; Object.entries(ptrs || {}).forEach(([name, i]) => { if (i !== null && i !== undefined && i >= 0) (m[i] = m[i] || []).push(name); }); return m; };

  DSA.bars = (arr, marks = {}, ptrs = {}) => {
    const pm = ptrMap(ptrs), mx = Math.max(1, ...arr.map((v) => (v === null ? 0 : Math.abs(v))));
    return h('div', { class: 'bars' }, arr.map((v, i) => h('div', { class: 'barcol' },
      h('div', { class: 'barval' }, v === null ? '' : v),
      h('div', { class: 'bar ' + (marks[i] || '') + (v !== null && v < 0 ? ' neg' : ''), style: { height: v === null ? '0px' : Math.max(6, (Math.abs(v) / mx) * 170) + 'px' } }),
      h('div', { class: 'baridx' }, i), h('div', { class: 'ptr' }, (pm[i] || []).join(',')))));
  };

  DSA.cells = (arr, marks = {}, ptrs = {}, label) => {
    const pm = ptrMap(ptrs);
    return h('div', { class: 'cellwrap' }, label ? h('div', { class: 'label' }, label) : null,
      h('div', { class: 'cellrow' }, arr.map((v, i) => h('div', { class: 'cellcol' }, h('div', { class: 'cell ' + (marks[i] || '') }, v === null || v === undefined ? '' : v), h('div', { class: 'baridx' }, i), h('div', { class: 'ptr' }, (pm[i] || []).join(','))))));
  };

  DSA.aux = (list) => (list || []).map((a) => DSA.cells(a.cells, a.marks || {}, a.ptrs || {}, a.title));

  DSA.chips = (label, items, cls) => h('div', { class: 'chips' }, h('span', { class: 'label' }, label), items.length ? items.map((x, i) => h('span', { class: 'chip ' + (typeof cls === 'function' ? cls(x, i) : cls || '') }, String(x))) : h('span', { class: 'muted' }, 'empty'));

  DSA.vstack = (label, items) => h('div', { class: 'vstackwrap' }, h('div', { class: 'label' }, label),
    h('div', { class: 'vstack' }, items.length ? items.map((x, i) => h('div', { class: 'chip' + (i === items.length - 1 ? ' run' : '') }, String(x))) : h('span', { class: 'muted' }, 'empty')));

  DSA.grid = ({ corner = '', cols, rows, cell, mark }) => h('table', { class: 'grid' },
    cols ? h('tr', {}, h('th', {}, corner), cols.map((c) => h('th', {}, c))) : null,
    rows.map((r, i) => h('tr', {}, h('th', {}, r), cols.map((_, j) => h('td', { class: mark ? mark(i, j) || '' : '' }, cell(i, j) ?? '')))));

  DSA.board = (rows, cellFn) => h('table', { class: 'board' }, rows.map((r, i) => h('tr', {}, r.map((v, j) => { const o = cellFn(i, j, v); return h('td', { class: o.cls || '' }, o.text ?? ''); }))));

  DSA.stats = (obj) => h('div', {}, Object.entries(obj).map(([k, v]) => h('span', { class: 'stat' }, k + ': ', h('b', {}, String(v)))));

  /* ───── graphs ───── */
  DSA.parseGraph = (text, { directed = false, weight = 'none', max = 10, negative = false } = {}) => {
    const nodes = [], edges = [];
    const add = (x) => { if (!nodes.includes(x)) nodes.push(x); };
    for (const tok of String(text).split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)) {
      if (/^\w+$/.test(tok)) { add(tok); continue; }
      const m = tok.match(/^(\w+)\s*-+>?\s*(\w+)\s*(?::\s*(-?\d+(?:\.\d+)?))?$/);
      if (!m) throw new Error(`Bad edge "${tok}". Use A-B${weight === 'none' ? '' : ':weight'} (or a lone node name).`);
      if (m[3] === undefined && weight === 'req') throw new Error(`Edge "${tok}" needs a weight, e.g. ${m[1]}-${m[2]}:4`);
      const w = weight === 'none' || m[3] === undefined ? 1 : Number(m[3]);
      if (w < 0 && !negative) throw new Error('Negative weights are not allowed here.');
      add(m[1]); add(m[2]); edges.push({ u: m[1], v: m[2], w });
    }
    if (!nodes.length) throw new Error('Enter at least one edge, e.g. A-B, B-C');
    if (nodes.length > max) throw new Error(`Use at most ${max} nodes.`);
    return { nodes, edges, directed, weighted: weight !== 'none' };
  };
  DSA.adjacency = (g) => {
    const adj = {}; g.nodes.forEach((x) => (adj[x] = []));
    g.edges.forEach((e, ei) => { adj[e.u].push({ to: e.v, w: e.w, ei }); if (!g.directed) adj[e.v].push({ to: e.u, w: e.w, ei }); });
    return adj;
  };
  DSA.circlePos = (nodes) => {
    const pos = {}, N = nodes.length;
    nodes.forEach((x, i) => { const a = (2 * Math.PI * i) / N - Math.PI / 2; pos[x] = [300 + 225 * Math.cos(a), 190 + 150 * Math.sin(a)]; });
    return pos;
  };
  DSA.graphSvg = (g, pos, { nodeCls = {}, nodeSub = {}, edgeCls = {}, nodeColor = {} } = {}) => {
    const svg = s('svg', { class: 'viz-svg', viewBox: '0 0 600 380', style: { maxWidth: '720px' } });
    svg.appendChild(s('defs', {}, s('marker', { id: 'ga', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { class: 'arrowhead', d: 'M0,0 L10,5 L0,10 z' }))));
    g.edges.forEach((e, ei) => {
      const [x1, y1] = pos[e.u], [x2, y2] = pos[e.v];
      if (e.u === e.v) { svg.appendChild(s('circle', { class: 'edge ' + (edgeCls[ei] || ''), cx: x1, cy: y1 - 30, r: 14 })); return; }
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      svg.appendChild(s('line', { class: 'edge ' + (edgeCls[ei] || ''), x1, y1, x2: g.directed ? x2 - ux * 24 : x2, y2: g.directed ? y2 - uy * 24 : y2, 'marker-end': g.directed ? 'url(#ga)' : null }));
      if (g.weighted) svg.appendChild(s('text', { class: 'small', x: (x1 + x2) / 2 - uy * 12, y: (y1 + y2) / 2 + ux * 12 }, e.w));
    });
    g.nodes.forEach((x) => {
      const [cx, cy] = pos[x];
      svg.appendChild(s('circle', { class: 'node ' + (nodeCls[x] || ''), cx, cy, r: 22, style: nodeColor[x] ? { fill: nodeColor[x] + '55', stroke: nodeColor[x] } : null }));
      svg.appendChild(s('text', { x: cx, y: cy }, x));
      if (nodeSub[x] !== undefined) svg.appendChild(s('text', { class: 'small', x: cx, y: cy + 35 }, nodeSub[x]));
    });
    return svg;
  };

  /* ───── trees ─────
   * node = {id, label, sub, cls, edgeCls, box, left, right}  (kind 'binary')
   *      | {id, label, sub, cls, edgeCls, box, children:[…]}  (kind 'nary') */
  DSA.treeSvg = (roots, { kind = 'binary', maxWidth = 1.5 } = {}) => {
    roots = roots.filter(Boolean);
    const R = 19, GAP = 14, SY = 70, nodes = []; let cursor = 0, maxD = 0;
    const wOf = (n) => (n.box ? Math.max(40, String(n.label).length * 8 + 18) : Math.max(2 * R, String(n.label).length * 8 + 12));
    const goB = (n, d, par) => {
      if (!n) return;
      goB(n.left, d + 1, n);
      n._w = wOf(n); n._x = cursor + n._w / 2; cursor += n._w + GAP; n._d = d; n._p = par; maxD = Math.max(maxD, d); nodes.push(n);
      goB(n.right, d + 1, n);
    };
    const goN = (n, d, par) => {
      n._w = wOf(n); n._d = d; n._p = par; maxD = Math.max(maxD, d); nodes.push(n);
      const ch = (n.children || []).filter(Boolean);
      if (!ch.length) { n._x = cursor + n._w / 2; cursor += n._w + GAP; } else { ch.forEach((c) => goN(c, d + 1, n)); n._x = (ch[0]._x + ch[ch.length - 1]._x) / 2; }
    };
    roots.forEach((r) => { (kind === 'binary' ? goB : goN)(r, 0, null); cursor += GAP * 2; });
    const W = Math.max(cursor, 120) + 20, H = (maxD + 1) * SY + 20;
    const svg = s('svg', { class: 'viz-svg', viewBox: `0 0 ${W} ${H}`, style: { maxWidth: W * maxWidth + 'px' } });
    const X = (n) => n._x + 10, Y = (n) => 30 + n._d * SY;
    nodes.forEach((n) => {
      if (!n._p) return;
      svg.appendChild(s('line', { class: 'edge ' + (n.edgeCls || ''), x1: X(n._p), y1: Y(n._p), x2: X(n), y2: Y(n) }));
      if (n.edgeLabel !== undefined) svg.appendChild(s('text', { class: 'small', x: (X(n._p) + X(n)) / 2 + (X(n) < X(n._p) ? -8 : 8), y: (Y(n._p) + Y(n)) / 2 }, n.edgeLabel));
    });
    nodes.forEach((n) => {
      svg.appendChild(n.box ? s('rect', { class: 'node ' + (n.cls || ''), x: X(n) - n._w / 2, y: Y(n) - 15, width: n._w, height: 30, rx: 6 }) : s('circle', { class: 'node ' + (n.cls || ''), cx: X(n), cy: Y(n), r: R }));
      svg.appendChild(s('text', { x: X(n), y: Y(n) }, n.label));
      if (n.sub !== undefined && n.sub !== '') svg.appendChild(s('text', { class: 'small', x: X(n), y: Y(n) + (n.box ? 26 : 31) }, n.sub));
    });
    return svg;
  };

  /* heap array → binary tree nodes */
  DSA.heapTree = (arr, marks = {}) => {
    const mk = (i) => (i < arr.length ? { id: i, label: arr[i], cls: marks[i] || '', left: mk(2 * i + 1), right: mk(2 * i + 2) } : null);
    return mk(0);
  };

  /* plain-JS binary tree helpers */
  DSA.th = (n) => (n ? n.h : 0);
  window.DSA = DSA;
})();
