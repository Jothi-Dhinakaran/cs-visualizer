/* dsa-paradigm.js — Recursion & backtracking, dynamic programming, greedy algorithms. */
(function () {
  'use strict';
  const { h, clamp, register, PALETTE } = window.CSViz;
  const D = window.DSA, { ints, stepper } = D;
  const REC = 'Recursion & Backtracking', DP = 'Dynamic Programming', GRE = 'Greedy';
  const letters = (s, label, max = 10) => { const t = String(s).trim(); if (!t || t.length > max) throw new Error(`${label}: enter 1–${max} characters.`); return t; };

  /* ───────────────────────── Tower of Hanoi ───────────────────────── */
  register({
    id: 'hanoi', group: 'DSA', section: REC, title: 'Tower of Hanoi',
    blurb: 'Move all disks from A to C, never putting a larger disk on a smaller one. Takes 2ⁿ − 1 moves.',
    inputs: [{ key: 'n', label: 'Disks (1–6)', type: 'number', value: 3, min: 1, max: 6 }],
    pseudo: () => ['hanoi(n, from, to, via):', '  if n == 0: return', '  hanoi(n-1, from, via, to)     — clear the way', '  move disk n from → to', '  hanoi(n-1, via, to, from)     — rebuild on top'],
    viva: [{ q: 'How many moves does Tower of Hanoi need for n disks and why?', a: '2^n - 1 because T(n) = 2T(n-1) + 1 move n-1 disks twice plus one move' }, { q: 'What is the recurrence relation and its complexity?', a: 'T(n) = 2T(n-1) + 1 exponential O(2^n)' }],
    build(p) {
      const n = clamp(Math.round(p.n), 1, 6), pegs = { A: Array.from({ length: n }, (_, i) => n - i), B: [], C: [] }, sp = stepper(100); let moves = 0;
      const snap = (line, msg, why, from, to) => sp.push(line, msg, why, { pegs: { A: pegs.A.slice(), B: pegs.B.slice(), C: pegs.C.slice() }, from, to, n }, { moves, of: 2 ** n - 1, A: pegs.A.slice(), B: pegs.B.slice(), C: pegs.C.slice() });
      snap(0, `Start: ${n} disk(s) on peg A.`, 'Goal: move the whole tower to peg C.');
      (function mv(k, f, t, v) {
        if (k === 0) return; mv(k - 1, f, v, t);
        pegs[t].push(pegs[f].pop()); moves++;
        snap(3, `Move ${moves}: disk ${k} from ${f} to ${t}.`, `To move ${k} disk(s), first park the ${k - 1} smaller ones on ${v}, move the big one, then stack them back on top.`, f, t);
        mv(k - 1, v, t, f);
      })(n, 'A', 'C', 'B');
      snap(0, `Done in ${moves} moves = 2^${n} − 1.`, 'The recurrence T(n) = 2T(n−1) + 1 solves to 2ⁿ − 1.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view; root.append(h('div', { class: 'peg-row' }, ['A', 'B', 'C'].map((k) => h('div', { class: 'peg' + (k === v.to ? ' hl' : '') }, v.pegs[k].map((d) => h('div', { class: 'disk', style: { width: 30 + d * 22 + 'px', background: PALETTE[d % PALETTE.length] } }, d)), h('div', { class: 'ptr', style: { position: 'absolute', bottom: '-30px' } }, 'peg ' + k)))), h('div', { style: { height: '24px' } }));
    },
  });

  /* ───────────────────────── N-Queens ───────────────────────── */
  register({
    id: 'nqueens', group: 'DSA', section: REC, title: 'N-Queens (Backtracking)',
    blurb: 'Place N queens so none attack each other: try a column, recurse, undo when stuck.',
    inputs: [
      { key: 'n', label: 'Board size N (4–8)', type: 'number', value: 5, min: 4, max: 8 },
      { key: 'all', label: 'Find all solutions (otherwise stop at the first)', type: 'checkbox', value: false },
    ],
    pseudo: () => ['solve(row): if row == N: record a solution', '  for col in 0..N-1:', '    if safe(row, col): place queen; solve(row+1)', '    else: skip — attacked in the same column or diagonal', '  remove the queen from this row (backtrack)'],
    viva: [{ q: 'What is backtracking and how does N-Queens use it?', a: 'build a solution step by step and undo the last choice when it leads to a dead end pruning invalid placements early' }, { q: 'How do you check diagonal attacks quickly?', a: 'two queens share a diagonal if row difference equals column difference absolute values' }],
    build(p) {
      const n = clamp(Math.round(p.n), 4, 8), cols = [], sp = stepper(2500); let sols = 0, backs = 0, stop = false;
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { n, q: cols.slice(), ...extra }, { queens: cols.map((c, r) => `(${r},${c})`), solutions: sols, backtracks: backs });
      snap(0, `Place ${n} queens on a ${n}×${n} board.`, 'Row by row, one queen per row.');
      (function solve(r) {
        if (stop || sp.full()) return;
        if (r === n) { sols++; snap(0, `Solution #${sols} found: columns ${cols.join(', ')}.`, 'All rows have a safe queen.', { sol: true }); if (!p.all) stop = true; return; }
        for (let c = 0; c < n && !stop; c++) {
          const hit = cols.findIndex((cc, rr) => cc === c || Math.abs(cc - c) === r - rr);
          if (hit < 0) { cols.push(c); snap(2, `Row ${r}, column ${c} is safe → place a queen.`, 'No queen above shares its column or diagonal.', { cell: [r, c] }); solve(r + 1); if (stop) return; cols.pop(); backs++; snap(4, `Backtrack: remove the queen from row ${r}, column ${c}.`, 'The deeper rows ran out of safe squares or we are collecting all solutions.', { cell: [r, c], back: true }); }
          else snap(3, `Row ${r}, column ${c}: attacked by the queen at (${hit}, ${cols[hit]}) → skip.`, cols[hit] === c ? 'Same column.' : 'Same diagonal.', { cell: [r, c], bad: [hit, cols[hit]] });
        }
      })(0);
      if (sp.full()) snap(0, 'Step limit reached — showing partial progress. Try a smaller N or "first solution only".', 'The animation is capped to keep the page fast.');
      else if (!sols) snap(0, 'No solution exists for this N.', 'All placements were tried.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, rows = Array.from({ length: v.n }, () => Array(v.n).fill(0));
      root.append(D.board(rows, (i, j) => { const q = v.q[i] === j; const isCell = v.cell && v.cell[0] === i && v.cell[1] === j; const isBad = v.bad && v.bad[0] === i && v.bad[1] === j; return { cls: (q ? 'q ' : '') + (isCell && !q ? (v.back ? 'try' : 'bad') : '') + (isBad ? ' bad' : '') + ((i + j) % 2 ? ' alt' : ''), text: q ? '♛' : '' }; }), v.sol ? h('p', { class: 'chip good' }, '✔ solution') : null);
    },
  });

  /* ───────────────────────── Sudoku ───────────────────────── */
  register({
    id: 'sudoku', group: 'DSA', section: REC, title: 'Sudoku Solver (Backtracking)',
    blurb: 'Fill empty cells with the first valid digit; when stuck, backtrack. Enter 81 characters (. or 0 = empty).',
    inputs: [{ key: 'puzzle', label: 'Puzzle (81 chars, row by row)', type: 'text', value: '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..' }],
    pseudo: () => ['find the next empty cell', 'for digit in 1..9:', '  if digit is valid in row, column and 3×3 box: place it; recurse', '  if the recursion fails: remove it (backtrack) and try the next digit', 'no empty cell left → solved'],
    viva: [{ q: 'How does backtracking solve Sudoku and how can it be sped up?', a: 'try digits cell by cell undo on conflict speed up by choosing the cell with fewest candidates minimum remaining values and constraint propagation' }],
    build(p) {
      const s = String(p.puzzle).replace(/\s/g, '').replace(/0/g, '.'); if (!/^[1-9.]{81}$/.test(s)) throw new Error('Enter exactly 81 characters: digits 1-9 or . for empty.');
      const g = [...s].map((c) => (c === '.' ? 0 : +c)), given = g.map((x) => x !== 0), sp = stepper(12000); let placed = 0, backs = 0;
      const ok = (i, v) => { const r = Math.floor(i / 9), c = i % 9; for (let k = 0; k < 9; k++) { if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false; } const br = r - (r % 3), bc = c - (c % 3); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (g[(br + a) * 9 + bc + b] === v) return false; return true; };
      for (let i = 0; i < 81; i++) if (g[i]) { const v = g[i]; g[i] = 0; if (!ok(i, v)) throw new Error('The given digits already conflict.'); g[i] = v; }
      const snap = (line, msg, why, cur, kind) => sp.push(line, msg, why, { g: g.slice(), given, cur, kind }, { cell: cur === undefined ? '—' : `r${Math.floor(cur / 9) + 1}c${(cur % 9) + 1}`, placements: placed, backtracks: backs, empty: g.filter((x) => !x).length });
      snap(0, `${g.filter((x) => !x).length} empty cells to fill.`, 'Bold blue digits are the givens.');
      let solved = false;
      (function solve(pos) {
        if (sp.full()) return false; while (pos < 81 && g[pos]) pos++;
        if (pos === 81) { solved = true; return true; }
        for (let v = 1; v <= 9; v++) if (ok(pos, v)) { g[pos] = v; placed++; snap(2, `Cell r${Math.floor(pos / 9) + 1}c${(pos % 9) + 1}: ${v} is valid → place it.`, 'No conflict in its row, column or box.', pos, 'place'); if (solve(pos + 1)) return true; g[pos] = 0; backs++; snap(3, `Dead end below: remove ${v} from r${Math.floor(pos / 9) + 1}c${(pos % 9) + 1} (backtrack).`, 'The remaining cells cannot be completed with this digit.', pos, 'back'); }
        return false;
      })(0);
      snap(4, solved ? `Solved! ${placed} placements, ${backs} backtracks.` : sp.full() ? 'Step limit reached — the animation was cut short.' : 'No solution exists.', solved ? 'Every cell holds a valid digit.' : 'The search stopped.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, rows = Array.from({ length: 9 }, (_, i) => Array.from({ length: 9 }, (_, j) => v.g[i * 9 + j]));
      root.append(D.board(rows, (i, j, x) => { const k = i * 9 + j; return { text: x || '', cls: (v.given[k] ? 'given ' : x ? 'placed ' : '') + (k === v.cur ? (v.kind === 'back' ? 'bad ' : 'try ') : '') + ((j % 3 === 2 && j < 8) ? 'thick-r ' : '') + ((i % 3 === 2 && i < 8) ? 'thick-b' : '') }; }));
    },
  });

  /* ───────────────────────── Subset sum / permutations ───────────────────────── */
  register({
    id: 'combi', group: 'DSA', section: REC, title: 'Subset Sum, Subsets & Permutations',
    blurb: 'Classic choose / explore / un-choose recursion on small inputs.',
    inputs: [
      { key: 'mode', label: 'Problem', type: 'select', value: 'sum', options: [['sum', 'Subset sum (with pruning)'], ['subsets', 'All subsets (power set)'], ['perm', 'All permutations']] },
      { key: 'arr', label: 'Numbers (≤ 8; permutations ≤ 4)', type: 'text', value: '3, 34, 4, 12, 5, 2' },
      { key: 'target', label: 'Target sum (subset sum)', type: 'number', value: 9 },
    ],
    pseudo: (p) => p.mode === 'perm' ? ['permute(path): if path is full: record it', '  for each unused element x:', '    choose x; permute(path + x)', '    un-choose x (backtrack)'] : ['go(i, chosen):', p.mode === 'sum' ? '  if sum == target: record; if sum > target: prune' : '  if i == n: record chosen', '  include a[i]: go(i+1, chosen + a[i])', '  exclude a[i]: go(i+1, chosen)'],
    viva: [{ q: 'How many subsets and permutations does a set of n elements have?', a: '2^n subsets and n factorial permutations' }, { q: 'What is pruning in backtracking?', a: 'abandoning a partial solution early when it can no longer lead to a valid answer such as the sum already exceeding the target' }],
    build(p) {
      const a = ints(p.arr, 'Numbers', { maxLen: 8, lo: p.mode === 'sum' ? 1 : -99 }).slice(0, p.mode === 'perm' ? 4 : 8), sp = stepper(1500), found = []; const T = Math.round(p.target);
      const snap = (line, msg, why, extra) => sp.push(line, msg, why, { a, found: found.slice(), ...extra }, { found: found.length, solutions: found.slice(-6) });
      snap(0, p.mode === 'sum' ? `Find subsets of [${a.join(', ')}] that sum to ${T}.` : p.mode === 'perm' ? `All permutations of [${a.join(', ')}].` : `All subsets of [${a.join(', ')}].`, 'Recursion explores every choice.', { path: [], idx: -1 });
      if (p.mode === 'perm') {
        const used = Array(a.length).fill(false), path = [];
        (function go() {
          if (sp.full()) return; if (path.length === a.length) { found.push(path.join('')); snap(0, `Permutation #${found.length}: ${path.join(' ')}.`, 'The path uses every element.', { path: path.slice(), used: used.slice(), sol: true }); return; }
          for (let i = 0; i < a.length; i++) if (!used[i]) { used[i] = true; path.push(a[i]); snap(2, `Choose ${a[i]} → path [${path.join(', ')}].`, 'Pick an unused element.', { path: path.slice(), used: used.slice() }); go(); path.pop(); used[i] = false; snap(3, `Un-choose ${a[i]} (backtrack) → path [${path.join(', ')}].`, 'Return the element so other orders can use it.', { path: path.slice(), used: used.slice(), back: true }); }
        })();
      } else {
        const path = []; let sum = 0;
        (function go(i) {
          if (sp.full()) return;
          if (p.mode === 'sum') { if (sum === T) { found.push(path.join('+') + '=' + T); snap(0, `Sum ${sum} = target → solution {${path.join(', ')}}.`, 'Found a subset with the required sum.', { path: path.slice(), idx: i, sol: true }); return; } if (sum > T) { snap(0, `Sum ${sum} > ${T} → prune this branch.`, 'All numbers are positive, so adding more can only overshoot.', { path: path.slice(), idx: i, back: true }); return; } if (i === a.length) return; }
          else if (i === a.length) { found.push('{' + path.join(',') + '}'); snap(0, `Subset #${found.length}: {${path.join(', ')}}.`, 'Every element has been decided.', { path: path.slice(), idx: i, sol: true }); return; }
          path.push(a[i]); sum += a[i]; snap(2, `Include ${a[i]} → {${path.join(', ')}}, sum ${sum}.`, 'First branch: take the element.', { path: path.slice(), idx: i }); go(i + 1);
          path.pop(); sum -= a[i]; snap(3, `Exclude ${a[i]} → {${path.join(', ')}}, sum ${sum}.`, 'Second branch: skip the element.', { path: path.slice(), idx: i, back: true }); go(i + 1);
        })(0);
      }
      snap(0, sp.full() ? 'Step limit reached — showing partial results.' : `Finished: ${found.length} result(s).`, 'The recursion tree is exhausted.', { path: [], idx: -1 });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, marks = {}; (v.used || []).forEach((u, i) => { if (u) marks[i] = 'sel'; }); if (v.idx >= 0 && !v.used) marks[v.idx] = v.back ? 'swap' : 'cmp'; root.append(D.cells(v.a, marks, {}, 'Input'), D.chips('Current path:', v.path, v.sol ? 'good' : ''), D.chips('Results so far:', v.found.slice(-12))); },
  });

  /* ───────────────────────── Rat in a maze ───────────────────────── */
  register({
    id: 'maze', group: 'DSA', section: REC, title: 'Rat in a Maze (Backtracking)',
    blurb: 'Find a path from the top-left to the bottom-right, trying Down, Right, Up, Left and backing out of dead ends.',
    inputs: [{ key: 'grid', label: 'Maze rows separated by "/" (. open, # wall)', type: 'text', value: '..#../#.#.#/...../.###./...#.' }],
    pseudo: () => ['solve(r, c): if (r, c) is the goal → success', '  mark (r, c) as part of the path', '  for each move in D, R, U, L:', '    if the new cell is open and unvisited: if solve(new) → success', '  unmark (r, c) (dead end → backtrack)'],
    viva: [{ q: 'How does backtracking avoid infinite loops in a maze?', a: 'it marks visited cells on the current path and never revisits them' }],
    build(p) {
      const rows = String(p.grid).split(/[\/\n]/).map((r) => r.trim()).filter(Boolean), R = rows.length, W = rows[0] ? rows[0].length : 0; if (!R || R > 10 || W > 10 || rows.some((r) => r.length !== W || /[^.#]/.test(r))) throw new Error('Use equal-length rows of . and # (max 10×10).');
      if (rows[0][0] === '#' || rows[R - 1][W - 1] === '#') throw new Error('Start and goal cells must be open.');
      const path = [], dead = new Set(), onP = new Set(), sp = stepper(1500), key = (r, c) => r * W + c; let backs = 0;
      const snap = (line, msg, why, cur, kind) => sp.push(line, msg, why, { rows, R, W, path: path.slice(), dead: new Set(dead), cur, kind }, { position: cur === undefined ? '—' : `(${Math.floor(cur / W)},${cur % W})`, pathLength: path.length, backtracks: backs });
      snap(0, 'Rat starts at the top-left corner.', 'We look for any path to the bottom-right.');
      const go = (r, c) => {
        if (sp.full()) return false; path.push(key(r, c)); onP.add(key(r, c)); snap(1, `Step into (${r},${c}).`, 'This cell is part of the current path.', key(r, c), 'go');
        if (r === R - 1 && c === W - 1) { snap(0, `Goal reached! Path length ${path.length}.`, 'The recursion succeeded all the way back.', key(r, c), 'win'); return true; }
        for (const [dr, dc, nm] of [[1, 0, 'Down'], [0, 1, 'Right'], [-1, 0, 'Up'], [0, -1, 'Left']]) { const nr = r + dr, nc = c + dc; if (nr < 0 || nc < 0 || nr >= R || nc >= W || rows[nr][nc] === '#' || onP.has(key(nr, nc)) || dead.has(key(nr, nc))) continue; if (go(nr, nc)) return true; }
        path.pop(); onP.delete(key(r, c)); dead.add(key(r, c)); backs++; snap(4, `Dead end at (${r},${c}) → backtrack.`, 'No unexplored move leads to the goal from here.', key(r, c), 'back'); return false;
      };
      const ok = go(0, 0); if (!ok) snap(0, sp.full() ? 'Step limit reached.' : 'No path exists.', 'Every route ends in a wall.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, onP = new Set(v.path); root.append(D.board(v.rows.map((r) => [...r]), (i, j, ch) => { const k = i * v.W + j; if (ch === '#') return { cls: 'wall' }; if (k === v.cur) return { cls: v.kind === 'back' ? 'bad' : v.kind === 'win' ? 'goal' : 'try', text: '🐀' }; if (onP.has(k)) return { cls: 'path' }; if (v.dead.has(k)) return { cls: 'closed' }; return { text: i === 0 && j === 0 ? 'S' : i === v.R - 1 && j === v.W - 1 ? 'G' : '' }; }), h('p', { class: 'muted' }, 'Green = current path · Purple = dead ends.')); },
  });

  /* ───────────────────────── LCS ───────────────────────── */
  const dpTable = (root, v, rowsLabel, colsLabel) => root.append(D.grid({ corner: '', cols: ['', ...colsLabel], rows: ['', ...rowsLabel], cell: (i, j) => v.t[i][j], mark: (i, j) => (v.cur && v.cur[0] === i && v.cur[1] === j ? 'cur' : v.refs && v.refs.some(([a, b]) => a === i && b === j) ? 'ref' : v.path && v.path.some(([a, b]) => a === i && b === j) ? 'path' : '') }));
  register({
    id: 'lcs', group: 'DSA', section: DP, title: 'Longest Common Subsequence (LCS)',
    blurb: 'dp[i][j] = LCS length of the first i letters of A and first j letters of B.',
    inputs: [{ key: 'a', label: 'String A (≤ 10)', type: 'text', value: 'AGGTAB' }, { key: 'b', label: 'String B (≤ 10)', type: 'text', value: 'GXTXAYB' }],
    pseudo: () => ['if A[i] == B[j]: dp[i][j] = dp[i-1][j-1] + 1', 'else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])', 'traceback from dp[n][m]: matching letters belong to the LCS'],
    viva: [{ q: 'What is the difference between a substring and a subsequence?', a: 'substring must be contiguous subsequence keeps order but may skip characters' }, { q: 'Complexity of LCS dynamic programming?', a: 'O(n times m) time and space' }],
    build(p) {
      const A = letters(p.a, 'A'), B = letters(p.b, 'B'), n = A.length, m = B.length, t = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null))), sp = stepper(400);
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { t: t.map((r) => r.slice()), ...extra }, { cell: extra.cur ? `dp[${extra.cur[0]}][${extra.cur[1]}]` : '—', lcsLength: t[n][m] ?? '…' });
      snap(0, 'First row and column are 0: an empty string has an empty LCS.', 'Base cases.');
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        if (A[i - 1] === B[j - 1]) { t[i][j] = t[i - 1][j - 1] + 1; snap(0, `A[${i}]='${A[i - 1]}' = B[${j}]='${B[j - 1]}' → dp = diagonal + 1 = ${t[i][j]}.`, 'A matching letter extends the LCS of the shorter prefixes.', { cur: [i, j], refs: [[i - 1, j - 1]] }); }
        else { t[i][j] = Math.max(t[i - 1][j], t[i][j - 1]); snap(1, `'${A[i - 1]}' ≠ '${B[j - 1]}' → dp = max(up ${t[i - 1][j]}, left ${t[i][j - 1]}) = ${t[i][j]}.`, 'Without a match, drop the last letter of A or of B.', { cur: [i, j], refs: [[i - 1, j], [i, j - 1]] }); }
      }
      let i = n, j = m; const path = [[i, j]]; let s = '';
      while (i > 0 && j > 0) { if (A[i - 1] === B[j - 1]) { s = A[i - 1] + s; i--; j--; } else if (t[i - 1][j] >= t[i][j - 1]) i--; else j--; path.push([i, j]); }
      snap(2, `Traceback finished: LCS = "${s}" (length ${t[n][m]}).`, 'Follow the arrows back; diagonal moves collect matching letters.', { path });
      return { steps: sp.steps, meta: { A, B } };
    },
    render: (root, step, ctx) => dpTable(root, step.view, [...ctx.meta.A], [...ctx.meta.B]),
  });

  /* ───────────────────────── Edit distance ───────────────────────── */
  register({
    id: 'edit', group: 'DSA', section: DP, title: 'Edit Distance (Levenshtein)',
    blurb: 'Minimum insertions, deletions and replacements to turn A into B.',
    inputs: [{ key: 'a', label: 'From (≤ 9)', type: 'text', value: 'kitten' }, { key: 'b', label: 'To (≤ 9)', type: 'text', value: 'sitting' }],
    pseudo: () => ['dp[i][0] = i; dp[0][j] = j', 'if A[i] == B[j]: dp[i][j] = dp[i-1][j-1]', 'else: dp[i][j] = 1 + min(replace dp[i-1][j-1], delete dp[i-1][j], insert dp[i][j-1])', 'traceback to list the operations'],
    viva: [{ q: 'Explain the three operations in the edit distance recurrence.', a: 'replace uses the diagonal cell delete uses the cell above insert uses the cell to the left each cost one' }, { q: 'Where is edit distance used?', a: 'spell checking dna sequence alignment fuzzy matching diff tools' }],
    build(p) {
      const A = letters(p.a, 'From', 9), B = letters(p.b, 'To', 9), n = A.length, m = B.length, t = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : null))), sp = stepper(400);
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { t: t.map((r) => r.slice()), ...extra }, { cell: extra.cur ? `dp[${extra.cur[0]}][${extra.cur[1]}]` : '—', distance: t[n][m] ?? '…' });
      snap(0, 'Edge cells: turning a prefix into an empty string (or back) costs its length.', 'Base cases: i deletions or j insertions.');
      for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
        if (A[i - 1] === B[j - 1]) { t[i][j] = t[i - 1][j - 1]; snap(1, `'${A[i - 1]}' = '${B[j - 1]}' → no cost: copy the diagonal ${t[i][j]}.`, 'Equal letters need no edit.', { cur: [i, j], refs: [[i - 1, j - 1]] }); }
        else { const r = t[i - 1][j - 1], d = t[i - 1][j], ins = t[i][j - 1]; t[i][j] = 1 + Math.min(r, d, ins); snap(2, `'${A[i - 1]}' ≠ '${B[j - 1]}': replace ${r}, delete ${d}, insert ${ins} → 1 + min = ${t[i][j]}.`, 'Pick the cheapest of the three edits.', { cur: [i, j], refs: [[i - 1, j - 1], [i - 1, j], [i, j - 1]] }); }
      }
      let i = n, j = m; const path = [[i, j]], ops = [];
      while (i > 0 || j > 0) { if (i > 0 && j > 0 && A[i - 1] === B[j - 1] && t[i][j] === t[i - 1][j - 1]) { i--; j--; } else if (i > 0 && j > 0 && t[i][j] === t[i - 1][j - 1] + 1) { ops.unshift(`replace '${A[i - 1]}'→'${B[j - 1]}'`); i--; j--; } else if (i > 0 && t[i][j] === t[i - 1][j] + 1) { ops.unshift(`delete '${A[i - 1]}'`); i--; } else { ops.unshift(`insert '${B[j - 1]}'`); j--; } path.push([i, j]); }
      snap(3, `Edit distance = ${t[n][m]}. Operations: ${ops.join(', ') || 'none'}.`, 'Tracing back shows which edit produced each cell.', { path });
      return { steps: sp.steps, meta: { A, B } };
    },
    render: (root, step, ctx) => dpTable(root, step.view, [...ctx.meta.A], [...ctx.meta.B]),
  });

  /* ───────────────────────── LIS ───────────────────────── */
  register({
    id: 'lis', group: 'DSA', section: DP, title: 'Longest Increasing Subsequence',
    blurb: 'dp[i] = length of the longest increasing subsequence ending at i.',
    inputs: [{ key: 'arr', label: 'Array (≤ 12)', type: 'text', value: '10, 9, 2, 5, 3, 7, 101, 18' }],
    pseudo: () => ['dp[i] = 1 for all i', 'for i in 1..n-1:', '  for j in 0..i-1:', '    if a[j] < a[i] and dp[j] + 1 > dp[i]: dp[i] = dp[j] + 1; prev[i] = j', 'answer = max(dp); rebuild with prev'],
    viva: [{ q: 'What is the complexity of the dp solution and can it be improved?', a: 'O(n^2) improved to O(n log n) with patience sorting binary search on tails array' }],
    build(p) {
      const a = ints(p.arr, 'Array', { maxLen: 12 }), n = a.length, dp = Array(n).fill(1), prev = Array(n).fill(-1), sp = stepper(200);
      const snap = (line, msg, why, marks = {}) => sp.push(line, msg, why, { a, dp: dp.slice(), prev: prev.slice(), marks }, { dp: dp.slice(), prev: prev.slice(), best: Math.max(...dp) });
      snap(0, 'Every element alone is an increasing subsequence of length 1.', 'Base case.');
      for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) {
        if (a[j] < a[i]) { if (dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; snap(3, `a[${j}]=${a[j]} < a[${i}]=${a[i]}: extend → dp[${i}] = ${dp[i]}.`, 'Appending a[i] to the best sequence ending at j.', { [i]: 'swap', [j]: 'cmp' }); } else snap(3, `a[${j}]=${a[j]} < a[${i}]=${a[i]} but dp[${j}]+1 = ${dp[j] + 1} ≤ dp[${i}] → no gain.`, 'We already have an equally long sequence.', { [i]: 'sel', [j]: 'cmp' }); }
        else snap(2, `a[${j}]=${a[j]} ≥ a[${i}]=${a[i]} → cannot extend.`, 'The sequence must be strictly increasing.', { [i]: 'sel', [j]: 'dim' });
      }
      const bi = dp.indexOf(Math.max(...dp)), seq = []; for (let k = bi; k >= 0; k = prev[k]) seq.unshift(k);
      const marks = {}; seq.forEach((k) => (marks[k] = 'done')); snap(4, `LIS length ${dp[bi]}: [${seq.map((k) => a[k]).join(', ')}].`, 'Follow prev[] back from the best end index.', marks);
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(D.cells(v.a, v.marks, {}, 'array'), D.cells(v.dp, {}, {}, 'dp[i]'), D.cells(v.prev, {}, {}, 'prev[i]')); },
  });

  /* ───────────────────────── Coin change ───────────────────────── */
  register({
    id: 'coin', group: 'DSA', section: DP, title: 'Coin Change',
    blurb: 'Fewest coins for an amount, or the number of distinct ways to make it.',
    inputs: [{ key: 'coins', label: 'Coin values (≤ 5)', type: 'text', value: '1, 5, 6, 9' }, { key: 'amount', label: 'Amount (1–30)', type: 'number', value: 11, min: 1, max: 30 }, { key: 'mode', label: 'Question', type: 'select', value: 'min', options: [['min', 'Minimum number of coins'], ['ways', 'Number of ways']] }],
    pseudo: (p) => p.mode === 'min' ? ['dp[0] = 0; dp[a] = ∞', 'for a in 1..amount:', '  dp[a] = min over coins c ≤ a of dp[a-c] + 1', 'rebuild the coins from the best choices'] : ['dp[0] = 1; others 0', 'for each coin c:', '  for a in c..amount: dp[a] += dp[a-c]', 'each coin is processed once → combinations, not orderings'],
    viva: [{ q: 'Why does greedy fail for coin change but dynamic programming works?', a: 'greedy picks the largest coin which can be wrong for coin systems like 1 5 6 9 dp tries every coin using optimal substructure' }],
    build(p) {
      const coins = ints(p.coins, 'Coins', { maxLen: 5, lo: 1, hi: 30 }), W = clamp(Math.round(p.amount), 1, 30), min = p.mode === 'min', sp = stepper(300), dp = Array(W + 1).fill(min ? Infinity : 0), from = Array(W + 1).fill(null); dp[0] = min ? 0 : 1;
      const snap = (line, msg, why, marks = {}) => sp.push(line, msg, why, { dp: dp.slice(), marks, W }, { dp: dp.map((x) => (x === Infinity ? '∞' : x)), answer: dp[W] === Infinity ? '∞' : dp[W] });
      snap(0, min ? 'dp[0] = 0 coins; everything else unknown (∞).' : 'dp[0] = 1 way (use nothing).', 'Base case.');
      if (min) {
        for (let a = 1; a <= W; a++) { const cands = []; coins.forEach((c) => { if (c <= a && dp[a - c] !== Infinity) { cands.push(`${c}→${dp[a - c] + 1}`); if (dp[a - c] + 1 < dp[a]) { dp[a] = dp[a - c] + 1; from[a] = c; } } }); snap(2, `a=${a}: ${cands.length ? 'options (coin→count): ' + cands.join(', ') + ` → dp[${a}] = ${dp[a]}` : 'no coin fits → ∞'}.`, 'Take the coin that leaves the cheapest remainder.', { [a]: 'cmp' }); }
        if (dp[W] === Infinity) snap(3, `${W} cannot be made with these coins.`, 'No combination sums to the amount.'); else { const used = []; for (let a = W; a > 0; a -= from[a]) used.push(from[a]); const mk = {}; mk[W] = 'done'; snap(3, `Minimum ${dp[W]} coin(s): ${used.join(' + ')} = ${W}.`, 'Follow the stored best coin at each amount.', mk); }
      } else {
        coins.forEach((c) => { for (let a = c; a <= W; a++) { dp[a] += dp[a - c]; snap(2, `Coin ${c}: dp[${a}] += dp[${a - c}] → ${dp[a]}.`, 'Ways using coin c = ways to make a−c, then add c.', { [a]: 'cmp', [a - c]: 'sel' }); } });
        snap(3, `${dp[W]} way(s) to make ${W}.`, 'Outer loop over coins counts combinations once each.', { [W]: 'done' });
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(D.cells(v.dp.map((x) => (x === Infinity ? '∞' : x)), v.marks, {}, 'dp[0..amount]')); },
  });

  /* ───────────────────────── Matrix chain ───────────────────────── */
  register({
    id: 'mcm', group: 'DSA', section: DP, title: 'Matrix Chain Multiplication',
    blurb: 'Find the cheapest parenthesization. Matrix i has size dims[i-1] × dims[i].',
    inputs: [{ key: 'dims', label: 'Dimensions (3–8 numbers)', type: 'text', value: '10, 30, 5, 60' }],
    pseudo: () => ['m[i][i] = 0', 'for chain length L = 2..n:', '  for i, j = i+L-1:', '    m[i][j] = min over k of m[i][k] + m[k+1][j] + d[i-1]·d[k]·d[j]', 'rebuild the best parentheses from the split points'],
    viva: [{ q: 'Why does the order of multiplying matrices matter for cost?', a: 'multiplication is associative so the result is the same but the number of scalar multiplications differs depending on parenthesization' }, { q: 'Complexity of matrix chain DP?', a: 'O(n^3) time O(n^2) space' }],
    build(p) {
      const d = ints(p.dims, 'Dimensions', { maxLen: 8, minLen: 3, lo: 1, hi: 200 }), n = d.length - 1, m = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null)), sp0 = Array.from({ length: n + 1 }, () => Array(n + 1).fill(null)), sp = stepper(300);
      for (let i = 1; i <= n; i++) m[i][i] = 0;
      const snap = (line, msg, why, extra = {}) => sp.push(line, msg, why, { m: m.map((r) => r.slice()), n, ...extra }, { cell: extra.cur ? `m[${extra.cur[0]}][${extra.cur[1]}]` : '—', best: m[1][n] ?? '…' });
      snap(0, `${n} matrices: ${Array.from({ length: n }, (_, i) => `M${i + 1}(${d[i]}×${d[i + 1]})`).join(', ')}. A single matrix costs 0.`, 'Diagonal base case.');
      for (let L = 2; L <= n; L++) for (let i = 1; i + L - 1 <= n; i++) {
        const j = i + L - 1; m[i][j] = Infinity;
        for (let k = i; k < j; k++) { const c = m[i][k] + m[k + 1][j] + d[i - 1] * d[k] * d[j]; const better = c < m[i][j]; if (better) { m[i][j] = c; sp0[i][j] = k; } snap(3, `M${i}..M${j}, split after M${k}: ${m[i][k]} + ${m[k + 1][j]} + ${d[i - 1]}·${d[k]}·${d[j]} = ${c}${better ? ' (best so far)' : ''}.`, 'Cost of the two halves plus multiplying their results.', { cur: [i, j], refs: [[i, k], [k + 1, j]] }); }
      }
      const par = (i, j) => (i === j ? 'M' + i : '(' + par(i, sp0[i][j]) + par(sp0[i][j] + 1, j) + ')');
      snap(4, `Minimum cost ${m[1][n]} with ${par(1, n)}.`, 'Split points record where each best chain breaks.', { path: [[1, n]] });
      return { steps: sp.steps, meta: { n } };
    },
    render(root, step, ctx) { const v = step.view, N = ctx.meta.n, idx = Array.from({ length: N }, (_, i) => i + 1); root.append(D.grid({ corner: 'i \\ j', cols: idx, rows: idx, cell: (i, j) => (j + 1 < i + 1 ? '' : v.m[i + 1][j + 1] === Infinity ? '…' : v.m[i + 1][j + 1]), mark: (i, j) => (v.cur && v.cur[0] === i + 1 && v.cur[1] === j + 1 ? 'cur' : v.refs && v.refs.some(([a, b]) => a === i + 1 && b === j + 1) ? 'ref' : v.path && v.path.some(([a, b]) => a === i + 1 && b === j + 1) ? 'path' : '') })); },
  });

  /* ───────────────────────── Activity selection ───────────────────────── */
  const bar = (label, a, b, max, cls) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('span', { class: 'label', style: { width: '70px' } }, label), h('div', { class: 'timeline', style: { flex: 1 } }, h('div', { class: 'tbar ' + cls, style: { left: (a / max) * 100 + '%', width: Math.max(((b - a) / max) * 100, 1.5) + '%' } }, `${a}-${b}`)));
  register({
    id: 'activity', group: 'DSA', section: GRE, title: 'Activity Selection',
    blurb: 'Pick the maximum number of non-overlapping activities by always taking the one that finishes first.',
    inputs: [{ key: 'acts', label: 'Activities (start-finish, comma separated)', type: 'text', value: '1-4, 3-5, 0-6, 5-7, 3-9, 5-9, 6-10, 8-11, 8-12, 2-14, 12-16' }],
    pseudo: () => ['sort activities by finish time', 'last = -∞', 'for each activity (s, f) in order:', '  if s ≥ last: select it; last = f', '  else: skip (overlaps)'],
    viva: [{ q: 'Why does choosing the earliest finishing activity give an optimal schedule?', a: 'it leaves the most room for remaining activities exchange argument greedy choice property' }],
    build(p) {
      const acts = String(p.acts).split(/[,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => { const m = t.match(/^(\d+)\s*-\s*(\d+)$/); if (!m || +m[2] <= +m[1]) throw new Error(`Bad activity "${t}". Use start-finish with finish > start.`); return { s: +m[1], f: +m[2], name: 'A' }; }); if (acts.length > 12) throw new Error('Use at most 12 activities.');
      acts.forEach((a, i) => (a.name = 'A' + (i + 1))); const sorted = acts.slice().sort((x, y) => x.f - y.f), max = Math.max(...acts.map((a) => a.f)), sp = stepper(60), st = {}; let last = -Infinity, cnt = 0;
      const snap = (line, msg, why, cur) => sp.push(line, msg, why, { sorted, st: { ...st }, cur, max, last }, { selected: sorted.filter((a) => st[a.name] === 'pick').map((a) => a.name), lastFinish: last === -Infinity ? '—' : last });
      snap(0, `Sorted by finish time: ${sorted.map((a) => `${a.name}(${a.s}-${a.f})`).join(', ')}.`, 'Finishing early leaves the most room for later activities.');
      sorted.forEach((a) => { if (a.s >= last) { st[a.name] = 'pick'; last = a.f; cnt++; snap(3, `${a.name} (${a.s}-${a.f}): starts at ${a.s} ≥ last finish → SELECT. last = ${a.f}.`, 'It does not overlap the previously chosen activity.', a.name); } else { st[a.name] = 'skip'; snap(4, `${a.name} (${a.s}-${a.f}): starts before ${last} → overlaps, SKIP.`, 'Overlapping activities cannot both be chosen.', a.name); } });
      snap(0, `Selected ${cnt} activities: ${sorted.filter((a) => st[a.name] === 'pick').map((a) => a.name).join(', ')}.`, 'This is the maximum possible.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(...v.sorted.map((a) => bar(a.name, a.s, a.f, v.max, v.cur === a.name ? 'cur' : v.st[a.name] || ''))); },
  });

  /* ───────────────────────── Fractional knapsack ───────────────────────── */
  register({
    id: 'fknap', group: 'DSA', section: GRE, title: 'Fractional Knapsack',
    blurb: 'Take items in order of value-per-weight; split the last one to fill the bag exactly.',
    inputs: [{ key: 'items', label: 'Items (value:weight)', type: 'text', value: '60:10, 100:20, 120:30, 30:5' }, { key: 'cap', label: 'Capacity', type: 'number', value: 50, min: 1, max: 500 }],
    pseudo: () => ['compute ratio = value / weight for every item', 'sort by ratio, highest first', 'for each item: if it fits completely, take all of it', '  else take the fraction that fills the remaining capacity and stop'],
    viva: [{ q: 'Why does greedy work for fractional knapsack but not 0/1 knapsack?', a: 'items can be split so taking the best ratio first never wastes capacity in 0/1 you cannot split so greedy can leave unused space' }],
    build(p) {
      const items = String(p.items).split(/[,;]+/).map((t) => t.trim()).filter(Boolean).map((t, i) => { const m = t.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/); if (!m || +m[2] <= 0) throw new Error(`Bad item "${t}". Use value:weight.`); return { name: 'I' + (i + 1), v: +m[1], w: +m[2], r: +m[1] / +m[2], take: 0 }; }); if (items.length > 10) throw new Error('Use at most 10 items.');
      let cap = clamp(Math.round(p.cap), 1, 500); const C = cap, sorted = items.slice().sort((a, b) => b.r - a.r), sp = stepper(50); let total = 0;
      const snap = (line, msg, why, cur) => sp.push(line, msg, why, { sorted: sorted.map((x) => ({ ...x })), cur, cap, C, total }, { remaining: +cap.toFixed(2), totalValue: +total.toFixed(2) });
      snap(1, `Sorted by value/weight: ${sorted.map((x) => `${x.name}(${x.r.toFixed(2)})`).join(', ')}.`, 'Best "bang per kilo" first.');
      for (const it of sorted) {
        if (cap <= 0) break;
        if (it.w <= cap) { it.take = 1; cap -= it.w; total += it.v; snap(2, `Take all of ${it.name} (w=${it.w}, v=${it.v}). Remaining capacity ${cap}.`, 'It fits completely.', it.name); }
        else { it.take = cap / it.w; total += it.v * it.take; snap(3, `Only ${cap} left: take ${(it.take * 100).toFixed(0)}% of ${it.name} → value ${(it.v * it.take).toFixed(2)}.`, 'Fill the remaining space with a fraction of the next-best item.', it.name); cap = 0; }
      }
      snap(3, `Done: total value ${total.toFixed(2)}.`, 'The bag is full (or all items are taken).');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(h('table', { class: 'grid' }, h('tr', {}, ['Item', 'Value', 'Weight', 'Ratio', 'Taken'].map((t) => h('th', {}, t))), v.sorted.map((x) => h('tr', {}, h('td', { class: v.cur === x.name ? 'cur' : '' }, x.name), h('td', {}, x.v), h('td', {}, x.w), h('td', {}, x.r.toFixed(2)), h('td', { class: x.take ? 'path' : '' }, x.take ? (x.take * 100).toFixed(0) + '%' : '—')))), D.stats({ 'Capacity used': `${(v.C - v.cap).toFixed(1)} / ${v.C}`, 'Total value': v.total.toFixed(2) })); },
  });

  /* ───────────────────────── Job sequencing ───────────────────────── */
  register({
    id: 'jobs', group: 'DSA', section: GRE, title: 'Job Sequencing with Deadlines',
    blurb: 'Each job takes one slot and earns profit only if done by its deadline. Greedy: highest profit first, latest free slot.',
    inputs: [{ key: 'jobs', label: 'Jobs (name:deadline:profit)', type: 'text', value: 'a:2:100, b:1:19, c:2:27, d:1:25, e:3:15' }],
    pseudo: () => ['sort jobs by profit, highest first', 'for each job:', '  find the latest free slot ≤ its deadline', '  if found: schedule it there', '  else: reject the job'],
    viva: [{ q: 'Why schedule a job in the latest free slot before its deadline?', a: 'it keeps earlier slots free for jobs with tighter deadlines' }],
    build(p) {
      const jobs = String(p.jobs).split(/[,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => { const m = t.match(/^(\w+)\s*:\s*(\d+)\s*:\s*(\d+)$/); if (!m || +m[2] < 1) throw new Error(`Bad job "${t}". Use name:deadline:profit (deadline ≥ 1).`); return { n: m[1], d: +m[2], p: +m[3] }; }); if (jobs.length > 10) throw new Error('Use at most 10 jobs.');
      const sorted = jobs.slice().sort((a, b) => b.p - a.p), T = Math.min(10, Math.max(...jobs.map((j) => j.d))), slots = Array(T).fill(null), sp = stepper(60); let total = 0;
      const snap = (line, msg, why, cur) => sp.push(line, msg, why, { slots: slots.slice(), cur, sorted }, { slots: slots.map((x) => x ?? '·'), profit: total });
      snap(0, `Jobs by profit: ${sorted.map((j) => `${j.n}(d${j.d},$${j.p})`).join(', ')}. ${T} time slot(s).`, 'Most profitable jobs get first pick.');
      sorted.forEach((j) => { let s = Math.min(j.d, T) - 1; while (s >= 0 && slots[s]) s--; if (s >= 0) { slots[s] = j.n; total += j.p; snap(3, `${j.n} (deadline ${j.d}, profit ${j.p}): latest free slot ≤ ${j.d} is slot ${s + 1} → schedule. Profit = ${total}.`, 'Using the latest possible slot keeps earlier ones open.', j.n); } else snap(4, `${j.n} (deadline ${j.d}): all slots up to ${j.d} are taken → reject.`, 'No free slot meets the deadline.', j.n); });
      snap(0, `Schedule: ${slots.map((x) => x ?? '–').join(' → ')}. Total profit ${total}.`, 'Greedy by profit gives the optimal schedule here.');
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, marks = {}; v.slots.forEach((x, i) => { if (x) marks[i] = x === v.cur ? 'done' : 'sel'; }); root.append(D.cells(v.slots, marks, {}, 'Time slots (index + 1 = slot number)')); },
  });
})();
