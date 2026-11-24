/* dsa-tree.js — BST, traversals, heap, trie, segment tree, Fenwick tree, red-black tree, B/B+ tree, Huffman. */
(function () {
  'use strict';
  const { h, clamp, register } = window.CSViz;
  const D = window.DSA, { ints, stepper, parseOps } = D;
  const TR = 'Trees';
  const need = (o, n = 1) => { if (o.args.length < n) throw new Error(`"${o.raw}" needs ${n} argument(s).`); };
  const treeRender = (root, step, extra) => root.append(D.treeSvg([step.view.tree], { kind: step.view.kind || 'binary' }), ...(extra || []));

  /* ───────────────────────── BST ───────────────────────── */
  register({
    id: 'bst', group: 'DSA', section: TR, title: 'Binary Search Tree (insert / search / delete)',
    blurb: 'Run any mix of insert, search and delete operations; delete shows all three cases.',
    inputs: [{ key: 'ops', label: 'Operations (insert k, search k, delete k)', type: 'text', value: 'insert 50, insert 30, insert 70, insert 20, insert 40, insert 60, insert 80, search 60, delete 20, delete 30, delete 50' }],
    pseudo: () => ['insert(k): go left if k < node else right; attach at the empty spot', 'search(k): same walk until equal or null', 'delete leaf: remove it', 'delete one child: replace node by its child', 'delete two children: copy inorder successor, delete the successor'],
    viva: [{ q: 'How are the three delete cases handled in a BST?', a: 'leaf just remove one child replace node with child two children replace with inorder successor smallest in right subtree then delete that successor' }, { q: 'What are the average and worst case complexities of BST operations?', a: 'average O(log n) worst O(n) when the tree degenerates into a chain' }],
    build(p) {
      const ops = parseOps(p.ops, 30), sp = stepper(800); let root = null, count = 0;
      const view = (hl) => { const mk = (n) => (n ? { id: n.key, label: n.key, cls: hl[n.key] || '', left: mk(n.left), right: mk(n.right) } : null); return { tree: mk(root) }; };
      const snap = (line, msg, why, hl = {}) => sp.push(line, msg, why, view(hl), { nodes: count, root: root ? root.key : '—' });
      snap(0, 'Empty tree.', 'Initial state.');
      const find = (k, line, verb) => {
        let cur = root, par = null;
        while (cur) {
          if (k === cur.key) return { cur, par };
          snap(line, `${verb} ${k}: compare with ${cur.key} → go ${k < cur.key ? 'left' : 'right'}.`, 'BST order: smaller left, larger right.', { [cur.key]: 'cur' });
          par = cur; cur = k < cur.key ? cur.left : cur.right;
        }
        return { cur: null, par };
      };
      const setChild = (par, old, nw) => { if (!par) root = nw; else if (par.left === old) par.left = nw; else par.right = nw; };
      ops.forEach((o) => {
        need(o); const k = o.args[0];
        if (o.op === 'insert') {
          const { cur, par } = find(k, 0, 'insert');
          if (cur) { snap(0, `${k} already exists; ignored.`, 'Duplicates are not stored.', { [k]: 'cur' }); return; }
          const nn = { key: k, left: null, right: null }; if (!par) root = nn; else if (k < par.key) par.left = nn; else par.right = nn; count++;
          snap(0, `Insert ${k} as a new leaf.`, 'We reached an empty spot.', { [k]: 'new' });
        } else if (o.op === 'search') {
          const { cur } = find(k, 1, 'search');
          snap(1, cur ? `Found ${k}!` : `${k} is not in the tree.`, cur ? 'Keys matched.' : 'We ran off the tree.', cur ? { [k]: 'new' } : {});
        } else if (o.op === 'delete') {
          const { cur, par } = find(k, 2, 'delete');
          if (!cur) { snap(2, `${k} not found; nothing to delete.`, 'The walk ended at null.'); return; }
          if (!cur.left && !cur.right) { snap(2, `${k} is a leaf: simply remove it.`, 'Case 1: no children.', { [k]: 'bad' }); setChild(par, cur, null); count--; snap(2, `Removed ${k}.`, 'Parent link cleared.'); }
          else if (!cur.left || !cur.right) { const ch = cur.left || cur.right; snap(3, `${k} has one child (${ch.key}): replace ${k} with it.`, 'Case 2: the child takes its parent\'s place.', { [k]: 'bad', [ch.key]: 'new' }); setChild(par, cur, ch); count--; snap(3, `Removed ${k}; ${ch.key} moved up.`, 'Parent now points to the child.'); }
          else {
            snap(4, `${k} has two children: find its inorder successor (leftmost node of the right subtree).`, 'Case 3: replace with the next larger key.', { [k]: 'bad' });
            let sc = cur.right, sp2 = cur; while (sc.left) { snap(4, `Successor search: ${sc.key} has a left child, go left.`, 'The smallest key is the leftmost.', { [k]: 'bad', [sc.key]: 'cur' }); sp2 = sc; sc = sc.left; }
            snap(4, `Successor is ${sc.key}. Copy it into the node holding ${k}.`, 'The successor keeps BST order.', { [k]: 'bad', [sc.key]: 'new' });
            cur.key = sc.key; setChild(sp2 === cur ? cur : sp2, sc, sc.right); if (sp2 === cur) cur.right = sc.right; count--;
            snap(4, `Remove the old successor node; tree is valid again.`, 'The successor had no left child, so it was easy to remove.', { [cur.key]: 'new' });
          }
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => treeRender(root, step, [h('p', { class: 'muted' }, 'Yellow = visiting · Green = new/moved · Red = being deleted.')]),
  });

  /* ───────────────────────── Traversals ───────────────────────── */
  register({
    id: 'traverse', group: 'DSA', section: TR, title: 'Tree Traversals (in / pre / post / level order)',
    blurb: 'Enter the tree in level order (use null for gaps) and watch each traversal with its call stack or queue.',
    inputs: [
      { key: 'tree', label: 'Level-order tree (null = empty)', type: 'text', value: '1, 2, 3, 4, 5, null, 6, 7' },
      { key: 'mode', label: 'Traversal', type: 'select', value: 'in', options: [['in', 'Inorder (L, N, R)'], ['pre', 'Preorder (N, L, R)'], ['post', 'Postorder (L, R, N)'], ['level', 'Level order (BFS)']] },
    ],
    pseudo: (p) => ({
      in: ['inorder(n): if n is null return', '  inorder(n.left)', '  visit(n)', '  inorder(n.right)'],
      pre: ['preorder(n): if n is null return', '  visit(n)', '  preorder(n.left)', '  preorder(n.right)'],
      post: ['postorder(n): if n is null return', '  postorder(n.left)', '  postorder(n.right)', '  visit(n)'],
      level: ['queue = [root]', 'while queue not empty:', '  n = dequeue(); visit(n)', '  enqueue n.left, n.right'],
    })[p.mode],
    viva: [{ q: 'What does inorder traversal of a BST produce?', a: 'keys in sorted ascending order' }, { q: 'Which traversal would you use to copy a tree and which to delete it?', a: 'preorder to copy because parent before children postorder to delete because children before parent' }],
    build(p) {
      const toks = String(p.tree).split(/[\s,;]+/).filter(Boolean); if (toks.length > 20) throw new Error('Use at most 20 entries.');
      const val = (t) => (/^(null|#|-|none)$/i.test(t) ? null : t);
      if (val(toks[0]) === null) throw new Error('The root cannot be null.');
      const nodes = []; const mk = (t) => { const v = val(t); return v === null ? null : { id: nodes.length, label: v, left: null, right: null, _n: nodes.push(1) }; };
      const root = mk(toks[0]); const q = [root]; let i = 1;
      while (q.length && i < toks.length) { const n = q.shift(); if (!n) continue; n.left = i < toks.length ? mk(toks[i++]) : null; n.right = i < toks.length ? mk(toks[i++]) : null; if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
      const sp = stepper(300), out = [], stack = [], seen = new Set();
      const view = (cur, extra) => { const cl = (n) => (n ? { id: n.id, label: n.label, cls: n.id === cur ? 'cur' : seen.has(n.id) ? 'visited' : stack.includes(n) ? 'pending' : '', left: cl(n.left), right: cl(n.right) } : null); return { tree: cl(root), out: out.slice(), stack: stack.map((n) => n.label), ...extra }; };
      sp.push(0, `Start ${p.mode}order traversal at the root ${root.label}.`, 'Initial state.', view(-1), { output: [] });
      const visit = (n, line, hint) => { out.push(n.label); seen.add(n.id); sp.push(line, `Visit ${n.label} → output ${out.join(', ')}.`, hint, view(n.id), { output: out.slice() }); };
      if (p.mode === 'level') {
        const qq = [root]; while (qq.length) { const n = qq.shift(); visit(n, 2, 'Level order visits nodes level by level using a FIFO queue.'); [n.left, n.right].forEach((c) => c && qq.push(c)); stack.length = 0; qq.forEach((x) => stack.push(x)); sp.push(3, `Enqueue children of ${n.label}. Queue: [${qq.map((x) => x.label).join(', ')}].`, 'Children wait their turn in the queue.', view(-1, { qlabel: 'Queue' }), { output: out.slice(), queue: qq.map((x) => x.label) }); }
      } else {
        const rec = (n) => {
          if (!n) return;
          stack.push(n); sp.push(0, `Call ${p.mode}order(${n.label}).`, 'Recursion goes one level deeper (pushed on the call stack).', view(n.id), { output: out.slice(), callStack: stack.map((x) => x.label) });
          if (p.mode === 'pre') visit(n, 1, 'Preorder visits the node before its children.');
          rec(n.left); if (p.mode === 'in') visit(n, 2, 'Inorder visits the node between its left and right subtrees.'); rec(n.right);
          if (p.mode === 'post') visit(n, 3, 'Postorder visits the node after both children.');
          stack.pop();
        };
        rec(root);
      }
      sp.push(0, `Traversal complete: ${out.join(', ')}.`, 'Every node has been visited exactly once.', view(-1), { output: out.slice() });
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => root.append(D.treeSvg([step.view.tree]), D.chips('Output:', step.view.out), D.vstack(step.view.qlabel || 'Call stack', step.view.stack)),
  });

  /* ───────────────────────── Heap ───────────────────────── */
  register({
    id: 'heap', group: 'DSA', section: TR, title: 'Binary Heap / Priority Queue',
    blurb: 'Min- or max-heap stored in an array. Insert sifts up; extract sifts down; build heapifies bottom-up.',
    inputs: [
      { key: 'kind', label: 'Heap type', type: 'select', value: 'min', options: [['min', 'Min-heap'], ['max', 'Max-heap']] },
      { key: 'ops', label: 'Operations (insert x, extract, peek, build a b c…)', type: 'text', value: 'insert 8, insert 3, insert 10, insert 1, insert 6, extract, extract, build 9 4 7 1 2 5' },
    ],
    pseudo: () => ['insert(x): append at the end, then sift UP while it beats its parent', 'extract(): take the root, move the last item to the root, sift DOWN', 'sift down: swap with the better child until the heap order holds', 'build(a): for i = n/2-1 down to 0: sift down(i)', 'parent(i) = (i-1)/2; children 2i+1, 2i+2'],
    viva: [{ q: 'Why is building a heap O(n) while n inserts take O(n log n)?', a: 'bottom up heapify does little work for the many nodes near the leaves most nodes sift down only a few levels' }, { q: 'How are parent and child indices computed in an array heap?', a: 'parent (i-1)/2 left child 2i+1 right child 2i+2' }],
    build(p) {
      const min = p.kind === 'min', better = (a, b) => (min ? a < b : a > b), ops = parseOps(p.ops, 30), sp = stepper(800); let H = [];
      const snap = (line, msg, why, marks = {}) => sp.push(line, msg, why, { H: H.slice(), marks }, { heap: H.slice(), size: H.length, root: H[0] ?? '—' });
      const down = (i) => { for (;;) { const l = 2 * i + 1, r = l + 1; let b = i; if (l < H.length && better(H[l], H[b])) b = l; if (r < H.length && better(H[r], H[b])) b = r; snap(2, `Sift down ${H[i]} at index ${i}: children ${l < H.length ? H[l] : '—'}, ${r < H.length ? H[r] : '—'}.`, 'Compare with children.', { [i]: 'cmp', ...(l < H.length ? { [l]: 'cmp' } : {}), ...(r < H.length ? { [r]: 'cmp' } : {}) }); if (b === i) break; [H[i], H[b]] = [H[b], H[i]]; snap(2, `Swap with ${H[i]} (index ${b}).`, `The ${min ? 'smaller' : 'larger'} child moves up.`, { [i]: 'swap', [b]: 'swap' }); i = b; } };
      snap(0, `Empty ${p.kind}-heap.`, 'Initial state.');
      ops.forEach((o) => {
        if (o.op === 'insert') {
          need(o); H.push(o.args[0]); let i = H.length - 1; snap(0, `insert(${o.args[0]}): append at index ${i}.`, 'New items start at the first free leaf position.', { [i]: 'new' });
          while (i > 0) { const par = (i - 1) >> 1; if (better(H[i], H[par])) { [H[i], H[par]] = [H[par], H[i]]; snap(0, `${H[par]} ${min ? '<' : '>'} parent ${H[i]} → swap up.`, 'Heap order violated, so swap with the parent.', { [i]: 'swap', [par]: 'swap' }); i = par; } else { snap(0, `${H[i]} is not ${min ? 'smaller' : 'larger'} than parent ${H[par]} → stop.`, 'Heap order holds.', { [i]: 'done' }); break; } }
        } else if (o.op === 'extract' || o.op === 'pop') {
          if (!H.length) { snap(1, 'extract(): heap is empty.', 'Nothing to remove.'); return; }
          const top = H[0]; snap(1, `extract(): root ${top} is the ${min ? 'minimum' : 'maximum'}.`, 'The root always holds the best element.', { 0: 'bad' });
          const last = H.pop(); if (H.length) { H[0] = last; snap(1, `Move last item ${last} to the root.`, 'Keeps the tree complete.', { 0: 'cmp' }); down(0); }
          snap(1, `Extracted ${top}.`, 'Heap order restored.');
        } else if (o.op === 'peek') snap(1, `peek() → ${H[0] ?? 'empty'}.`, 'The root is the top priority.', { 0: 'done' });
        else if (o.op === 'build') {
          H = o.args.map(Number); if (H.some((x) => Number.isNaN(x))) throw new Error('build needs numbers.'); if (H.length > 15) throw new Error('Use at most 15 items.');
          snap(3, `build(${H.join(', ')}): array copied as-is (not yet a heap).`, 'Any array is a complete binary tree.');
          for (let i = (H.length >> 1) - 1; i >= 0; i--) { snap(3, `Heapify from index ${i}.`, 'Bottom-up: leaves are already heaps.', { [i]: 'sel' }); down(i); }
          snap(3, 'Heap built.', 'All sub-trees satisfy heap order.');
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(v.H.length ? D.treeSvg([D.heapTree(v.H, v.marks)]) : h('p', { class: 'muted' }, '(empty heap)'), D.cells(v.H.length ? v.H : [null], v.marks, {}, 'Array representation')); },
  });

  /* ───────────────────────── Trie ───────────────────────── */
  register({
    id: 'trie', group: 'DSA', section: TR, title: 'Trie (Prefix Tree)',
    blurb: 'Insert words letter by letter; search whole words, test prefixes, and list completions.',
    inputs: [{ key: 'ops', label: 'Operations (insert w, search w, startswith p, complete p, delete w)', type: 'text', value: 'insert cat, insert car, insert care, insert dog, search car, search ca, startswith ca, complete car, delete care' }],
    pseudo: () => ['insert(w): for each letter, follow or create the child; mark the last node as a word end', 'search(w): follow letters; succeed only if the node is marked as a word end', 'startsWith(p): follow letters; succeed if the path exists', 'complete(p): go to the prefix node, then DFS to list every word below', 'delete(w): unmark the end, prune now-useless nodes'],
    viva: [{ q: 'What is the time complexity of trie insert and search, and the trade-off?', a: 'O(L) where L is the word length independent of number of words but uses more memory for the pointers' }, { q: 'Why is a trie better than a hash table for prefix queries?', a: 'a trie follows the prefix path directly and can enumerate all words with that prefix a hash table cannot' }],
    build(p) {
      const ops = parseOps(p.ops, 20), sp = stepper(600), T = { kids: {}, end: false }; let words = 0;
      const view = (hl, mark) => { const cv = (n, ch, path) => ({ id: path, label: ch, cls: hl.has(path) ? (mark || 'cur') : n.end ? 'visited' : '', children: Object.keys(n.kids).sort().map((c) => cv(n.kids[c], c, path + c)) }); return { tree: cv(T, '·', ''), kind: 'nary' }; };
      const snap = (line, msg, why, path = [], mark) => sp.push(line, msg, why, view(new Set(path), mark), { words, wordCount: words });
      snap(0, 'Empty trie (only the root).', 'Initial state.');
      const walk = (w, line, verb) => { let n = T, path = ''; const hl = ['']; for (const c of w) { if (!n.kids[c]) { snap(line, `${verb}: no child '${c}' after "${path}" → stop.`, 'The path ends here.', hl, 'bad'); return { n: null }; } n = n.kids[c]; path += c; hl.push(path); snap(line, `${verb}: follow '${c}'.`, 'Each letter moves one level down.', hl); } return { n, hl }; };
      ops.forEach((o) => {
        const w = String(o.args[0] ?? '').toLowerCase(); if (o.op !== 'complete' || w) need(o); if (!/^[a-z]*$/.test(w)) throw new Error('Use lowercase letters only.');
        if (o.op === 'insert') {
          let n = T, path = ''; const hl = [''];
          for (const c of w) { path += c; if (!n.kids[c]) { n.kids[c] = { kids: {}, end: false }; hl.push(path); snap(0, `insert "${w}": '${c}' missing → create node.`, 'New letters create new nodes.', hl, 'new'); } else { hl.push(path); snap(0, `insert "${w}": '${c}' exists → reuse (shared prefix).`, 'Common prefixes share nodes.', hl); } n = n.kids[c]; }
          if (!n.end) words++; n.end = true; snap(0, `Mark "${w}" as a complete word.`, 'Green nodes are word ends.', hl, 'new');
        } else if (o.op === 'search') { const r = walk(w, 1, `search "${w}"`); if (r.n) snap(1, r.n.end ? `"${w}" found (word end).` : `Path exists but "${w}" is only a prefix, not a stored word.`, 'Search needs the end-of-word flag.', r.hl, r.n.end ? 'new' : 'bad'); }
        else if (o.op === 'startswith' || o.op === 'prefix') { const r = walk(w, 2, `startsWith "${w}"`); if (r.n) snap(2, `Yes: some word starts with "${w}".`, 'The prefix path exists.', r.hl, 'new'); }
        else if (o.op === 'complete') {
          const r = walk(w, 3, `complete "${w}"`); if (!r.n) return; const found = [];
          (function dfs(n, s) { if (n.end) found.push(s); Object.keys(n.kids).sort().forEach((c) => dfs(n.kids[c], s + c)); })(r.n, w);
          snap(3, found.length ? `Words with prefix "${w}": ${found.join(', ')}.` : `No words start with "${w}".`, 'DFS below the prefix node lists all completions.', r.hl, 'new');
        } else if (o.op === 'delete') {
          const r = walk(w, 4, `delete "${w}"`); if (!r.n || !r.n.end) { snap(4, `"${w}" is not stored.`, 'Nothing to delete.'); return; }
          r.n.end = false; words--; (function prune(n, i) { if (i === w.length) return !Object.keys(n.kids).length && !n.end; const c = w[i]; if (prune(n.kids[c], i + 1)) delete n.kids[c]; return !Object.keys(n.kids).length && !n.end; })(T, 0);
          snap(4, `Deleted "${w}" (unmarked the end and pruned unused nodes).`, 'Nodes shared with other words stay.');
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => treeRender(root, step, [h('p', { class: 'muted' }, 'Green = end of a word · Yellow = current path.')]),
  });

  /* ───────────────────────── Segment tree ───────────────────────── */
  register({
    id: 'segtree', group: 'DSA', section: TR, title: 'Segment Tree',
    blurb: 'Range queries and point updates in O(log n). See which nodes a query visits.',
    inputs: [
      { key: 'arr', label: 'Array (≤ 12)', type: 'text', value: '2, 5, 1, 4, 9, 3' },
      { key: 'kind', label: 'Combine', type: 'select', value: 'sum', options: [['sum', 'Sum'], ['min', 'Minimum'], ['max', 'Maximum']] },
      { key: 'ops', label: 'Operations (query l r, update i v) — 0-based', type: 'text', value: 'query 1 4, update 2 10, query 1 4, query 0 5' },
    ],
    pseudo: () => ['build(node, l, r): if l == r: leaf = a[l]; else build children, node = combine(children)', 'query(node, l, r, ql, qr):', '  outside the range → neutral;  fully inside → node value', '  partial overlap → combine(query(left), query(right))', 'update(i, v): walk to the leaf, then recompute the ancestors'],
    viva: [{ q: 'What is the complexity of build, query and update in a segment tree?', a: 'build O(n) query and point update O(log n)' }, { q: 'When do you need lazy propagation?', a: 'for range updates so we can postpone updates to children and keep O(log n)' }],
    build(p) {
      const a = ints(p.arr, 'Array', { maxLen: 12 }), kind = p.kind, ops = parseOps(p.ops, 15), sp = stepper(800);
      const comb = (x, y) => (kind === 'sum' ? x + y : kind === 'min' ? Math.min(x, y) : Math.max(x, y)), neutral = kind === 'sum' ? 0 : kind === 'min' ? Infinity : -Infinity;
      const mkT = (l, r) => { const n = { l, r }; if (l === r) n.v = a[l]; else { const m = (l + r) >> 1; n.L = mkT(l, m); n.R = mkT(m + 1, r); n.v = comb(n.L.v, n.R.v); } return n; };
      const Tt = mkT(0, a.length - 1);
      const view = (hl) => { const cv = (n) => (n ? { id: n.l + '-' + n.r, label: n.l === n.r ? `[${n.l}]` : `[${n.l},${n.r}]`, sub: String(n.v), box: true, cls: hl[n.l + '-' + n.r] || '', left: cv(n.L), right: cv(n.R) } : null); return { tree: cv(Tt), a: a.slice() }; };
      const snap = (line, msg, why, hl = {}) => sp.push(line, msg, why, view(hl), { array: a.slice(), rootValue: Tt.v });
      snap(0, `Segment tree built over ${a.length} elements (${kind}). Root [0,${a.length - 1}] = ${Tt.v}.`, 'Each node stores the combined value of its range; leaves are the array elements.');
      ops.forEach((o) => {
        if (o.op === 'query') {
          need(o, 2); const ql = o.args[0], qr = o.args[1]; if (ql < 0 || qr >= a.length || ql > qr) throw new Error(`query range must satisfy 0 ≤ l ≤ r ≤ ${a.length - 1}.`); const hl = {};
          const q = (n) => { const key = n.l + '-' + n.r; if (n.r < ql || n.l > qr) { snap(1, `[${n.l},${n.r}] is outside [${ql},${qr}] → ignore.`, 'No overlap contributes nothing.', { ...hl, [key]: 'bad' }); return neutral; } if (ql <= n.l && n.r <= qr) { hl[key] = 'new'; snap(1, `[${n.l},${n.r}] is fully inside → use its stored value ${n.v}.`, 'Full overlap: no need to go deeper.', hl); return n.v; } hl[key] = 'cur'; snap(1, `[${n.l},${n.r}] partially overlaps → ask both children.`, 'Partial overlap: split the question.', hl); const x = comb(q(n.L), q(n.R)); return x; };
          const r = q(Tt); snap(1, `query(${ql}, ${qr}) = ${r}.`, 'Only O(log n) nodes were visited.', hl);
        } else if (o.op === 'update') {
          need(o, 2); const i = o.args[0], v = o.args[1]; if (i < 0 || i >= a.length) throw new Error(`update index must be 0..${a.length - 1}.`); const hl = {};
          const u = (n) => { hl[n.l + '-' + n.r] = 'cur'; if (n.l === n.r) { n.v = v; a[i] = v; snap(4, `Leaf [${i}] set to ${v}.`, 'Reached the leaf for index i.', hl); return; } u(i <= ((n.l + n.r) >> 1) ? n.L : n.R); n.v = comb(n.L.v, n.R.v); snap(4, `Recompute [${n.l},${n.r}] = ${n.v}.`, 'Ancestors must reflect the change.', hl); };
          snap(4, `update(${i}, ${v}): descend to the leaf.`, 'Follow the path to index i.'); u(Tt);
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { root.append(D.treeSvg([step.view.tree]), D.cells(step.view.a, {}, {}, 'Array'), h('p', { class: 'muted' }, 'Yellow = partial overlap/path · Green = used · Red = ignored.')); },
  });

  /* ───────────────────────── Fenwick tree ───────────────────────── */
  register({
    id: 'fenwick', group: 'DSA', section: TR, title: 'Fenwick Tree (Binary Indexed Tree)',
    blurb: 'Prefix sums with point updates, jumping by the lowest set bit.',
    inputs: [
      { key: 'arr', label: 'Array (1-indexed positions, ≤ 12)', type: 'text', value: '3, 2, -1, 6, 5, 4, -3, 3' },
      { key: 'ops', label: 'Operations (query i, update i delta)', type: 'text', value: 'query 6, update 3 5, query 6, query 8' },
    ],
    pseudo: () => ['update(i, d): while i ≤ n: bit[i] += d; i += i & -i', 'query(i): sum = 0; while i > 0: sum += bit[i]; i -= i & -i', 'bit[i] stores the sum of a range of length lowbit(i) ending at i'],
    viva: [{ q: 'What does i & -i compute and why does the Fenwick tree use it?', a: 'it isolates the lowest set bit which is the size of the range stored in bit[i] used to jump to parent or previous range' }, { q: 'Compare Fenwick tree with segment tree.', a: 'fenwick is simpler smaller and faster for prefix sums segment tree is more general supports min max and range updates' }],
    build(p) {
      const a = ints(p.arr, 'Array', { maxLen: 12 }), n = a.length, bit = Array(n + 1).fill(0), ops = parseOps(p.ops, 15), sp = stepper(500);
      const snap = (line, msg, why, marks = {}, idx) => sp.push(line, msg, why, { a: a.slice(), bit: bit.slice(), marks, idx }, { array: a.slice(), bit: bit.slice(1) });
      for (let i = 1; i <= n; i++) for (let j = i; j <= n; j += j & -j) bit[j] += a[i - 1];
      snap(0, 'Fenwick array built: each bit[i] covers lowbit(i) elements ending at i.', 'For example bit[4] = a1+a2+a3+a4, bit[6] = a5+a6.');
      ops.forEach((o) => {
        need(o); const i0 = o.args[0]; if (i0 < 1 || i0 > n) throw new Error(`index must be 1..${n}.`);
        if (o.op === 'query') { let i = i0, s = 0; snap(1, `query(${i0}): sum of a[1..${i0}].`, 'Prefix sum.'); while (i > 0) { s += bit[i]; snap(1, `bit[${i}] = ${bit[i]} covers ${i - (i & -i) + 1}..${i}; sum = ${s}. Next i = ${i} − ${i & -i} = ${i - (i & -i)}.`, 'Strip the lowest set bit to jump to the previous block.', { [i]: 'done' }, i); i -= i & -i; } snap(1, `Prefix sum(${i0}) = ${s}.`, 'Done: O(log n) steps.'); }
        else if (o.op === 'update') { need(o, 2); const d = o.args[1]; let i = i0; a[i0 - 1] += d; snap(0, `update(${i0}, ${d >= 0 ? '+' : ''}${d}).`, 'Every block containing position i must change.'); while (i <= n) { bit[i] += d; snap(0, `bit[${i}] += ${d} → ${bit[i]}. Next i = ${i} + ${i & -i} = ${i + (i & -i)}.`, 'Add the lowest set bit to jump to the next block that covers i.', { [i]: 'swap' }, i); i += i & -i; } snap(0, 'Update finished.', 'All affected blocks were updated.'); }
        else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(D.cells([null, ...v.a], {}, {}, 'a[1..n] (position 0 unused)'), D.cells(v.bit.map((x, i) => (i ? x : null)), v.marks, {}, 'bit[1..n]'), v.idx ? h('p', { class: 'muted' }, `i = ${v.idx} = ${v.idx.toString(2)}₂, lowbit = ${v.idx & -v.idx}`) : null); },
  });

  /* ───────────────────────── Red-black tree ───────────────────────── */
  register({
    id: 'rbtree', group: 'DSA', section: TR, title: 'Red-Black Tree (insertion)',
    blurb: 'Self-balancing BST using colours: recolouring and rotations restore the red-black rules after each insert.',
    inputs: [{ key: 'vals', label: 'Insert sequence', type: 'text', value: '10, 18, 7, 15, 16, 30, 25, 40, 60' }],
    pseudo: () => ['insert as in a BST; colour the new node RED', 'while parent is RED:', '  uncle RED → recolour parent, uncle, grandparent; move up', '  uncle BLACK, zig-zag → rotate parent first', '  uncle BLACK, straight → recolour + rotate grandparent', 'root = BLACK'],
    viva: [{ q: 'State the red-black tree properties.', a: 'every node red or black root black no two consecutive reds every path from a node to leaves has the same number of black nodes' }, { q: 'Compare red-black trees with AVL trees.', a: 'avl is more strictly balanced faster lookups red black needs fewer rotations on insert and delete faster updates' }],
    build(p) {
      const vals = ints(p.vals, 'Sequence', { maxLen: 16 }), sp = stepper(600); let root = null;
      const view = (hl) => { const cv = (n) => (n ? { id: n.key, label: n.key, cls: 'rb-' + (n.color === 'R' ? 'red' : 'black') + (hl[n.key] ? ' cur' : ''), left: cv(n.left), right: cv(n.right) } : null); return { tree: cv(root) }; };
      const snap = (line, msg, why, hl = {}) => sp.push(line, msg, why, view(hl), { root: root ? root.key : '—' });
      const rotL = (x) => { const y = x.right; x.right = y.left; if (y.left) y.left.parent = x; y.parent = x.parent; if (!x.parent) root = y; else if (x === x.parent.left) x.parent.left = y; else x.parent.right = y; y.left = x; x.parent = y; };
      const rotR = (x) => { const y = x.left; x.left = y.right; if (y.right) y.right.parent = x; y.parent = x.parent; if (!x.parent) root = y; else if (x === x.parent.right) x.parent.right = y; else x.parent.left = y; y.right = x; x.parent = y; };
      snap(0, 'Empty tree. Red nodes are pink, black nodes are dark.', 'Initial state.');
      vals.forEach((k) => {
        let y = null, x = root; while (x) { if (k === x.key) { y = null; x = 'dup'; break; } y = x; x = k < x.key ? x.left : x.right; }
        if (x === 'dup') { snap(0, `${k} already present; skipped.`, 'Duplicates ignored.'); return; }
        let z = { key: k, color: 'R', left: null, right: null, parent: y }; if (!y) root = z; else if (k < y.key) y.left = z; else y.right = z;
        snap(0, `Insert ${k} as a RED leaf.`, 'New nodes are red so black-heights stay unchanged.', { [k]: 1 });
        while (z.parent && z.parent.color === 'R') {
          const par = z.parent, g = par.parent, left = par === g.left, u = left ? g.right : g.left;
          if (u && u.color === 'R') { par.color = 'B'; u.color = 'B'; g.color = 'R'; snap(2, `Parent ${par.key} and uncle ${u.key} are red → recolour them black and grandparent ${g.key} red.`, 'Case 1: push the red violation upward.', { [g.key]: 1 }); z = g; }
          else {
            if (left && z === par.right) { z = par; rotL(z); snap(3, `Zig-zag (left-right): rotate left at ${z.key}.`, 'Case 2: turn it into a straight line first.', { [z.key]: 1 }); }
            else if (!left && z === par.left) { z = par; rotR(z); snap(3, `Zig-zag (right-left): rotate right at ${z.key}.`, 'Case 2: turn it into a straight line first.', { [z.key]: 1 }); }
            const p2 = z.parent, g2 = p2.parent; p2.color = 'B'; g2.color = 'R'; snap(4, `Uncle is black: recolour parent ${p2.key} black and grandparent ${g2.key} red.`, 'Case 3: prepare for the rotation.', { [p2.key]: 1 });
            const dir = p2 === g2.left ? 'right' : 'left';
            if (dir === 'right') rotR(g2); else rotL(g2);
            snap(4, `Rotate ${dir} at grandparent ${g2.key}: ${p2.key} becomes the subtree root.`, 'The rotation fixes the red-red conflict.', { [p2.key]: 1 });
          }
        }
        if (root.color === 'R') { root.color = 'B'; snap(5, `Root ${root.key} must be black → recolour.`, 'Rule: the root is always black.', { [root.key]: 1 }); }
        snap(5, `Tree valid after inserting ${k}.`, 'All red-black rules hold.');
      });
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => treeRender(root, step, [h('p', { class: 'muted' }, 'Pink = red node · Dark = black node · Yellow ring = node being changed.')]),
  });

  /* ───────────────────────── B-tree / B+ tree ───────────────────────── */
  register({
    id: 'btree', group: 'DSA', section: TR, title: 'B-Tree / B+ Tree (insertion)',
    blurb: 'Multi-key nodes that split when they overflow. B+ trees keep all keys in linked leaves and copy separators up.',
    inputs: [
      { key: 'vals', label: 'Insert keys', type: 'text', value: '10, 20, 5, 6, 12, 30, 7, 17, 3' },
      { key: 'max', label: 'Max keys per node (2–5)', type: 'range', value: 3, min: 2, max: 5, step: 1 },
      { key: 'plus', label: 'B+ tree (copy-up, linked leaves)', type: 'checkbox', value: false },
    ],
    pseudo: (p) => ['descend to the correct leaf', 'insert the key in sorted order', 'if the node has too many keys: split in the middle', p.plus ? '  leaf: copy the first key of the right half up; internal: move the middle key up' : '  move the middle key up to the parent', 'if the root splits, the tree grows one level'],
    viva: [{ q: 'Why are B-trees used in databases and file systems?', a: 'high fanout means very shallow trees so few disk reads per lookup nodes sized to disk blocks' }, { q: 'How does a B+ tree differ from a B-tree?', a: 'b plus tree stores all data in leaves which are linked for fast range scans internal nodes only hold separator keys' }],
    build(p) {
      const vals = ints(p.vals, 'Keys', { maxLen: 20 }), M = clamp(Math.round(p.max), 2, 5), plus = !!p.plus, sp = stepper(600); let root = { keys: [], kids: [], leaf: true }, nid = 0;
      const view = (hl) => { const cv = (n, d) => ({ id: (nid++) + '', label: n.keys.join(' | ') || '∅', box: true, cls: hl.has(n) ? 'cur' : '', sub: plus && n.leaf ? '→' : '', children: n.kids.map((c) => cv(c, d + 1)) }); nid = 0; return { tree: cv(root, 0), kind: 'nary' }; };
      const snap = (line, msg, why, hl = []) => sp.push(line, msg, why, view(new Set(hl)), { keysTotal: vals.length });
      snap(0, `Empty ${plus ? 'B+' : 'B'}-tree, up to ${M} keys per node.`, 'Initial state.');
      vals.forEach((k) => {
        const path = []; let n = root;
        while (!n.leaf) { path.push(n); let i = 0; while (i < n.keys.length && k >= n.keys[i]) i++; snap(0, `Insert ${k}: at [${n.keys.join(', ')}] go to child ${i}.`, 'Pick the child whose key range contains the new key.', [n]); n = n.kids[i]; }
        if (n.keys.includes(k)) { snap(1, `${k} already present.`, 'Duplicates ignored.', [n]); return; }
        n.keys.push(k); n.keys.sort((x, y) => x - y); snap(1, `Insert ${k} into leaf [${n.keys.join(', ')}].`, 'Keys inside a node stay sorted.', [n]);
        while (n.keys.length > M) {
          const mid = n.keys.length >> 1; let up, right;
          if (n.leaf && plus) { right = { keys: n.keys.slice(mid), kids: [], leaf: true }; up = right.keys[0]; n.keys = n.keys.slice(0, mid); }
          else { up = n.keys[mid]; right = { keys: n.keys.slice(mid + 1), kids: n.kids.slice(mid + 1), leaf: n.leaf }; n.kids = n.kids.slice(0, mid + 1); n.keys = n.keys.slice(0, mid); }
          snap(2, `Node overflow (> ${M} keys): split. ${plus && n.leaf ? `Copy ${up} up (it stays in the right leaf)` : `Move ${up} up`}.`, 'A node cannot hold more than the maximum number of keys.', [n, right]);
          const par = path.pop();
          if (!par) { root = { keys: [up], kids: [n, right], leaf: false }; snap(4, `Root split: new root [${up}], tree height grows by 1.`, 'B-trees grow upward, so all leaves stay at the same depth.', [root]); break; }
          const idx = par.kids.indexOf(n); par.keys.splice(idx, 0, up); par.kids.splice(idx + 1, 0, right); n = par; snap(3, `Parent now [${par.keys.join(', ')}].`, 'The promoted key separates the two halves.', [par]);
        }
        snap(4, `${k} inserted.`, 'Tree is valid.');
      });
      return { steps: sp.steps, meta: {} };
    },
    render: (root, step) => treeRender(root, step),
  });

  /* ───────────────────────── Huffman ───────────────────────── */
  register({
    id: 'huffman', group: 'DSA', section: TR, title: 'Huffman Coding',
    blurb: 'Repeatedly merge the two least frequent symbols; frequent symbols get shorter bit codes.',
    inputs: [{ key: 'text', label: 'Text to encode (≤ 40 chars)', type: 'text', value: 'abracadabra alakazam' }],
    pseudo: () => ['count the frequency of each symbol', 'put every symbol in a min-priority queue', 'while more than one tree remains:', '  take the two lowest-frequency trees; merge into a parent (sum)', 'left edge = 0, right edge = 1 → each leaf gets a prefix code'],
    viva: [{ q: 'Why does Huffman coding give an optimal prefix code?', a: 'greedy merging of the two least frequent symbols ensures rarer symbols get longer codes and no code is a prefix of another' }, { q: 'What is the time complexity of building a Huffman tree?', a: 'O(n log n) using a min heap for n distinct symbols' }],
    build(p) {
      const text = String(p.text); if (!text.length || text.length > 40) throw new Error('Enter 1–40 characters.');
      const freq = {}; [...text].forEach((c) => (freq[c] = (freq[c] || 0) + 1));
      let uid = 0, forest = Object.keys(freq).sort((a, b) => freq[a] - freq[b] || (a < b ? -1 : 1)).map((c) => ({ id: uid++, ch: c, f: freq[c] })); if (forest.length > 12) throw new Error('Use at most 12 distinct characters.');
      const sp = stepper(100), show = (c) => (c === ' ' ? '␣' : c);
      const cv = (n, hl, code) => ({ id: n.id, label: n.ch !== undefined ? show(n.ch) : String(n.f), sub: n.ch !== undefined ? String(n.f) : '', cls: hl.has(n.id) ? 'new' : n.ch !== undefined ? 'visited' : '', edgeLabel: code, left: n.l ? cv(n.l, hl, '0') : null, right: n.r ? cv(n.r, hl, '1') : null });
      const snap = (line, msg, why, hl = [], codes) => sp.push(line, msg, why, { roots: forest.map((t) => cv(t, new Set(hl))), pq: forest.map((t) => `${t.ch !== undefined ? show(t.ch) : '•'}:${t.f}`), codes }, { queue: forest.map((t) => `${t.ch !== undefined ? show(t.ch) : '•'}:${t.f}`), distinct: forest.length });
      snap(0, `Frequencies: ${Object.entries(freq).map(([c, f]) => `${show(c)}=${f}`).join(', ')}.`, 'Count how often each symbol appears.');
      if (forest.length === 1) { const codes = { [forest[0].ch]: '0' }; snap(4, 'Only one symbol: it gets code "0".', 'A single symbol needs 1 bit.', [], codes); return { steps: sp.steps, meta: {} }; }
      while (forest.length > 1) {
        forest.sort((a, b) => a.f - b.f || a.id - b.id); const a = forest.shift(), b = forest.shift(), m = { id: uid++, f: a.f + b.f, l: a, r: b }; forest.push(m);
        snap(3, `Merge the two smallest: ${a.ch !== undefined ? show(a.ch) : '•'}(${a.f}) + ${b.ch !== undefined ? show(b.ch) : '•'}(${b.f}) → new node ${m.f}.`, 'The least frequent symbols end up deepest (longest codes).', [m.id]);
      }
      const codes = {}; (function go(n, c) { if (n.ch !== undefined) codes[n.ch] = c; else { go(n.l, c + '0'); go(n.r, c + '1'); } })(forest[0], '');
      const bits = [...text].reduce((s, c) => s + codes[c].length, 0);
      snap(4, `Codes assigned. Encoded size ${bits} bits vs ${text.length * 8} bits (8-bit chars): ${(100 - (bits / (text.length * 8)) * 100).toFixed(0)}% smaller.`, 'Walk from the root: left = 0, right = 1.', [], codes);
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view; root.append(D.treeSvg(v.roots, { kind: 'binary', maxWidth: 1.2 }), D.chips('Priority queue:', v.pq));
      if (v.codes) root.append(h('table', { class: 'grid' }, h('tr', {}, h('th', {}, 'symbol'), h('th', {}, 'code')), Object.entries(v.codes).sort((a, b) => a[1].length - b[1].length).map(([c, code]) => h('tr', {}, h('td', {}, c === ' ' ? '␣' : c), h('td', {}, code)))));
    },
  });
})();
