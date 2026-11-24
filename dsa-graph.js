/* dsa-graph.js — BFS, DFS, Bellman-Ford, Floyd-Warshall, topological sort, union-find, Kruskal, Prim, Tarjan SCC, A*. */
(function () {
  'use strict';
  const { h, register, PALETTE } = window.CSViz;
  const D = window.DSA, { stepper, parseOps, parseGraph, adjacency, circlePos, graphSvg } = D;
  const GR = 'Graphs';
  const need = (o, n = 1) => { if (o.args.length < n) throw new Error(`"${o.raw}" needs ${n} argument(s).`); };
  const eIn = (value, weighted) => ({ key: 'edges', label: weighted ? 'Edges (U-V:weight)' : 'Edges (U-V, lone name = isolated node)', type: 'text', value });
  const srcIn = { key: 'source', label: 'Start node', type: 'text', value: 'A' };
  const dirIn = (v = false) => ({ key: 'directed', label: 'Directed graph', type: 'checkbox', value: v });
  const checkSrc = (g, s) => { s = String(s).trim(); if (!g.nodes.includes(s)) throw new Error(`Start node "${s}" is not in the graph.`); return s; };
  const gRender = (root, step, extra) => root.append(graphSvg(step.view.g, step.view.pos, step.view), ...(extra || []));

  /* ───────────────────────── BFS ───────────────────────── */
  register({
    id: 'bfs', group: 'DSA', section: GR, title: 'Breadth-First Search (BFS)',
    blurb: 'Explore level by level with a FIFO queue; gives shortest paths in unweighted graphs.',
    inputs: [eIn('A-B, A-C, B-D, C-D, C-E, D-F, E-F, G-H'), srcIn, dirIn()],
    pseudo: () => ['queue = [start]; visited = {start}; dist[start] = 0', 'while queue not empty:', '  u = dequeue()', '  for each neighbour v of u not visited:', '    visited += v; dist[v] = dist[u] + 1; parent[v] = u; enqueue(v)'],
    viva: [{ q: 'Why does BFS find shortest paths in an unweighted graph?', a: 'it visits nodes in order of increasing distance level by level using a queue so the first time a node is reached is via the fewest edges' }, { q: 'What is the complexity of BFS?', a: 'O(V + E) with adjacency list' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: p.directed }), src = checkSrc(g, p.source), adj = adjacency(g), pos = circlePos(g.nodes), sp = stepper(300);
      const dist = { [src]: 0 }, queue = [src], order = [], nodeCls = { [src]: 'pending' }, edgeCls = {};
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { g, pos, nodeCls: { ...nodeCls }, edgeCls: { ...edgeCls }, nodeSub: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, 'd=' + v])), queue: queue.slice(), order: order.slice(), ...extra }, { queue: queue.slice(), visitOrder: order.slice(), dist: { ...dist } });
      snap(0, `Start BFS from ${src}: enqueue it with distance 0.`, 'The start node is discovered first.');
      while (queue.length) {
        const u = queue.shift(); order.push(u); nodeCls[u] = 'done'; Object.keys(nodeCls).forEach((k) => { if (nodeCls[k] === 'cur') nodeCls[k] = 'done'; }); nodeCls[u] = 'cur';
        snap(2, `Dequeue ${u} (distance ${dist[u]}).`, 'FIFO order guarantees nodes are processed by increasing distance.');
        for (const { to, ei } of adj[u]) {
          if (dist[to] !== undefined) { snap(3, `${to} was already discovered → skip.`, 'Visited nodes are never queued twice.', { edgeCls: { ...edgeCls, [ei]: 'relax' } }); continue; }
          dist[to] = dist[u] + 1; queue.push(to); nodeCls[to] = 'pending'; edgeCls[ei] = 'tree';
          snap(4, `Discover ${to}: dist = ${dist[to]}, enqueue.`, 'A newly seen neighbour is exactly one edge further than u.');
        }
        nodeCls[u] = 'done';
      }
      const unreach = g.nodes.filter((x) => dist[x] === undefined);
      snap(1, `Queue empty. Visit order: ${order.join(' → ')}.${unreach.length ? ' Unreachable: ' + unreach.join(', ') + '.' : ''}`, 'Every reachable node has been processed.');
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.chips('Queue (front first):', step.view.queue), D.chips('Visit order:', step.view.order)]),
  });

  /* ───────────────────────── DFS ───────────────────────── */
  register({
    id: 'dfs', group: 'DSA', section: GR, title: 'Depth-First Search (DFS)',
    blurb: 'Go as deep as possible, then backtrack. Shows discovery/finish times and the recursion stack.',
    inputs: [eIn('A-B, A-C, B-D, C-D, C-E, D-F, E-F, G-H'), srcIn, dirIn()],
    pseudo: () => ['dfs(u): mark u visited; disc[u] = ++time', '  for each neighbour v of u:', '    if v not visited: dfs(v)   (tree edge)', '    else: skip (already visited)', '  fin[u] = ++time'],
    viva: [{ q: 'How does DFS differ from BFS and what data structure does it use?', a: 'dfs goes deep first using a stack or recursion bfs goes level by level using a queue' }, { q: 'Name two applications of DFS.', a: 'cycle detection topological sort connected components strongly connected components maze solving' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: p.directed }), src = checkSrc(g, p.source), adj = adjacency(g), pos = circlePos(g.nodes), sp = stepper(400);
      const disc = {}, fin = {}, stack = [], order = [], nodeCls = {}, edgeCls = {}; let t = 0;
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { g, pos, nodeCls: { ...nodeCls }, edgeCls: { ...edgeCls }, nodeSub: Object.fromEntries(g.nodes.filter((x) => disc[x]).map((x) => [x, `${disc[x]}/${fin[x] || '?'}`])), stack: stack.slice(), order: order.slice(), ...extra }, { callStack: stack.slice(), visitOrder: order.slice(), discovery: { ...disc }, finish: { ...fin } });
      snap(0, `Start DFS from ${src}. Labels show discovery/finish time.`, 'DFS uses the recursion (call) stack.');
      const dfs = (u) => {
        disc[u] = ++t; stack.push(u); order.push(u); nodeCls[u] = 'cur';
        snap(0, `Visit ${u}: discovery time ${t}; push on the stack.`, 'Going deeper before exploring siblings.');
        for (const { to, ei } of adj[u]) {
          if (!disc[to]) { edgeCls[ei] = 'tree'; snap(2, `Edge ${u}→${to}: ${to} is unvisited → recurse (tree edge).`, 'Unvisited neighbours are explored immediately.'); dfs(to); nodeCls[u] = 'cur'; }
          else snap(3, `Edge ${u}→${to}: ${to} already visited → skip.`, 'Nothing new down this edge.', { edgeCls: { ...edgeCls, [ei]: 'relax' } });
        }
        fin[u] = ++t; stack.pop(); nodeCls[u] = 'done';
        snap(4, `${u} has no more unvisited neighbours: finish time ${t}; backtrack.`, 'All descendants are finished, so we pop u.');
      };
      dfs(src);
      snap(4, `DFS complete. Visit order: ${order.join(' → ')}.`, 'Every reachable node was visited.');
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.vstack('Recursion stack', step.view.stack), D.chips('Visit order:', step.view.order)]),
  });

  /* ───────────────────────── Bellman-Ford ───────────────────────── */
  register({
    id: 'bellman', group: 'DSA', section: GR, title: 'Bellman-Ford (negative weights)',
    blurb: 'Relax every edge V−1 times; one more pass detects negative cycles.',
    inputs: [eIn('A-B:4, A-C:5, B-C:-3, C-D:4, B-D:6, D-E:2, E-B:-1', true), srcIn],
    pseudo: () => ['dist[all] = ∞; dist[src] = 0', 'repeat V-1 times:', '  for each edge (u, v, w): if dist[u] + w < dist[v]: dist[v] = dist[u] + w', 'if any edge can still be relaxed → negative cycle'],
    viva: [{ q: 'Why does Bellman-Ford run V-1 passes?', a: 'a shortest path has at most V-1 edges and each pass fixes paths one edge longer' }, { q: 'How does Bellman-Ford detect a negative cycle and what is its complexity?', a: 'if a V-th pass still relaxes an edge a negative cycle is reachable O(VE) time' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: true, weight: 'req', negative: true, max: 8 }), src = checkSrc(g, p.source), pos = circlePos(g.nodes), sp = stepper(500), V = g.nodes.length;
      const dist = Object.fromEntries(g.nodes.map((x) => [x, Infinity])); dist[src] = 0; const prevE = {};
      const snap = (line, msg, why, hl, pass) => sp.push(line, msg, why, { g, pos, edgeCls: { ...Object.fromEntries(Object.values(prevE).map((e) => [e, 'tree'])), ...(hl === undefined ? {} : { [hl]: 'relax' }) }, nodeSub: Object.fromEntries(g.nodes.map((x) => [x, 'd=' + (dist[x] === Infinity ? '∞' : dist[x])])), nodeCls: { [src]: 'pending' }, dist: { ...dist }, pass }, { pass: pass ?? 0, dist: { ...dist } });
      snap(0, `dist[${src}] = 0, all others ∞.`, 'Only the source is known.', undefined, 0);
      let changed = true, pass = 0;
      for (; pass < V - 1 && changed; pass++) {
        changed = false;
        g.edges.forEach((e, ei) => {
          const nd = dist[e.u] + e.w;
          if (dist[e.u] !== Infinity && nd < dist[e.v]) { dist[e.v] = nd; prevE[e.v] = ei; changed = true; snap(2, `Pass ${pass + 1}: relax ${e.u}→${e.v} (${e.w}): ${nd} improves dist[${e.v}].`, 'A shorter path through u exists.', ei, pass + 1); }
          else snap(2, `Pass ${pass + 1}: ${e.u}→${e.v} (${e.w}): ${dist[e.u] === Infinity ? 'dist[u] is ∞, skip' : `${nd} ≥ ${dist[e.v] === Infinity ? '∞' : dist[e.v]}, no change`}.`, 'No improvement from this edge.', ei, pass + 1);
        });
        if (!changed) snap(1, `Pass ${pass + 1} changed nothing → distances are final (early stop).`, 'If a full pass changes nothing, later passes cannot either.', undefined, pass + 1);
      }
      let neg = false;
      for (const [ei, e] of g.edges.entries()) if (dist[e.u] !== Infinity && dist[e.u] + e.w < dist[e.v]) { neg = true; snap(3, `Extra pass: ${e.u}→${e.v} can still be relaxed → NEGATIVE CYCLE reachable!`, 'Distances would keep decreasing forever.', ei, V); break; }
      if (!neg) snap(3, `No edge can be relaxed any more: no negative cycle. Final distances: ${g.nodes.map((x) => x + '=' + (dist[x] === Infinity ? '∞' : dist[x])).join(', ')}.`, 'The V-th pass found nothing to improve.', undefined, pass);
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.stats({ Pass: step.view.pass ?? 0 })]),
  });

  /* ───────────────────────── Floyd-Warshall ───────────────────────── */
  register({
    id: 'floyd-w', group: 'DSA', section: GR, title: 'Floyd-Warshall (All-Pairs Shortest Paths)',
    blurb: 'Dynamic programming over intermediate nodes: can i→j be shorter by going through k?',
    inputs: [eIn('A-B:3, A-D:7, B-A:8, B-C:2, C-A:5, C-D:1, D-A:2', true), dirIn(true)],
    pseudo: () => ['d[i][j] = edge weight (∞ if none), d[i][i] = 0', 'for k in nodes:', '  for i in nodes: for j in nodes:', '    if d[i][k] + d[k][j] < d[i][j]: d[i][j] = d[i][k] + d[k][j]'],
    viva: [{ q: 'What is the time complexity of Floyd-Warshall and when is it preferable?', a: 'O(V^3) good for dense graphs and all pairs shortest paths and handles negative edges but not negative cycles' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: p.directed, weight: 'req', negative: true, max: 6 }), n = g.nodes.length, idx = Object.fromEntries(g.nodes.map((x, i) => [x, i])), sp = stepper(500);
      const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
      g.edges.forEach((e) => { d[idx[e.u]][idx[e.v]] = Math.min(d[idx[e.u]][idx[e.v]], e.w); if (!g.directed) d[idx[e.v]][idx[e.u]] = Math.min(d[idx[e.v]][idx[e.u]], e.w); });
      const snap = (line, msg, why, k, cell) => sp.push(line, msg, why, { d: d.map((r) => r.slice()), k, cell, nodes: g.nodes }, { k: k === undefined ? '—' : g.nodes[k], matrix: d.map((r) => r.map((x) => (x === Infinity ? '∞' : x)).join(' ')) });
      snap(0, 'Initial matrix: direct edge weights, 0 on the diagonal, ∞ if no edge.', 'Paths with no intermediate nodes.');
      for (let k = 0; k < n; k++) {
        snap(1, `Allow ${g.nodes[k]} as an intermediate node.`, 'After round k, all paths using nodes up to k are optimal.', k);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const via = d[i][k] + d[k][j]; if (via < d[i][j]) { const old = d[i][j]; d[i][j] = via; snap(3, `d[${g.nodes[i]}][${g.nodes[j]}] improved: ${g.nodes[i]}→${g.nodes[k]}→${g.nodes[j]} = ${via} < ${old === Infinity ? '∞' : old}.`, 'Going through k is shorter than the best known path.', k, [i, j]); } }
      }
      const negc = d.some((r, i) => r[i] < 0);
      snap(3, negc ? 'A diagonal entry is negative → negative cycle exists.' : 'Done: d[i][j] holds the shortest distance between every pair.', negc ? 'A node can reach itself with negative cost.' : 'All intermediate nodes were tried.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, N = v.nodes;
      root.append(D.grid({ corner: 'from \\ to', cols: N, rows: N, cell: (i, j) => (v.d[i][j] === Infinity ? '∞' : v.d[i][j]), mark: (i, j) => (v.cell && v.cell[0] === i && v.cell[1] === j ? 'cur' : v.k !== undefined && (i === v.k || j === v.k) ? 'ref' : '') }),
        h('p', { class: 'muted' }, v.k === undefined ? '' : `Blue = row/column of intermediate node ${N[v.k]} · Yellow = improved cell.`));
    },
  });

  /* ───────────────────────── Topological sort ───────────────────────── */
  register({
    id: 'topo', group: 'DSA', section: GR, title: 'Topological Sort (Kahn)',
    blurb: 'Order a DAG so every edge goes forward: repeatedly remove nodes with in-degree 0.',
    inputs: [eIn('A-C, B-C, C-D, B-E, D-F, E-F')],
    pseudo: () => ['compute in-degree of every node', 'queue = all nodes with in-degree 0', 'while queue not empty:', '  u = dequeue(); append u to order', '  for each edge u→v: indeg[v]--; if indeg[v] == 0: enqueue v', 'if order has fewer than V nodes → cycle (no topological order)'],
    viva: [{ q: 'When does a topological ordering exist and how does Kahn detect failure?', a: 'only for a directed acyclic graph if the output has fewer nodes than the graph then there is a cycle' }, { q: 'Give an application of topological sorting.', a: 'task scheduling build dependencies course prerequisites' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: true }), adj = adjacency(g), pos = circlePos(g.nodes), sp = stepper(300), indeg = Object.fromEntries(g.nodes.map((x) => [x, 0]));
      g.edges.forEach((e) => indeg[e.v]++); const queue = g.nodes.filter((x) => !indeg[x]), order = [], nodeCls = {}, edgeCls = {};
      queue.forEach((x) => (nodeCls[x] = 'pending'));
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { g, pos, nodeCls: { ...nodeCls }, edgeCls: { ...edgeCls }, nodeSub: Object.fromEntries(g.nodes.map((x) => [x, 'in=' + indeg[x]])), queue: queue.slice(), order: order.slice(), ...extra }, { inDegree: { ...indeg }, queue: queue.slice(), order: order.slice() });
      snap(1, `In-degrees computed. Nodes with in-degree 0: ${queue.join(', ') || 'none'}.`, 'These have no unmet dependencies.');
      while (queue.length) {
        const u = queue.shift(); order.push(u); nodeCls[u] = 'cur'; snap(3, `Dequeue ${u} → append to order.`, 'A node with no remaining prerequisites can go next.');
        for (const { to, ei } of adj[u]) { indeg[to]--; edgeCls[ei] = 'done'; if (!indeg[to]) { queue.push(to); nodeCls[to] = 'pending'; } snap(4, `Remove edge ${u}→${to}: in-degree[${to}] = ${indeg[to]}${indeg[to] ? '' : ' → enqueue'}.`, 'Removing u frees its dependants.'); }
        nodeCls[u] = 'done';
      }
      snap(5, order.length === g.nodes.length ? `Topological order: ${order.join(' → ')}.` : `Cycle detected! Only ${order.length} of ${g.nodes.length} nodes could be ordered.`, order.length === g.nodes.length ? 'Every node was placed after its prerequisites.' : 'Nodes in a cycle never reach in-degree 0.');
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.chips('Queue:', step.view.queue), D.chips('Order:', step.view.order)]),
  });

  /* ───────────────────────── Union-Find ───────────────────────── */
  register({
    id: 'dsu', group: 'DSA', section: GR, title: 'Union-Find (Disjoint Set Union)',
    blurb: 'Track connected components with union by rank and path compression.',
    inputs: [
      { key: 'n', label: 'Elements (2–12)', type: 'number', value: 8, min: 2, max: 12 },
      { key: 'ops', label: 'Operations (union a b, find a, connected a b)', type: 'text', value: 'union 0 1, union 2 3, union 1 3, union 4 5, union 6 7, union 5 7, union 3 7, find 0, connected 0 4' },
      { key: 'rank', label: 'Union by rank', type: 'checkbox', value: true },
      { key: 'comp', label: 'Path compression', type: 'checkbox', value: true },
    ],
    pseudo: () => ['find(x): if parent[x] ≠ x: parent[x] = find(parent[x])  (path compression)', 'union(a, b): ra = find(a); rb = find(b); if ra == rb: already connected', '  attach the lower-rank root under the higher-rank root', 'connected(a, b) ⇔ find(a) == find(b)'],
    viva: [{ q: 'What do union by rank and path compression achieve?', a: 'keep trees shallow giving near constant amortized time inverse ackermann per operation' }, { q: 'Where is union-find used?', a: "kruskal's minimum spanning tree connected components cycle detection in undirected graphs" }],
    build(p) {
      const n = Math.max(2, Math.min(12, Math.round(p.n))), par = Array.from({ length: n }, (_, i) => i), rk = Array(n).fill(0), ops = parseOps(p.ops, 25), sp = stepper(500);
      const snap = (line, msg, why, hl = []) => sp.push(line, msg, why, { par: par.slice(), rk: rk.slice(), hl, n }, { parent: par.slice(), rank: rk.slice(), components: par.filter((x, i) => x === i).length });
      const find = (x, label) => {
        const path = [x]; while (par[path.at(-1)] !== path.at(-1)) path.push(par[path.at(-1)]);
        const r = path.at(-1); snap(0, `${label}: follow parents ${path.join(' → ')}; root = ${r}.`, 'The root represents the whole set.', path);
        if (p.comp && path.length > 2) { path.slice(0, -1).forEach((v) => (par[v] = r)); snap(0, `Path compression: point ${path.slice(0, -1).join(', ')} directly at ${r}.`, 'Flatten the tree so future finds are faster.', [r]); }
        return r;
      };
      snap(0, `${n} singleton sets.`, 'Every element starts as its own root.');
      ops.forEach((o) => {
        need(o); const a = o.args[0], b = o.args[1]; if ([a, b].some((x) => x !== undefined && (!(x >= 0 && x < n)))) throw new Error(`Elements must be between 0 and ${n - 1}.`);
        if (o.op === 'find') { const r = find(a, `find(${a})`); snap(0, `find(${a}) = ${r}.`, 'Representative of the set.', [r]); }
        else if (o.op === 'union' || o.op === 'insert') {
          need(o, 2); const ra = find(a, `union(${a},${b}): find(${a})`), rb = find(b, `find(${b})`);
          if (ra === rb) { snap(1, `Same root ${ra}: ${a} and ${b} are already connected.`, 'Union of elements in the same set changes nothing.', [ra]); return; }
          let big = ra, small = rb; if (p.rank && rk[ra] < rk[rb]) { big = rb; small = ra; } par[small] = big; if (p.rank && rk[ra] === rk[rb]) rk[big]++;
          snap(2, `Link root ${small} under root ${big}${p.rank ? ' (lower rank goes under higher rank)' : ''}.`, p.rank ? 'Attaching the shallower tree keeps the height small.' : 'Plain union attaches one root to the other.', [big, small]);
        } else if (o.op === 'connected') { need(o, 2); const ra = find(a, `connected(${a},${b}): find(${a})`), rb = find(b, `find(${b})`); snap(3, ra === rb ? `Yes: both have root ${ra}.` : `No: roots ${ra} and ${rb} differ.`, 'Elements are connected iff they share a root.', [ra, rb]); }
        else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, marks = {}; v.hl.forEach((x) => (marks[x] = 'cmp'));
      const mk = (i) => ({ id: i, label: i, cls: marks[i] || '', sub: 'r' + v.rk[i], children: v.par.map((q, j) => (q === i && j !== i ? mk(j) : null)).filter(Boolean) });
      root.append(D.cells(Array.from({ length: v.n }, (_, i) => i), {}, {}, 'element'), D.cells(v.par, marks, {}, 'parent[]'), D.treeSvg(v.par.map((q, i) => (q === i ? mk(i) : null)).filter(Boolean), { kind: 'nary', maxWidth: 1.2 }));
    },
  });

  /* ───────────────────────── Kruskal ───────────────────────── */
  register({
    id: 'kruskal', group: 'DSA', section: GR, title: "Kruskal's Minimum Spanning Tree",
    blurb: 'Sort edges by weight; add each edge unless it would create a cycle (checked with union-find).',
    inputs: [eIn('A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3', true)],
    pseudo: () => ['sort edges by weight', 'for each edge (u, v, w) in order:', '  if find(u) ≠ find(v): accept the edge; union(u, v)', '  else: reject (it would form a cycle)', 'stop when V-1 edges are chosen'],
    viva: [{ q: "How does Kruskal's algorithm detect cycles and what is its complexity?", a: 'union find if both endpoints share a root the edge makes a cycle O(E log E) dominated by sorting' }, { q: "Compare Kruskal's and Prim's algorithms.", a: 'kruskal sorts edges and suits sparse graphs prim grows one tree from a node using a priority queue and suits dense graphs' }],
    build(p) {
      const g = parseGraph(p.edges, { weight: 'req' }), pos = circlePos(g.nodes), sp = stepper(300), par = Object.fromEntries(g.nodes.map((x) => [x, x]));
      const find = (x) => (par[x] === x ? x : (par[x] = find(par[x]))), order = g.edges.map((e, i) => i).sort((a, b) => g.edges[a].w - g.edges[b].w || a - b), edgeCls = {}; let total = 0, taken = 0;
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { g, pos, edgeCls: { ...edgeCls }, nodeCls: {}, nodeSub: {}, sorted: order.map((i) => `${g.edges[i].u}${g.edges[i].v}:${g.edges[i].w}`), ...extra }, { mstWeight: total, edgesChosen: taken, components: g.nodes.filter((x) => find(x) === x).length });
      snap(0, `Edges sorted by weight: ${order.map((i) => `${g.edges[i].u}-${g.edges[i].v}(${g.edges[i].w})`).join(', ')}.`, 'Greedy: always consider the cheapest remaining edge.');
      for (const ei of order) {
        if (taken === g.nodes.length - 1) break; const e = g.edges[ei], ru = find(e.u), rv = find(e.v);
        if (ru !== rv) { par[ru] = rv; edgeCls[ei] = 'tree'; total += e.w; taken++; snap(2, `Edge ${e.u}-${e.v} (${e.w}): different components → ACCEPT. Total = ${total}.`, 'The edge connects two separate trees without forming a cycle.', {}); }
        else { edgeCls[ei] = 'bad'; snap(3, `Edge ${e.u}-${e.v} (${e.w}): both ends already connected → REJECT (cycle).`, 'Adding it would create a cycle.'); }
      }
      snap(4, `MST complete: ${taken} edges, total weight ${total}${taken < g.nodes.length - 1 ? ' (graph is disconnected: this is a spanning forest)' : ''}.`, 'A spanning tree of V nodes has V-1 edges.');
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.chips('Sorted edges:', step.view.sorted)]),
  });

  /* ───────────────────────── Prim ───────────────────────── */
  register({
    id: 'prim', group: 'DSA', section: GR, title: "Prim's Minimum Spanning Tree",
    blurb: 'Grow one tree from a start node, always adding the cheapest edge that leaves the tree.',
    inputs: [eIn('A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3', true), srcIn],
    pseudo: () => ['tree = {start}', 'while tree ≠ all nodes:', '  candidates = edges with exactly one end in the tree', '  pick the cheapest candidate; add its new node to the tree'],
    viva: [{ q: "What is Prim's complexity with a binary heap?", a: 'O(E log V)' }, { q: "Why is Prim's algorithm correct?", a: 'cut property the cheapest edge crossing any cut belongs to some minimum spanning tree' }],
    build(p) {
      const g = parseGraph(p.edges, { weight: 'req' }), src = checkSrc(g, p.source), pos = circlePos(g.nodes), sp = stepper(300), inT = new Set([src]), edgeCls = {}; let total = 0;
      const snap = (line, msg, why) => sp.push(line, msg, why, { g, pos, edgeCls: { ...edgeCls }, nodeCls: Object.fromEntries([...inT].map((x) => [x, 'done'])), nodeSub: {} }, { tree: [...inT], mstWeight: total });
      snap(0, `Start the tree at ${src}.`, 'Any node can be the root of the MST.');
      for (;;) {
        const cand = g.edges.map((e, i) => ({ e, i })).filter(({ e }) => inT.has(e.u) !== inT.has(e.v)); if (!cand.length) break;
        const best = cand.reduce((a, b) => (b.e.w < a.e.w ? b : a)), nw = inT.has(best.e.u) ? best.e.v : best.e.u;
        cand.forEach(({ i }) => { if (!edgeCls[i]) edgeCls[i] = 'relax'; });
        sp.push(2, `Candidate edges: ${cand.map(({ e }) => `${e.u}-${e.v}(${e.w})`).join(', ')} → cheapest is ${best.e.u}-${best.e.v} (${best.e.w}).`, 'Only edges crossing from the tree to outside are candidates.', { g, pos, edgeCls: { ...edgeCls, [best.i]: 'cur' }, nodeCls: Object.fromEntries([...inT].map((x) => [x, 'done'])), nodeSub: {} }, { tree: [...inT], mstWeight: total });
        cand.forEach(({ i }) => { if (edgeCls[i] === 'relax') delete edgeCls[i]; });
        inT.add(nw); edgeCls[best.i] = 'tree'; total += best.e.w; snap(3, `Add ${nw} via ${best.e.u}-${best.e.v}. Total = ${total}.`, 'The cheapest crossing edge is always safe (cut property).');
      }
      snap(1, `MST done: weight ${total}${inT.size < g.nodes.length ? ` — only ${inT.size} of ${g.nodes.length} nodes reachable from ${src}` : ''}.`, 'No edges leave the tree any more.');
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step),
  });

  /* ───────────────────────── Tarjan SCC ───────────────────────── */
  register({
    id: 'scc', group: 'DSA', section: GR, title: "Strongly Connected Components (Tarjan)",
    blurb: 'One DFS with discovery times and low-links; when low = disc the node is the root of an SCC.',
    inputs: [eIn('A-B, B-C, C-A, B-D, D-E, E-F, F-D, G-F, G-H, H-G')],
    pseudo: () => ['dfs(u): disc[u] = low[u] = ++t; push u on stack', '  for edge u→v:', '    unvisited: dfs(v); low[u] = min(low[u], low[v])', '    v on stack: low[u] = min(low[u], disc[v])', '  if low[u] == disc[u]: pop the stack down to u → one SCC'],
    viva: [{ q: 'What is a strongly connected component and what is Tarjan\'s complexity?', a: 'maximal set of vertices where every vertex can reach every other in a directed graph linear time O(V + E)' }, { q: 'What does low-link mean?', a: 'the smallest discovery time reachable from the node through its dfs subtree using at most one back edge to a node on the stack' }],
    build(p) {
      const g = parseGraph(p.edges, { directed: true }), adj = adjacency(g), pos = circlePos(g.nodes), sp = stepper(500), disc = {}, low = {}, stack = [], onS = new Set(), sccs = [], color = {}, edgeCls = {}; let t = 0;
      const snap = (line, msg, why, cur) => sp.push(line, msg, why, { g, pos, nodeCls: Object.fromEntries(g.nodes.map((x) => [x, cur === x ? 'cur' : onS.has(x) ? 'pending' : ''])), nodeColor: { ...color }, edgeCls: { ...edgeCls }, nodeSub: Object.fromEntries(g.nodes.filter((x) => disc[x]).map((x) => [x, `${disc[x]}/${low[x]}`])), stack: stack.slice(), sccs: sccs.map((s) => s.join('')) }, { disc: { ...disc }, low: { ...low }, stack: stack.slice(), sccs: sccs.map((s) => s.slice()) });
      snap(0, 'Labels show disc/low. Start DFS from every unvisited node.', 'Tarjan needs only one DFS pass.');
      const dfs = (u) => {
        disc[u] = low[u] = ++t; stack.push(u); onS.add(u); snap(0, `Discover ${u}: disc = low = ${t}; push on stack.`, 'A new node starts with its own discovery time as low-link.', u);
        for (const { to, ei } of adj[u]) {
          if (!disc[to]) { edgeCls[ei] = 'tree'; dfs(to); low[u] = Math.min(low[u], low[to]); snap(2, `Back at ${u}: low = min(low[${u}], low[${to}]) = ${low[u]}.`, 'A child that reaches an earlier node pulls the parent\'s low-link down.', u); }
          else if (onS.has(to)) { low[u] = Math.min(low[u], disc[to]); edgeCls[ei] = 'relax'; snap(3, `Edge ${u}→${to}: ${to} is on the stack → low[${u}] = ${low[u]}.`, 'An edge to a node still on the stack means they share a cycle.', u); }
          else snap(3, `Edge ${u}→${to}: ${to} already in a finished SCC → ignore.`, 'Edges to completed components cannot form a larger SCC.', u);
        }
        if (low[u] === disc[u]) { const comp = []; let w; do { w = stack.pop(); onS.delete(w); comp.push(w); color[w] = PALETTE[sccs.length % PALETTE.length]; } while (w !== u); sccs.push(comp); snap(4, `low[${u}] == disc[${u}] → ${u} is an SCC root. Pop SCC {${comp.join(', ')}}.`, 'Everything above u on the stack belongs to its component.', u); }
      };
      g.nodes.forEach((x) => { if (!disc[x]) dfs(x); });
      snap(4, `Done: ${sccs.length} strongly connected component(s): ${sccs.map((s) => '{' + s.join(',') + '}').join(' ')}.`, 'Each colour is one SCC.', null);
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => gRender(root, step, [D.vstack('DFS stack', step.view.stack), D.chips('SCCs found:', step.view.sccs.map((s) => '{' + s.split('').join(',') + '}'))]),
  });

  /* ───────────────────────── A* / grid pathfinding ───────────────────────── */
  register({
    id: 'astar', group: 'DSA', section: GR, title: 'A* Search (grid pathfinding)',
    blurb: 'Best-first search using f = g + h (Manhattan heuristic). Compare with Dijkstra (h = 0) and greedy best-first.',
    inputs: [
      { key: 'grid', label: 'Grid rows separated by "/" (S start, G goal, # wall)', type: 'text', value: 'S..#..../.#.#.##./.#...#../.###.#.#/....#..G' },
      { key: 'algo', label: 'Algorithm', type: 'select', value: 'astar', options: [['astar', 'A*  (f = g + h)'], ['dijkstra', 'Dijkstra (f = g)'], ['greedy', 'Greedy best-first (f = h)']] },
    ],
    pseudo: (p) => ['open = {start}; g[start] = 0', 'while open not empty:', `  cur = node in open with the lowest ${{ astar: 'f = g + h', dijkstra: 'g', greedy: 'h' }[p.algo]}`, '  if cur is the goal: rebuild the path via parents', '  move cur to closed; for each neighbour: if g via cur is better → update g, parent, add to open'],
    viva: [{ q: 'What makes a heuristic admissible and why does A* need it?', a: 'it never overestimates the true remaining cost which guarantees the first path found to the goal is optimal' }, { q: 'How does A* relate to Dijkstra and greedy best-first search?', a: 'with h equal zero a star is dijkstra with only h it is greedy best first which is fast but not optimal' }],
    build(p) {
      const rows = String(p.grid).split(/[\/\n]/).map((r) => r.trim()).filter(Boolean); if (!rows.length || rows.length > 12) throw new Error('Use 1–12 rows.');
      const W = rows[0].length; if (W > 14 || rows.some((r) => r.length !== W)) throw new Error('All rows must have the same length (≤ 14).');
      let S, G; rows.forEach((r, i) => [...r].forEach((c, j) => { if (c === 'S') S = [i, j]; else if (c === 'G') G = [i, j]; else if (c !== '.' && c !== '#') throw new Error(`Unknown character "${c}". Use . # S G`); }));
      if (!S || !G) throw new Error('The grid needs exactly one S and one G.');
      const R = rows.length, key = (r, c) => r * W + c, hf = (r, c) => (p.algo === 'dijkstra' ? 0 : Math.abs(r - G[0]) + Math.abs(c - G[1])), sp = stepper(500);
      const gs = { [key(...S)]: 0 }, par = {}, open = new Set([key(...S)]), closed = new Set(); let path = [];
      const fOf = (k) => (p.algo === 'greedy' ? hf(Math.floor(k / W), k % W) : gs[k] + hf(Math.floor(k / W), k % W));
      const snap = (line, msg, why, cur) => sp.push(line, msg, why, { rows, R, W, open: new Set(open), closed: new Set(closed), cur, path: path.slice(), f: Object.fromEntries([...open].map((k) => [k, fOf(k)])) }, { expanded: closed.size, openSize: open.size, current: cur === undefined ? '—' : `(${Math.floor(cur / W)},${cur % W})`, pathLength: path.length ? path.length - 1 : '—' });
      snap(0, `Start at (${S}), goal at (${G}). Numbers in open cells are f-values.`, 'The open set holds frontier nodes waiting to be expanded.');
      while (open.size) {
        const cur = [...open].reduce((a, b) => (fOf(b) < fOf(a) || (fOf(b) === fOf(a) && hf(Math.floor(b / W), b % W) < hf(Math.floor(a / W), a % W)) ? b : a)); const [cr, cc] = [Math.floor(cur / W), cur % W];
        open.delete(cur); closed.add(cur);
        if (cur === key(...G)) { for (let k = cur; k !== undefined; k = par[k]) path.unshift(k); snap(3, `Goal reached! Path length ${path.length - 1}, ${closed.size} nodes expanded.`, p.algo === 'greedy' ? 'Greedy may find a longer path than optimal.' : 'The first time the goal is popped, its path is optimal (admissible heuristic).', cur); return { steps: sp.steps, meta: {} }; }
        const upd = [];
        for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
          const nr = cr + dr, nc = cc + dc, nk = key(nr, nc); if (nr < 0 || nc < 0 || nr >= R || nc >= W || rows[nr][nc] === '#' || closed.has(nk)) continue;
          const ng = gs[cur] + 1; if (gs[nk] === undefined || ng < gs[nk]) { gs[nk] = ng; par[nk] = cur; open.add(nk); upd.push(`(${nr},${nc}) g=${ng} h=${hf(nr, nc)}`); }
        }
        snap(4, `Expand (${cr},${cc}) [g=${gs[cur]}, h=${hf(cr, cc)}, f=${gs[cur] + hf(cr, cc)}]. ${upd.length ? 'Update: ' + upd.join('; ') + '.' : 'No new neighbours.'}`, `Chosen because it has the lowest ${{ astar: 'f = g + h', dijkstra: 'g', greedy: 'h' }[p.algo]} in the open set.`, cur);
      }
      snap(1, 'Open set is empty: the goal is unreachable.', 'Every reachable cell was expanded.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, onPath = new Set(v.path);
      root.append(D.board(v.rows.map((r) => [...r]), (i, j, ch) => { const k = i * v.W + j; if (ch === 'S') return { cls: 'start', text: 'S' }; if (ch === 'G') return { cls: 'goal', text: 'G' }; if (ch === '#') return { cls: 'wall' }; if (onPath.has(k)) return { cls: 'path' }; if (k === v.cur) return { cls: 'try', text: v.f[k] ?? '' }; if (v.open.has(k)) return { cls: 'open', text: v.f[k] }; if (v.closed.has(k)) return { cls: 'closed' }; return {}; }),
        h('p', { class: 'muted' }, 'Blue = open (f shown) · Purple = closed · Yellow = being expanded · Green = final path.'));
    },
  });
})();
