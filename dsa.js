/* dsa.js — Data-structure & algorithm visualizers:
 *   Fibonacci recursion tree + memo table, 0/1 Knapsack DP table,
 *   Dijkstra shortest path, BST / AVL with rotations. */
(function () {
  'use strict';
  const { h, s, clamp, parseNumList, register } = Object.assign({}, window.CSViz, { register: window.CSViz.register });

  /* ───────────────────────── Fibonacci ───────────────────────── */
  register({
    id: 'fib', group: 'DSA', section: 'Recursion & Backtracking', title: 'Recursion Tree & Memoization (Fibonacci)',
    blurb: 'Watch fib(n) expand into a call tree. Turn memoization on to see repeated subtrees disappear.',
    inputs: [
      { key: 'n', label: 'n (0–9)', type: 'number', value: 5, min: 0, max: 9 },
      { key: 'memo', label: 'Use memoization', type: 'checkbox', value: true },
    ],
    pseudo: (p) => p.memo
      ? ['fib(n):', '  if n ≤ 1: return n', '  if n in memo: return memo[n]', '  memo[n] = fib(n-1) + fib(n-2)', '  return memo[n]']
      : ['fib(n):', '  if n ≤ 1: return n', '  return fib(n-1) + fib(n-2)'],
    viva: [
      { q: 'What is the time complexity of naive recursive Fibonacci, and why?', a: 'exponential O(2^n) because the same subproblems are recomputed many times overlapping subproblems' },
      { q: 'How does memoization change the complexity?', a: 'linear O(n) each subproblem is computed once and stored in a table then reused' },
    ],
    build(p) {
      const n = clamp(Math.round(p.n), 0, 9);
      const L = p.memo ? { base: 1, hit: 2, comb: 3 } : { base: 1, hit: -1, comb: 2 };
      const nodes = [], status = [], vals = [], memo = {};
      let calls = 0, hits = 0;
      const steps = [];
      const snap = (line, msg, why, active) => steps.push({
        line, msg, why,
        view: { count: nodes.length, status: status.slice(), vals: vals.slice(), memo: { ...memo }, active },
        state: { current: `fib(${nodes[active].k})`, calls, memoHits: hits, memo: p.memo ? { ...memo } : '(memoization off)' },
      });
      function fib(k, parent) {
        const id = nodes.length;
        nodes.push({ id, k, parent, children: [] });
        if (parent >= 0) nodes[parent].children.push(id);
        status[id] = 'pending'; vals[id] = null; calls++;
        snap(0, `Call fib(${k}).`, parent < 0 ? 'This is the initial call.' : `fib(${nodes[parent].k}) needs fib(${k}) to compute its own value.`, id);
        if (k <= 1) {
          vals[id] = k; status[id] = 'done';
          snap(L.base, `Base case: fib(${k}) = ${k}.`, 'n ≤ 1 stops the recursion and returns n directly.', id);
          return k;
        }
        if (p.memo && k in memo) {
          hits++; vals[id] = memo[k]; status[id] = 'hit';
          snap(L.hit, `Memo hit: fib(${k}) = ${memo[k]} (no further calls).`, `fib(${k}) was already computed and stored, so we reuse it instead of recursing.`, id);
          return memo[k];
        }
        const a = fib(k - 1, id);
        const b = fib(k - 2, id);
        vals[id] = a + b; status[id] = 'done';
        if (p.memo) memo[k] = a + b;
        snap(L.comb, `fib(${k}) = fib(${k - 1}) + fib(${k - 2}) = ${a} + ${b} = ${a + b}${p.memo ? ' → stored in memo.' : '.'}`,
          'Both child calls have returned, so their results can be added.', id);
        return a + b;
      }
      fib(n, -1);

      let leaf = 0, depth = 0;
      (function go(id, d) {
        const nd = nodes[id]; nd.y = d; depth = Math.max(depth, d);
        if (!nd.children.length) nd.x = leaf++;
        else { nd.children.forEach((c) => go(c, d + 1)); nd.x = (nodes[nd.children[0]].x + nodes[nd.children.at(-1)].x) / 2; }
      })(0, 0);
      return { steps, meta: { nodes, n, w: Math.max(leaf, 1) * 52 + 40, h: (depth + 1) * 70 + 20 } };
    },
    render(root, step, ctx) {
      const { nodes, n, w, h: H } = ctx.meta, v = step.view;
      const px = (nd) => 30 + nd.x * 52, py = (nd) => 34 + nd.y * 70;
      const svg = s('svg', { class: 'viz-svg', viewBox: `0 0 ${w} ${H}`, style: { maxWidth: w * 1.4 + 'px' } });
      for (let i = 0; i < v.count; i++) {
        const nd = nodes[i];
        if (nd.parent >= 0) svg.appendChild(s('line', { class: 'edge' + (v.status[i] !== 'pending' ? ' done' : ''), x1: px(nodes[nd.parent]), y1: py(nodes[nd.parent]), x2: px(nd), y2: py(nd) }));
      }
      for (let i = 0; i < v.count; i++) {
        const nd = nodes[i];
        svg.appendChild(s('g', {},
          s('circle', { class: 'node ' + v.status[i] + (i === v.active ? ' active' : ''), cx: px(nd), cy: py(nd), r: 21 }),
          s('text', { x: px(nd), y: py(nd) }, `f(${nd.k})`),
          v.vals[i] !== null ? s('text', { class: 'small', x: px(nd), y: py(nd) + 31 }, '=' + v.vals[i]) : null));
      }
      const head = [h('th', {}, 'k')], row = [h('th', {}, 'memo[k]')];
      for (let k = 0; k <= n; k++) { head.push(h('th', {}, k)); row.push(h('td', { class: k in v.memo ? 'path' : '' }, k in v.memo ? v.memo[k] : '')); }
      root.append(svg, ctx.params.memo ? h('table', { class: 'grid' }, h('tr', {}, head), h('tr', {}, row)) : h('p', { class: 'muted' }, 'Memoization is off: notice how many identical subtrees get recomputed.'));
    },
  });

  /* ───────────────────────── 0/1 Knapsack ───────────────────────── */
  register({
    id: 'knap', group: 'DSA', section: 'Dynamic Programming', title: '0/1 Knapsack (DP / Memo Table)',
    blurb: 'Fill the dp table cell by cell, then trace back to see which items were chosen.',
    inputs: [
      { key: 'weights', label: 'Weights (max 6 items)', type: 'text', value: '1, 3, 4, 5' },
      { key: 'values', label: 'Values', type: 'text', value: '1, 4, 5, 7' },
      { key: 'cap', label: 'Capacity (1–12)', type: 'number', value: 7, min: 1, max: 12 },
    ],
    pseudo: () => [
      'for i in 1..n:', '  for c in 0..W:', '    skip = dp[i-1][c]',
      '    take = v[i] + dp[i-1][c-w[i]]   (if w[i] ≤ c)', '    dp[i][c] = max(skip, take)',
      'c = W; for i = n..1:', '  if dp[i][c] ≠ dp[i-1][c]: pick item i; c -= w[i]'],
    viva: [
      { q: 'What is the time and space complexity of the DP solution to 0/1 knapsack?', a: 'O(nW) time and O(nW) space pseudo-polynomial can reduce to O(W) space' },
      { q: 'Why can greedy by value/weight ratio fail for 0/1 knapsack?', a: 'items cannot be split so taking the best ratio item may waste capacity greedy is only optimal for fractional knapsack' },
    ],
    build(p) {
      const w = parseNumList(p.weights, 'Weights').map(Math.round), v = parseNumList(p.values, 'Values').map(Math.round);
      if (w.length !== v.length) throw new Error('Weights and values need the same number of items.');
      if (w.length > 6) throw new Error('Use at most 6 items.');
      if (w.some((x) => x < 1)) throw new Error('Weights must be ≥ 1.');
      const n = w.length, W = clamp(Math.round(p.cap), 1, 12);
      const dp = Array.from({ length: n + 1 }, () => Array(W + 1).fill(null));
      for (let c = 0; c <= W; c++) dp[0][c] = 0;
      for (let i = 0; i <= n; i++) dp[i][0] = 0;
      const steps = [];
      const snap = (line, msg, why, extra) => steps.push({
        line, msg, why,
        view: { dp: dp.map((r) => r.slice()), cur: null, refs: [], path: [], ...extra },
        state: { ...(extra && extra.state), filledCells: dp.flat().filter((x) => x !== null).length },
      });
      snap(0, 'Row 0 (no items) and column 0 (capacity 0) are 0: nothing fits or nothing to pick.', 'Base cases of the recurrence.', {});
      for (let i = 1; i <= n; i++) {
        for (let c = 1; c <= W; c++) {
          const skip = dp[i - 1][c];
          const fits = w[i - 1] <= c;
          const take = fits ? v[i - 1] + dp[i - 1][c - w[i - 1]] : -Infinity;
          dp[i][c] = Math.max(skip, take);
          const refs = [[i - 1, c]]; if (fits) refs.push([i - 1, c - w[i - 1]]);
          snap(fits ? 4 : 2,
            fits ? `Item ${i} (w=${w[i - 1]}, v=${v[i - 1]}), capacity ${c}: skip=${skip}, take=${v[i - 1]}+dp[${i - 1}][${c - w[i - 1]}]=${take} → dp[${i}][${c}]=${dp[i][c]}.`
              : `Item ${i} (w=${w[i - 1]}) is heavier than capacity ${c}: must skip → dp[${i}][${c}]=${skip}.`,
            fits ? 'Each cell is the better of leaving the item out or taking it and using the best leftover capacity.' : 'An item that does not fit cannot be taken.',
            { cur: [i, c], refs, state: { item: i, capacity: c, skip, take: fits ? take : 'n/a', best: dp[i][c] } });
        }
      }
      let c = W; const path = [], chosen = [];
      for (let i = n; i >= 1; i--) {
        const took = dp[i][c] !== dp[i - 1][c];
        path.push([i, c]);
        if (took) { chosen.push(i); c -= w[i - 1]; }
        steps.push({
          line: 6, msg: took ? `Traceback: dp[${i}][${c + w[i - 1]}] ≠ dp[${i - 1}][${c + w[i - 1]}] → item ${i} was taken.` : `Traceback: dp[${i}][${c}] = dp[${i - 1}][${c}] → item ${i} was skipped.`,
          why: 'If the value changed when item i was added, item i is part of the optimal set.',
          view: { dp: dp.map((r) => r.slice()), cur: null, refs: [], path: path.slice() },
          state: { chosenItems: chosen.slice().reverse(), remainingCapacity: c, bestValue: dp[n][W] },
        });
      }
      return { steps, meta: { w, v, n, W } };
    },
    render(root, step, ctx) {
      const { w, v, n, W } = ctx.meta, vw = step.view;
      const mark = (list, i, c) => list.some(([a, b]) => a === i && b === c);
      const head = [h('th', {}, 'item \\ cap')]; for (let c = 0; c <= W; c++) head.push(h('th', {}, c));
      const rows = [h('tr', {}, head)];
      for (let i = 0; i <= n; i++) {
        const cells = [h('th', {}, i === 0 ? '0 (none)' : `${i} (w${w[i - 1]}, v${v[i - 1]})`)];
        for (let c = 0; c <= W; c++) {
          const cls = vw.cur && vw.cur[0] === i && vw.cur[1] === c ? 'cur' : mark(vw.refs, i, c) ? 'ref' : mark(vw.path, i, c) ? 'path' : '';
          cells.push(h('td', { class: cls }, vw.dp[i][c] === null ? '' : vw.dp[i][c]));
        }
        rows.push(h('tr', {}, cells));
      }
      root.append(h('table', { class: 'grid' }, rows),
        h('p', { class: 'muted' }, 'Yellow = cell being filled · Blue = cells it reads from · Green = traceback path.'));
    },
  });

  /* ───────────────────────── Dijkstra ───────────────────────── */
  function parseGraph(text, directed) {
    const nodes = [], edges = [];
    const add = (x) => { if (!nodes.includes(x)) nodes.push(x); };
    for (const tok of String(text).split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)) {
      const m = tok.match(/^(\w+)\s*-+>?\s*(\w+)\s*:\s*(\d+(?:\.\d+)?)$/);
      if (!m) throw new Error(`Bad edge "${tok}". Use the form A-B:4 (non-negative weight).`);
      add(m[1]); add(m[2]); edges.push({ u: m[1], v: m[2], w: Number(m[3]) });
    }
    if (nodes.length < 2) throw new Error('Enter at least one edge, e.g. A-B:4, B-C:2');
    if (nodes.length > 10) throw new Error('Use at most 10 nodes.');
    return { nodes, edges, directed };
  }

  register({
    id: 'dijkstra', group: 'DSA', section: 'Graphs', title: "Dijkstra's Shortest Path",
    blurb: 'Greedy single-source shortest paths: repeatedly finalize the closest unvisited node and relax its edges.',
    inputs: [
      { key: 'edges', label: 'Edges (U-V:weight, comma separated)', type: 'text', value: 'A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3' },
      { key: 'source', label: 'Source node', type: 'text', value: 'A' },
      { key: 'directed', label: 'Directed graph', type: 'checkbox', value: false },
    ],
    pseudo: () => [
      'dist[all] = ∞; dist[src] = 0; PQ = {src}', 'while PQ is not empty:', '  u = extract-min(PQ); finalize u',
      '  for each edge (u, v, w), v not finalized:', '    if dist[u] + w < dist[v]:', '      dist[v] = dist[u] + w; prev[v] = u; PQ.push(v)', 'return dist, prev'],
    viva: [
      { q: "Why does Dijkstra's algorithm fail with negative edge weights?", a: 'once a node is finalized it assumes no shorter path exists but a negative edge could later reduce it greedy assumption breaks use Bellman-Ford' },
      { q: "What is the complexity of Dijkstra with a binary heap?", a: 'O((V+E) log V)' },
    ],
    build(p) {
      const g = parseGraph(p.edges, p.directed);
      const src = String(p.source).trim();
      if (!g.nodes.includes(src)) throw new Error(`Source "${src}" is not in the graph.`);
      const adj = {}; g.nodes.forEach((x) => (adj[x] = []));
      g.edges.forEach((e, ei) => { adj[e.u].push({ to: e.v, w: e.w, ei }); if (!p.directed) adj[e.v].push({ to: e.u, w: e.w, ei }); });
      const dist = {}, prevEdge = {}, prev = {}, done = new Set();
      g.nodes.forEach((x) => (dist[x] = Infinity)); dist[src] = 0;
      const pq = () => g.nodes.filter((x) => !done.has(x) && dist[x] < Infinity).sort((a, b) => dist[a] - dist[b]).map((x) => [x, dist[x]]);
      const steps = [];
      const snap = (line, msg, why, cur, relax) => steps.push({
        line, msg, why,
        view: { dist: { ...dist }, prev: { ...prev }, prevEdge: { ...prevEdge }, done: [...done], cur, relax, pq: pq() },
        state: { dist: { ...dist }, finalized: [...done], priorityQueue: pq().map(([x, d]) => `${x}:${d}`), current: cur || '—' },
      });
      snap(0, `Initialize: dist[${src}] = 0, every other node = ∞. Queue = [${src}].`, 'We know the source is 0 away from itself and nothing else yet.', null, null);
      while (pq().length) {
        const [u, d] = pq()[0];
        done.add(u);
        snap(2, `Extract-min: ${u} (dist ${d}) is the closest unfinalized node → finalize it.`, 'With non-negative weights, no later path can beat the smallest tentative distance.', u, null);
        for (const { to, w, ei } of adj[u]) {
          if (done.has(to)) continue;
          const nd = d + w, old = dist[to];
          if (nd < old) {
            dist[to] = nd; prev[to] = u; prevEdge[to] = ei;
            snap(5, `Relax ${u}→${to} (w=${w}): ${d}+${w}=${nd} < ${old === Infinity ? '∞' : old} → dist[${to}]=${nd}.`, 'Going through u is shorter than the best known route to v, so we update it.', u, ei);
          } else {
            snap(4, `Relax ${u}→${to} (w=${w}): ${d}+${w}=${nd} ≥ ${old} → no change.`, 'The existing route to v is at least as short, so nothing is updated.', u, ei);
          }
        }
      }
      const path = (x) => { const r = []; for (let c = x; c !== undefined; c = prev[c]) r.unshift(c); return r.join('→'); };
      const paths = {}; g.nodes.forEach((x) => (paths[x] = dist[x] === Infinity ? 'unreachable' : path(x)));
      steps.push({
        line: 6, msg: 'Queue empty: all reachable nodes finalized. Green edges form the shortest-path tree.', why: 'Every reachable node has been finalized, so the distances are optimal.',
        view: { dist: { ...dist }, prev: { ...prev }, prevEdge: { ...prevEdge }, done: [...done], cur: null, relax: null, pq: [] },
        state: { dist: { ...dist }, paths },
      });
      const pos = {}, N = g.nodes.length, R = 150;
      g.nodes.forEach((x, i) => { const a = (2 * Math.PI * i) / N - Math.PI / 2; pos[x] = [300 + R * 1.5 * Math.cos(a), 190 + R * Math.sin(a)]; });
      return { steps, meta: { g, pos, src } };
    },
    render(root, step, ctx) {
      const { g, pos } = ctx.meta, v = step.view;
      const svg = s('svg', { class: 'viz-svg', viewBox: '0 0 600 380', style: { maxWidth: '760px' } });
      svg.appendChild(s('defs', {}, s('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { class: 'arrowhead', d: 'M0,0 L10,5 L0,10 z' }))));
      const treeSet = new Set(Object.values(v.prevEdge));
      g.edges.forEach((e, ei) => {
        const [x1, y1] = pos[e.u], [x2, y2] = pos[e.v];
        const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        const ex = g.directed ? x2 - ux * 24 : x2, ey = g.directed ? y2 - uy * 24 : y2;
        svg.appendChild(s('line', { class: 'edge' + (treeSet.has(ei) ? ' tree' : '') + (v.relax === ei ? ' relax' : ''), x1, y1, x2: ex, y2: ey, 'marker-end': g.directed ? 'url(#ah)' : null }));
        svg.appendChild(s('text', { x: (x1 + x2) / 2 - uy * 12, y: (y1 + y2) / 2 + ux * 12, class: 'small' }, e.w));
      });
      g.nodes.forEach((x) => {
        const [cx, cy] = pos[x];
        svg.appendChild(s('circle', { class: 'node' + (v.done.includes(x) ? ' visited' : '') + (v.cur === x ? ' cur' : ''), cx, cy, r: 22 }));
        svg.appendChild(s('text', { x: cx, y: cy }, x));
        svg.appendChild(s('text', { x: cx, y: cy + 36, class: 'small' }, 'd=' + (v.dist[x] === Infinity ? '∞' : v.dist[x])));
      });
      const head = [h('th', {}, 'node'), ...g.nodes.map((x) => h('th', {}, x))];
      const dr = [h('th', {}, 'dist'), ...g.nodes.map((x) => h('td', { class: v.done.includes(x) ? 'path' : '' }, v.dist[x] === Infinity ? '∞' : v.dist[x]))];
      const pr = [h('th', {}, 'prev'), ...g.nodes.map((x) => h('td', {}, v.prev[x] || '—'))];
      root.append(svg, h('table', { class: 'grid' }, h('tr', {}, head), h('tr', {}, dr), h('tr', {}, pr)),
        h('div', { class: 'chips' }, h('span', { class: 'label' }, 'Priority queue (min first):'), v.pq.length ? v.pq.map(([x, d], i) => h('span', { class: 'chip' + (i === 0 ? ' run' : '') }, `${x}:${d}`)) : h('span', { class: 'muted' }, 'empty')));
    },
  });

  /* ───────────────────────── BST / AVL ───────────────────────── */
  const ht = (n) => (n ? n.h : 0);
  const upd = (n) => { n.h = 1 + Math.max(ht(n.left), ht(n.right)); };
  const bal = (n) => (n ? ht(n.left) - ht(n.right) : 0);
  const cloneT = (n) => (n ? { key: n.key, h: n.h, left: cloneT(n.left), right: cloneT(n.right) } : null);
  function rotR(n) { const l = n.left; n.left = l.right; l.right = n; upd(n); upd(l); return l; }
  function rotL(n) { const r = n.right; n.right = r.left; r.left = n; upd(n); upd(r); return r; }
  const keysOf = (n, out = []) => { if (n) { keysOf(n.left, out); out.push(n.key); keysOf(n.right, out); } return out; };
  const balMap = (n, o = {}) => { if (n) { o[n.key] = bal(n); balMap(n.left, o); balMap(n.right, o); } return o; };

  register({
    id: 'avl', group: 'DSA', section: 'Trees', title: 'Binary Search Tree / AVL Rotations',
    blurb: 'Insert keys one by one. In AVL mode the tree rebalances itself with LL / RR / LR / RL rotations.',
    inputs: [
      { key: 'vals', label: 'Insert sequence', type: 'text', value: '10, 20, 30, 40, 50, 25' },
      { key: 'mode', label: 'Tree type', type: 'select', value: 'avl', options: [['avl', 'AVL (self-balancing)'], ['bst', 'Plain BST']] },
    ],
    pseudo: (p) => p.mode === 'avl'
      ? ['insert(key):', '  walk down: go left if key < node else right', '  attach key as a new leaf', '  for each ancestor (bottom-up):', '    update height; bf = h(left) - h(right)',
        '    if |bf| > 1: rotate (LL→R, RR→L, LR→L,R, RL→R,L)']
      : ['insert(key):', '  walk down: go left if key < node else right', '  attach key as a new leaf'],
    viva: [
      { q: 'What are the four AVL rotation cases and when does each apply?', a: 'LL right rotation RR left rotation LR left then right RL right then left depending on where the new node was inserted relative to the unbalanced node' },
      { q: 'What is the worst-case search time in a plain BST versus an AVL tree?', a: 'BST O(n) degenerates into a linked list for sorted input AVL O(log n) height is balanced' },
    ],
    build(p) {
      const vals = parseNumList(p.vals, 'Sequence').map(Math.round);
      if (vals.length > 15) throw new Error('Use at most 15 keys.');
      const avl = p.mode === 'avl';
      let root = null, rotations = 0, maxH = 1;
      const steps = [];
      const emit = (line, msg, why, hl, ins) => {
        maxH = Math.max(maxH, ht(root));
        steps.push({
          line, msg, why, view: { root: cloneT(root), hl: hl || {} },
          state: { inserting: ins, inorder: keysOf(root), height: ht(root), rotations, balanceFactors: avl ? balMap(root) : '(plain BST)' },
        });
      };
      emit(0, 'Empty tree. Press Step to start inserting.', 'Nothing has been inserted yet.', {}, '—');
      for (const key of vals) {
        if (!root) { root = { key, h: 1, left: null, right: null }; emit(2, `Insert ${key}: the tree is empty, so it becomes the root.`, 'The first key is always the root.', { ins: key }, key); continue; }
        const path = []; let cur = root, dup = false;
        for (;;) {
          if (key === cur.key) { dup = true; break; }
          const dir = key < cur.key ? 'left' : 'right';
          emit(1, `Insert ${key}: compare with ${cur.key} → ${key} ${key < cur.key ? '<' : '>'} ${cur.key}, go ${dir}.`, 'BST rule: smaller keys go left, larger keys go right.', { cur: cur.key }, key);
          path.push({ n: cur, dir });
          if (!cur[dir]) { cur[dir] = { key, h: 1, left: null, right: null }; break; }
          cur = cur[dir];
        }
        if (dup) { emit(1, `Insert ${key}: already present, ignored.`, 'This tree stores distinct keys.', { cur: key }, key); continue; }
        emit(2, `Attach ${key} as the ${path.at(-1).dir} child of ${cur.key}.`, 'We reached an empty slot, so the new key becomes a leaf.', { ins: key }, key);
        if (!avl) continue;
        for (let i = path.length - 1; i >= 0; i--) {
          const n = path[i].n; upd(n);
          const bf = bal(n);
          emit(4, `Retrace at ${n.key}: height=${n.h}, balance factor = ${ht(n.left)} − ${ht(n.right)} = ${bf}.`, 'Heights can change after an insertion, so we recheck balance from the new leaf upward.', { cur: n.key, ins: key }, key);
          if (Math.abs(bf) <= 1) continue;
          let kase, rot;
          if (bf > 1) kase = bal(n.left) >= 0 ? 'LL' : 'LR'; else kase = bal(n.right) <= 0 ? 'RR' : 'RL';
          emit(5, `Imbalance at ${n.key} (|bf| = ${Math.abs(bf)} > 1): ${kase} case.`, { LL: 'The left-left subtree is too tall → one right rotation.', RR: 'The right-right subtree is too tall → one left rotation.', LR: 'The left-right subtree is too tall → rotate the left child left, then rotate right.', RL: 'The right-left subtree is too tall → rotate the right child right, then rotate left.' }[kase], { bad: n.key, ins: key }, key);
          const attach = (nr) => { if (i === 0) root = nr; else path[i - 1].n[path[i - 1].dir] = nr; };
          if (kase === 'LR') { n.left = rotL(n.left); rotations++; emit(5, `Rotate left at ${n.left.key} (first half of LR).`, 'Straightens the zig-zag into an LL shape.', { rot: n.left.key, ins: key }, key); }
          if (kase === 'RL') { n.right = rotR(n.right); rotations++; emit(5, `Rotate right at ${n.right.key} (first half of RL).`, 'Straightens the zig-zag into an RR shape.', { rot: n.right.key, ins: key }, key); }
          rot = kase === 'LL' || kase === 'LR' ? rotR(n) : rotL(n);
          attach(rot); rotations++;
          emit(5, `Rotate ${kase === 'LL' || kase === 'LR' ? 'right' : 'left'} at ${n.key}: ${rot.key} becomes the subtree root. Balanced again.`, 'The middle key moves up, shortening the tall side by one level.', { rot: rot.key, ins: key }, key);
          break;
        }
      }
      emit(0, `Done. Tree height = ${ht(root)}, rotations = ${rotations}.`, avl ? 'AVL keeps height ≈ log₂ n.' : 'A plain BST can become skewed on sorted input.', {}, '—');
      return { steps, meta: { count: new Set(vals).size, maxH } };
    },
    render(root, step, ctx) {
      const t = step.view.root, hl = step.view.hl, avl = ctx.params.mode === 'avl';
      const SX = 46, SY = 72, W = Math.max(ctx.meta.count, 3) * SX + 40, H = (ctx.meta.maxH + 0.6) * SY + 20;
      const svg = s('svg', { class: 'viz-svg', viewBox: `0 0 ${W} ${H}`, style: { maxWidth: W * 1.5 + 'px' } });
      if (!t) { root.append(svg); return; }
      let i = 0; const nodes = [];
      (function go(n, d, par) { if (!n) return; go(n.left, d + 1, n); n.i = i++; n.d = d; n.par = par; nodes.push(n); go(n.right, d + 1, n); })(t, 0, null);
      const off = (W - i * SX) / 2 + SX / 2, X = (n) => off + n.i * SX, Y = (n) => 32 + n.d * SY;
      nodes.forEach((n) => { if (n.par) svg.appendChild(s('line', { class: 'edge', x1: X(n.par), y1: Y(n.par), x2: X(n), y2: Y(n) })); });
      nodes.forEach((n) => {
        const cls = n.key === hl.bad ? ' bad' : n.key === hl.rot ? ' rot' : n.key === hl.cur ? ' cur' : n.key === hl.ins ? ' new' : '';
        svg.appendChild(s('circle', { class: 'node' + cls, cx: X(n), cy: Y(n), r: 19 }));
        svg.appendChild(s('text', { x: X(n), y: Y(n) }, n.key));
        if (avl) svg.appendChild(s('text', { class: 'small', x: X(n), y: Y(n) + 31 }, `h${n.h} bf${bal(n)}`));
      });
      root.append(svg, h('p', { class: 'muted' }, 'Yellow = node being compared · Green = newly inserted · Red = unbalanced · Purple = rotation pivot.'));
    },
  });
})();
