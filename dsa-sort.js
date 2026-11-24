/* dsa-sort.js — Sorting algorithms, searching, two pointers / sliding window, Kadane. */
(function () {
  'use strict';
  const { h, clamp, register } = window.CSViz;
  const { ints, stepper } = window.DSA;
  const SORT = 'Sorting', ARR = 'Searching & Arrays';
  const done = (from, to, extra) => { const m = {}; for (let i = from; i <= to; i++) m[i] = 'done'; return Object.assign(m, extra); };

  /* generic bar-chart sorter: def.run(st, emit) does the work */
  function sortViz(def) {
    register({
      id: def.id, group: 'DSA', section: SORT, title: def.title, blurb: def.blurb,
      inputs: [{ key: 'arr', label: 'Array (comma separated, ≤ 20 numbers)', type: 'text', value: def.sample || '5, 2, 9, 1, 7, 3, 8' }],
      pseudo: () => def.pseudo, viva: def.viva,
      build(p) {
        const a = ints(p.arr, 'Array', { maxLen: 20, minLen: 1 });
        const st = { a: a.slice(), cmp: 0, swp: 0 }, sp = stepper(4000);
        const emit = (line, msg, why, marks, ptrs, extra = {}) => sp.push(line, msg, why,
          { a: st.a.slice(), marks: marks || {}, ptrs: ptrs || {}, aux: extra.aux },
          { array: st.a.slice(), comparisons: st.cmp, [def.countName || 'swaps']: st.swp, ...(extra.info || {}) });
        emit(0, `Unsorted array of ${a.length} element(s). ${def.title} is about to start.`, 'Nothing has been compared yet.', {}, {});
        def.run(st, emit);
        emit(def.pseudo.length - 1, `Sorted! ${st.cmp} comparisons, ${st.swp} ${def.countName || 'swaps'}.`, 'No more elements are out of order.', done(0, st.a.length - 1), {});
        return { steps: sp.steps, meta: {} };
      },
      render(root, step) { root.append(window.DSA.bars(step.view.a, step.view.marks, step.view.ptrs), ...window.DSA.aux(step.view.aux)); },
    });
  }

  sortViz({
    id: 'bubble', title: 'Bubble Sort', blurb: 'Repeatedly swap adjacent out-of-order pairs; the largest value bubbles to the end each pass.',
    pseudo: ['for i in 0..n-2:', '  swapped = false', '  for j in 0..n-2-i:', '    if a[j] > a[j+1]: swap; swapped = true', '  if not swapped: break', 'sorted'],
    viva: [{ q: 'What are the best and worst case time complexities of bubble sort?', a: 'best O(n) with early exit when already sorted worst and average O(n^2)' }, { q: 'Is bubble sort stable and in-place?', a: 'stable because equal elements are never swapped in place O(1) extra space' }],
    run(st, emit) {
      const a = st.a, n = a.length;
      for (let i = 0; i < n - 1; i++) {
        let sw = false;
        for (let j = 0; j < n - 1 - i; j++) {
          st.cmp++;
          emit(2, `Compare a[${j}]=${a[j]} with a[${j + 1}]=${a[j + 1]}.`, 'Bubble sort looks at each adjacent pair.', done(n - i, n - 1, { [j]: 'cmp', [j + 1]: 'cmp' }), { j });
          if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; st.swp++; sw = true; emit(3, `${a[j + 1]} > ${a[j]}, so swap them.`, 'The left value is larger, so the pair is out of order.', done(n - i, n - 1, { [j]: 'swap', [j + 1]: 'swap' }), { j }); }
        }
        if (!sw) { emit(4, `Pass ${i + 1} made no swaps → array is already sorted, stop early.`, 'A pass without swaps proves every adjacent pair is in order.', done(0, n - 1), {}); break; }
      }
    },
  });

  sortViz({
    id: 'selection', title: 'Selection Sort', blurb: 'Find the minimum of the unsorted part and swap it to the front.',
    pseudo: ['for i in 0..n-2:', '  min = i', '  for j in i+1..n-1: if a[j] < a[min]: min = j', '  swap(a[i], a[min])', 'sorted'],
    viva: [{ q: 'Why is selection sort always O(n^2) but does at most n-1 swaps?', a: 'it always scans the whole unsorted part to find the minimum but only swaps once per pass' }, { q: 'Is selection sort stable?', a: 'not stable because the long distance swap can move equal elements past each other' }],
    run(st, emit) {
      const a = st.a, n = a.length;
      for (let i = 0; i < n - 1; i++) {
        let m = i;
        emit(1, `Pass ${i}: assume the minimum is a[${i}]=${a[i]}.`, 'We search the unsorted suffix for its smallest value.', done(0, i - 1, { [i]: 'min' }), { i, min: m });
        for (let j = i + 1; j < n; j++) {
          st.cmp++;
          const better = a[j] < a[m];
          emit(2, `Compare a[${j}]=${a[j]} with current min a[${m}]=${a[m]}${better ? ` → new minimum at ${j}.` : ' → no change.'}`, 'Keep the smallest value seen so far.', done(0, i - 1, { [m]: 'min', [j]: 'cmp' }), { i, j, min: m });
          if (better) m = j;
        }
        if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; st.swp++; }
        emit(3, m !== i ? `Swap the minimum ${a[i]} into position ${i}.` : `Minimum already at position ${i}; no swap.`, 'The minimum of the unsorted part belongs at the front of it.', done(0, i), { i });
      }
    },
  });

  sortViz({
    id: 'insertion', title: 'Insertion Sort', blurb: 'Grow a sorted prefix by inserting each new element into its correct place.', countName: 'shifts',
    pseudo: ['for i in 1..n-1:', '  key = a[i]; j = i-1', '  while j ≥ 0 and a[j] > key: a[j+1] = a[j]; j--', '  a[j+1] = key', 'sorted'],
    viva: [{ q: 'When is insertion sort faster than other O(n^2) sorts and why?', a: 'nearly sorted input runs in O(n) because few shifts are needed adaptive and stable and online' }],
    run(st, emit) {
      const a = st.a, n = a.length;
      for (let i = 1; i < n; i++) {
        const key = a[i]; let j = i - 1;
        emit(1, `Take key = a[${i}] = ${key}; the prefix a[0..${i - 1}] is sorted.`, 'We insert the key into the sorted prefix.', done(0, i - 1, { [i]: 'sel' }), { i, j });
        while (j >= 0) {
          st.cmp++;
          if (a[j] > key) { a[j + 1] = a[j]; st.swp++; emit(2, `${a[j]} > ${key} → shift ${a[j]} one place right.`, 'Larger elements move right to open a gap for the key.', { [j + 1]: 'swap', [j]: 'cmp' }, { j }); j--; }
          else { emit(2, `${a[j]} ≤ ${key} → stop; the gap is at position ${j + 1}.`, 'The key is not smaller than a[j], so its place is found.', { [j]: 'cmp' }, { j }); break; }
        }
        a[j + 1] = key;
        emit(3, `Insert ${key} at position ${j + 1}.`, 'The sorted prefix now has one more element.', done(0, i, { [j + 1]: 'sel' }), { j: j + 1 });
      }
    },
  });

  sortViz({
    id: 'merge', title: 'Merge Sort', blurb: 'Divide the array in halves, sort each recursively, then merge the sorted halves.', countName: 'writes',
    pseudo: ['mergeSort(l, r): if l ≥ r return', '  mid = (l+r)/2; mergeSort(l,mid); mergeSort(mid+1,r)', '  merge: compare front of left and right halves', '  copy the smaller one into a[k]', '  copy any leftovers', 'sorted'],
    viva: [{ q: 'What is the time and space complexity of merge sort?', a: 'O(n log n) in all cases and O(n) extra space for the temporary arrays' }, { q: 'Why is merge sort stable?', a: 'when elements are equal the one from the left half is copied first preserving order' }],
    run(st, emit) {
      const a = st.a;
      const range = (l, r, extra) => { const m = {}; for (let i = l; i <= r; i++) m[i] = 'range'; return Object.assign(m, extra); };
      (function ms(l, r) {
        if (l >= r) return;
        const mid = (l + r) >> 1;
        emit(1, `Split a[${l}..${r}] into a[${l}..${mid}] and a[${mid + 1}..${r}].`, 'Divide: halve the problem until single elements (already sorted) remain.', range(l, r), {});
        ms(l, mid); ms(mid + 1, r);
        const L = a.slice(l, mid + 1), R = a.slice(mid + 1, r + 1); let i = 0, j = 0, k = l;
        const aux = () => [{ title: 'left half', cells: L, ptrs: { i } }, { title: 'right half', cells: R, ptrs: { j } }];
        while (i < L.length && j < R.length) {
          st.cmp++;
          const takeL = L[i] <= R[j];
          emit(2, `Merge: compare ${L[i]} (left) with ${R[j]} (right) → take ${takeL ? L[i] : R[j]}.`, 'Both halves are sorted, so the smaller front element goes next.', range(l, r, { [k]: 'cmp' }), { k }, { aux: aux() });
          a[k] = takeL ? L[i++] : R[j++]; st.swp++; k++;
          emit(3, `Write ${a[k - 1]} to a[${k - 1}].`, 'Copy the chosen value into the output position.', range(l, r, { [k - 1]: 'swap' }), { k }, { aux: aux() });
        }
        while (i < L.length) { a[k] = L[i++]; st.swp++; k++; emit(4, `Copy leftover ${a[k - 1]} from the left half to a[${k - 1}].`, 'Only one half has elements left, so copy them as they are.', range(l, r, { [k - 1]: 'swap' }), { k }, { aux: aux() }); }
        while (j < R.length) { a[k] = R[j++]; st.swp++; k++; emit(4, `Copy leftover ${a[k - 1]} from the right half to a[${k - 1}].`, 'Only one half has elements left, so copy them as they are.', range(l, r, { [k - 1]: 'swap' }), { k }, { aux: aux() }); }
      })(0, a.length - 1);
    },
  });

  sortViz({
    id: 'quick', title: 'Quick Sort', blurb: 'Partition around a pivot (Lomuto scheme), then sort both sides recursively.',
    pseudo: ['quickSort(lo, hi): if lo < hi', '  pivot = a[hi]; i = lo - 1', '  for j in lo..hi-1: if a[j] < pivot: i++; swap(a[i], a[j])', '  swap(a[i+1], a[hi])  → pivot is in its final place', '  quickSort(lo, i); quickSort(i+2, hi)', 'sorted'],
    viva: [{ q: 'What is the worst case of quick sort and how can it be avoided?', a: 'O(n^2) when the pivot is always the smallest or largest such as sorted input avoid with random pivot or median of three' }, { q: 'Is quick sort stable and what is its space usage?', a: 'not stable in place with O(log n) recursion stack on average' }],
    run(st, emit) {
      const a = st.a, fixed = {};
      const fx = (extra) => Object.assign({}, fixed, extra);
      (function qs(lo, hi) {
        if (lo > hi) return;
        if (lo === hi) { fixed[lo] = 'done'; return; }
        const pv = a[hi]; let i = lo - 1;
        emit(1, `Partition a[${lo}..${hi}] with pivot a[${hi}] = ${pv}.`, 'Everything smaller than the pivot must end up on its left.', fx({ [hi]: 'pivot' }), { lo, hi });
        for (let j = lo; j < hi; j++) {
          st.cmp++;
          const less = a[j] < pv;
          emit(2, `Compare a[${j}]=${a[j]} with pivot ${pv} → ${less ? 'smaller, move it to the left region' : 'not smaller, leave it'}.`, 'Elements < pivot are collected at the front via index i.', fx({ [hi]: 'pivot', [j]: 'cmp' }), { i, j });
          if (less) { i++; if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; st.swp++; emit(2, `Swap a[${i}] and a[${j}].`, 'Bring the smaller element into the left region.', fx({ [hi]: 'pivot', [i]: 'swap', [j]: 'swap' }), { i, j }); } }
        }
        [a[i + 1], a[hi]] = [a[hi], a[i + 1]]; if (i + 1 !== hi) st.swp++;
        fixed[i + 1] = 'done';
        emit(3, `Place the pivot ${pv} at index ${i + 1}: it is now in its final sorted position.`, 'Left of the pivot are smaller values, right are larger.', fx(), { p: i + 1 });
        qs(lo, i); qs(i + 2, hi);
      })(0, a.length - 1);
    },
  });

  sortViz({
    id: 'heap', title: 'Heap Sort', blurb: 'Build a max-heap in the array, then repeatedly move the maximum to the end.',
    pseudo: ['build max-heap: for i = n/2-1 down to 0: heapify(i)', 'heapify(i): pick the largest of i and its children; swap and continue down', 'for end = n-1 down to 1:', '  swap(a[0], a[end]); heap size--', '  heapify(0)', 'sorted'],
    viva: [{ q: 'What is the complexity of building a heap and of heap sort overall?', a: 'building is O(n) heap sort is O(n log n) in all cases in place not stable' }],
    run(st, emit) {
      const a = st.a, n = a.length;
      const heapify = (size, i) => {
        for (;;) {
          let big = i; const l = 2 * i + 1, r = l + 1;
          if (l < size) { st.cmp++; if (a[l] > a[big]) big = l; }
          if (r < size) { st.cmp++; if (a[r] > a[big]) big = r; }
          emit(1, `Heapify node ${i} (${a[i]}): children ${l < size ? a[l] : '—'}, ${r < size ? a[r] : '—'} → largest is ${a[big]}.`, 'In a max-heap each parent must be ≥ its children.', done(size, n - 1, { [i]: 'cmp', ...(l < size ? { [l]: 'cmp' } : {}), ...(r < size ? { [r]: 'cmp' } : {}) }), { i });
          if (big === i) break;
          [a[i], a[big]] = [a[big], a[i]]; st.swp++;
          emit(1, `Swap a[${i}] and a[${big}]; continue sifting down.`, 'The larger child moves up to restore the heap property.', done(size, n - 1, { [i]: 'swap', [big]: 'swap' }), { i: big });
          i = big;
        }
      };
      for (let i = (n >> 1) - 1; i >= 0; i--) heapify(n, i);
      emit(0, 'Max-heap built: a[0] is the largest element.', 'Heap construction finished.', {}, {});
      for (let end = n - 1; end >= 1; end--) {
        [a[0], a[end]] = [a[end], a[0]]; st.swp++;
        emit(3, `Move the maximum ${a[end]} to position ${end}; shrink the heap.`, 'The root is the max, so it goes to its final place at the end.', done(end, n - 1, { [0]: 'swap' }), { end });
        heapify(end, 0);
      }
    },
  });

  /* ── counting / radix / bucket ── */
  register({
    id: 'linsort', group: 'DSA', section: SORT, title: 'Counting, Radix & Bucket Sort',
    blurb: 'Non-comparison sorts: count occurrences, sort digit by digit, or scatter into buckets.',
    inputs: [
      { key: 'arr', label: 'Array (non-negative; counting sort ≤ 60)', type: 'text', value: '29, 53, 12, 47, 5, 38, 60, 21' },
      { key: 'algo', label: 'Algorithm', type: 'select', value: 'radix', options: [['counting', 'Counting sort'], ['radix', 'Radix sort (LSD)'], ['bucket', 'Bucket sort']] },
      { key: 'k', label: 'Buckets (bucket sort)', type: 'range', value: 4, min: 2, max: 8, step: 1 },
    ],
    pseudo: (p) => ({
      counting: ['count[v]++ for every element', 'prefix sums: count[i] += count[i-1]', 'for i = n-1 down to 0: out[--count[a[i]]] = a[i]', 'copy out → a'],
      radix: ['for each digit (1s, 10s, 100s…):', '  distribute elements into buckets 0-9 by that digit', '  collect buckets in order (stable)', 'sorted'],
      bucket: ['create k buckets over the value range', 'scatter each element into its bucket', 'sort each bucket (insertion sort)', 'concatenate buckets'],
    })[p.algo],
    viva: [{ q: 'When do counting sort and radix sort beat comparison sorts, and what is their cost?', a: 'when keys are integers in a small range O(n + k) or O(d(n+k)) beats the n log n lower bound uses extra space' }, { q: 'Why must radix sort use a stable sub-sort?', a: 'so the order from previous digit passes is preserved among equal digits' }],
    build(p) {
      const a0 = ints(p.arr, 'Array', { maxLen: 16, lo: 0, hi: 999 }), n = a0.length, sp = stepper(2000);
      let a = a0.slice(); const algo = p.algo;
      const emit = (line, msg, why, marks, aux, info) => sp.push(line, msg, why, { a: a.slice(), marks: marks || {}, ptrs: {}, aux }, { array: a.slice(), ...info });
      emit(0, `${algo} sort on ${n} elements.`, 'Starting state.', {}, [], {});
      if (algo === 'counting') {
        const mx = Math.max(...a); if (mx > 60) throw new Error('Counting sort demo: use values ≤ 60 (or switch to radix).');
        const cnt = Array(mx + 1).fill(0), out = Array(n).fill(null);
        const aux = (cm, om) => [{ title: 'count[0..' + mx + ']', cells: cnt.slice(), marks: cm || {} }, { title: 'output', cells: out.slice(), marks: om || {} }];
        a.forEach((v, i) => { cnt[v]++; emit(0, `Count value ${v}: count[${v}] = ${cnt[v]}.`, 'Each value tallies how many times it occurs.', { [i]: 'cmp' }, aux({ [v]: 'swap' }), { count: cnt.slice() }); });
        for (let i = 1; i <= mx; i++) { cnt[i] += cnt[i - 1]; emit(1, `Prefix sum: count[${i}] = ${cnt[i]} (number of elements ≤ ${i}).`, 'The prefix sum tells where each value ends in the sorted output.', {}, aux({ [i]: 'swap', [i - 1]: 'cmp' }), { count: cnt.slice() }); }
        for (let i = n - 1; i >= 0; i--) { const v = a[i], pos = --cnt[v]; out[pos] = v; emit(2, `Place ${v} at output[${pos}] (scanning right-to-left keeps it stable).`, 'count[v]-1 is the last free slot for value v.', { [i]: 'cmp' }, aux({ [v]: 'swap' }, { [pos]: 'done' }), { count: cnt.slice() }); }
        a = out.slice(); emit(3, 'Copy the output array back.', 'The output array is the sorted result.', done(0, n - 1), [], {});
      } else if (algo === 'radix') {
        const mx = Math.max(...a);
        for (let exp = 1; Math.floor(mx / exp) > 0; exp *= 10) {
          const bk = Array.from({ length: 10 }, () => []);
          const aux = (hi) => [{ title: `buckets by digit (×${exp})`, cells: bk.map((b) => b.join(' ')), marks: hi === undefined ? {} : { [hi]: 'swap' } }];
          a.forEach((v, i) => { const d = Math.floor(v / exp) % 10; bk[d].push(v); emit(1, `Digit (×${exp}) of ${v} is ${d} → bucket ${d}.`, 'Elements are distributed by the current digit, keeping arrival order.', { [i]: 'cmp' }, aux(d), { exp }); });
          a = bk.flat(); emit(2, `Collect buckets 0→9: ${a.join(', ')}.`, 'Concatenating buckets gives an array sorted by the current digit (stable).', {}, aux(), { exp });
        }
        emit(3, 'All digits processed: the array is sorted.', 'After the most significant digit pass everything is ordered.', done(0, n - 1), [], {});
      } else {
        const k = clamp(Math.round(p.k), 2, 8), mn = Math.min(...a), mx = Math.max(...a), bk = Array.from({ length: k }, () => []);
        const aux = (hi) => [{ title: `buckets (range ${mn}–${mx})`, cells: bk.map((b) => b.join(' ')), marks: hi === undefined ? {} : { [hi]: 'swap' } }];
        a.forEach((v, i) => { const b = Math.min(k - 1, Math.floor(((v - mn) / (mx - mn + 1)) * k)); bk[b].push(v); emit(1, `${v} → bucket ${b}.`, 'The bucket index is proportional to the value within the range.', { [i]: 'cmp' }, aux(b), {}); });
        bk.forEach((b, bi) => { b.sort((x, y) => x - y); emit(2, `Sort bucket ${bi}: [${b.join(', ')}].`, 'Each bucket is small, so a simple insertion sort is cheap.', {}, aux(bi), {}); });
        a = bk.flat(); emit(3, `Concatenate buckets: ${a.join(', ')}.`, 'Buckets are ordered by range, so concatenation is sorted.', done(0, n - 1), [], {});
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { root.append(window.DSA.bars(step.view.a, step.view.marks, step.view.ptrs), ...window.DSA.aux(step.view.aux)); },
  });

  /* ───────────────────────── Searching ───────────────────────── */
  register({
    id: 'search', group: 'DSA', section: ARR, title: 'Linear & Binary Search',
    blurb: 'Scan one by one, or halve the search range of a sorted array.',
    inputs: [
      { key: 'arr', label: 'Array', type: 'text', value: '4, 8, 15, 16, 23, 42, 57, 61' },
      { key: 'target', label: 'Target', type: 'number', value: 23 },
      { key: 'algo', label: 'Algorithm', type: 'select', value: 'binary', options: [['linear', 'Linear search'], ['binary', 'Binary search (sorts first)']] },
    ],
    pseudo: (p) => p.algo === 'linear'
      ? ['for i in 0..n-1:', '  if a[i] == target: return i', 'return -1']
      : ['lo = 0; hi = n-1', 'while lo ≤ hi:', '  mid = (lo + hi) / 2', '  if a[mid] == target: return mid', '  if a[mid] < target: lo = mid+1 else hi = mid-1', 'return -1'],
    viva: [{ q: 'Why must the array be sorted for binary search and what is its complexity?', a: 'comparing with the middle element lets us discard half only if order is known O(log n) time' }, { q: 'How do you avoid integer overflow when computing mid?', a: 'use lo + (hi - lo) / 2 instead of (lo + hi) / 2' }],
    build(p) {
      let a = ints(p.arr, 'Array', { maxLen: 20 }); const t = Math.round(p.target), sp = stepper(500);
      const bin = p.algo === 'binary', info = (x) => ({ array: a.slice(), target: t, ...x });
      const emit = (line, msg, why, marks, ptrs, x) => sp.push(line, msg, why, { a: a.slice(), marks, ptrs }, info(x));
      if (bin && a.some((v, i) => i && v < a[i - 1])) { a = a.slice().sort((x, y) => x - y); emit(0, `Binary search needs sorted data, so the array was sorted: ${a.join(', ')}.`, 'Halving only works when order is known.', {}, {}, {}); }
      else emit(0, `Search for ${t} in ${a.length} elements.`, 'Starting state.', {}, {}, {});
      if (!bin) {
        for (let i = 0; i < a.length; i++) {
          if (a[i] === t) { emit(1, `a[${i}] = ${a[i]} equals ${t} → found at index ${i}.`, 'The scan stops at the first match.', { [i]: 'done' }, { i }, { result: i }); return { steps: sp.steps, meta: {} }; }
          emit(1, `a[${i}] = ${a[i]} ≠ ${t}, move on.`, 'Linear search checks elements in order.', { [i]: 'cmp' }, { i }, { checked: i + 1 });
        }
        emit(2, `${t} is not in the array → return -1.`, 'Every element was checked.', {}, {}, { result: -1 });
      } else {
        let lo = 0, hi = a.length - 1, steps = 0;
        const rng = (extra) => { const m = {}; a.forEach((_, i) => { m[i] = i < lo || i > hi ? 'dim' : 'range'; }); return Object.assign(m, extra); };
        while (lo <= hi) {
          const mid = (lo + hi) >> 1; steps++;
          emit(2, `lo=${lo}, hi=${hi} → mid=${mid}, a[mid]=${a[mid]}.`, 'Look at the middle of the remaining range.', rng({ [mid]: 'cmp' }), { lo, mid, hi }, { lo, mid, hi, probes: steps });
          if (a[mid] === t) { emit(3, `a[${mid}] = ${t} → found at index ${mid} after ${steps} probe(s).`, 'The middle element equals the target.', rng({ [mid]: 'done' }), { mid }, { result: mid, probes: steps }); return { steps: sp.steps, meta: {} }; }
          if (a[mid] < t) { lo = mid + 1; emit(4, `${a[mid]} < ${t} → discard the left half: lo = ${lo}.`, 'The target must be to the right because the array is sorted.', rng(), { lo, hi }, { lo, hi, probes: steps }); }
          else { hi = mid - 1; emit(4, `${a[mid]} > ${t} → discard the right half: hi = ${hi}.`, 'The target must be to the left because the array is sorted.', rng(), { lo, hi }, { lo, hi, probes: steps }); }
        }
        emit(5, `lo > hi: the range is empty, ${t} is not present → -1.`, 'The search range shrank to nothing.', rng(), {}, { result: -1, probes: steps });
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { root.append(window.DSA.cells(step.view.a, step.view.marks, step.view.ptrs)); },
  });

  /* ───────────────────────── Two pointers / sliding window ───────────────────────── */
  register({
    id: 'twoptr', group: 'DSA', section: ARR, title: 'Two Pointers & Sliding Window',
    blurb: 'Pair sum with two converging pointers, fixed-size window maximum, and shortest subarray with sum ≥ S.',
    inputs: [
      { key: 'arr', label: 'Array (positive numbers)', type: 'text', value: '2, 3, 1, 2, 4, 3, 7, 1' },
      { key: 'mode', label: 'Technique', type: 'select', value: 'var', options: [['pair', 'Two pointers: pair with sum (sorted)'], ['fixed', 'Fixed window: max sum of size k'], ['var', 'Variable window: shortest subarray with sum ≥ S']] },
      { key: 'target', label: 'Target sum (S)', type: 'number', value: 7 },
      { key: 'k', label: 'Window size k', type: 'number', value: 3, min: 1, max: 10 },
    ],
    pseudo: (p) => ({
      pair: ['l = 0; r = n-1 (array sorted)', 'while l < r:', '  s = a[l] + a[r]', '  if s == target: found', '  if s < target: l++ else r--'],
      fixed: ['sum = a[0..k-1]; best = sum', 'for i in k..n-1:', '  sum += a[i] - a[i-k]  (slide)', '  best = max(best, sum)'],
      var: ['l = 0; sum = 0; best = ∞', 'for r in 0..n-1:', '  sum += a[r]', '  while sum ≥ S: best = min(best, r-l+1); sum -= a[l]; l++'],
    })[p.mode],
    viva: [{ q: 'Why is the sliding window technique O(n) even though it has a nested while loop?', a: 'each element enters the window once and leaves once so left and right pointers only move forward total O(n)' }, { q: 'Why does the two-pointer pair-sum method need a sorted array?', a: 'sorting lets us decide to move left pointer up to increase the sum or right pointer down to decrease it' }],
    build(p) {
      let a = ints(p.arr, 'Array', { maxLen: 16, lo: 1 }); const S = Math.round(p.target), sp = stepper(500), mode = p.mode;
      const emit = (line, msg, why, marks, ptrs, info) => sp.push(line, msg, why, { a: a.slice(), marks, ptrs }, { array: a.slice(), ...info });
      const win = (l, r, extra) => { const m = {}; for (let i = l; i <= r; i++) m[i] = 'range'; return Object.assign(m, extra); };
      if (mode === 'pair') {
        a = a.slice().sort((x, y) => x - y); let l = 0, r = a.length - 1;
        emit(0, `Sorted array: ${a.join(', ')}. Looking for two numbers summing to ${S}.`, 'Two pointers need sorted data.', {}, { l, r }, { target: S });
        while (l < r) {
          const s = a[l] + a[r];
          if (s === S) { emit(3, `a[${l}] + a[${r}] = ${a[l]} + ${a[r]} = ${s} = target → pair found!`, 'The sum equals the target.', { [l]: 'done', [r]: 'done' }, { l, r }, { sum: s, pair: [a[l], a[r]] }); return { steps: sp.steps, meta: {} }; }
          if (s < S) { emit(4, `${a[l]} + ${a[r]} = ${s} < ${S} → need a bigger sum, move l right.`, 'Moving l right can only increase the sum.', { [l]: 'cmp', [r]: 'cmp' }, { l, r }, { sum: s }); l++; }
          else { emit(4, `${a[l]} + ${a[r]} = ${s} > ${S} → too big, move r left.`, 'Moving r left can only decrease the sum.', { [l]: 'cmp', [r]: 'cmp' }, { l, r }, { sum: s }); r--; }
        }
        emit(1, 'Pointers met: no pair sums to the target.', 'All candidate pairs were ruled out.', {}, {}, {});
      } else if (mode === 'fixed') {
        const k = clamp(Math.round(p.k), 1, a.length); let sum = a.slice(0, k).reduce((x, y) => x + y, 0), best = sum, bi = 0;
        emit(0, `Sum of the first window of size ${k} = ${sum}.`, 'Compute the first window directly.', win(0, k - 1), { l: 0, r: k - 1 }, { windowSum: sum, best });
        for (let i = k; i < a.length; i++) {
          sum += a[i] - a[i - k];
          if (sum > best) { best = sum; bi = i - k + 1; }
          emit(2, `Slide: add ${a[i]}, remove ${a[i - k]} → window sum ${sum}${sum === best ? ' (new best)' : ''}.`, 'Updating the sum incrementally costs O(1) instead of re-adding k elements.', win(i - k + 1, i), { l: i - k + 1, r: i }, { windowSum: sum, best });
        }
        emit(3, `Best window of size ${k} starts at ${bi} with sum ${best}.`, 'The maximum over all windows.', win(bi, bi + k - 1, {}), {}, { best, start: bi });
      } else {
        let l = 0, sum = 0, best = Infinity, bl = -1;
        emit(0, `Find the shortest subarray with sum ≥ ${S}.`, 'Positive numbers let us grow the window to increase the sum and shrink it to decrease.', {}, {}, { S });
        for (let r = 0; r < a.length; r++) {
          sum += a[r];
          emit(2, `Expand: add a[${r}]=${a[r]} → sum=${sum}.`, 'Grow the window on the right until the sum is large enough.', win(l, r), { l, r }, { sum, best: best === Infinity ? '∞' : best });
          while (sum >= S) {
            if (r - l + 1 < best) { best = r - l + 1; bl = l; }
            emit(3, `sum ${sum} ≥ ${S}: window length ${r - l + 1}${best === r - l + 1 ? ' (best so far)' : ''}; shrink from the left.`, 'Try to drop elements from the left while the sum still meets the target.', win(l, r, { [l]: 'cmp' }), { l, r }, { sum, best });
            sum -= a[l]; l++;
          }
        }
        emit(3, best === Infinity ? 'No subarray reaches the target.' : `Shortest subarray has length ${best}: [${a.slice(bl, bl + best).join(', ')}].`, 'Final answer after the right pointer reached the end.', best === Infinity ? {} : win(bl, bl + best - 1, {}), {}, { best: best === Infinity ? 'none' : best });
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { root.append(window.DSA.cells(step.view.a, step.view.marks, step.view.ptrs)); },
  });

  /* ───────────────────────── Kadane ───────────────────────── */
  register({
    id: 'kadane', group: 'DSA', section: ARR, title: "Kadane's Algorithm (Max Subarray)",
    blurb: 'Maximum-sum contiguous subarray in one pass: extend the current run or restart.',
    inputs: [{ key: 'arr', label: 'Array (negatives allowed)', type: 'text', value: '-2, 1, -3, 4, -1, 2, 1, -5, 4' }],
    pseudo: () => ['cur = best = a[0]', 'for i in 1..n-1:', '  cur = max(a[i], cur + a[i])   (restart or extend)', '  if cur > best: best = cur; remember range'],
    viva: [{ q: 'What is the intuition behind Kadane\'s algorithm and its complexity?', a: 'at each element either extend the previous subarray or start fresh whichever is larger O(n) time O(1) space' }],
    build(p) {
      const a = ints(p.arr, 'Array', { maxLen: 18 }), sp = stepper(200);
      let cur = a[0], best = a[0], s = 0, bs = 0, be = 0;
      const win = (l, r, ex) => { const m = {}; for (let i = l; i <= r; i++) m[i] = 'range'; return Object.assign(m, ex); };
      const emit = (line, msg, why, i) => sp.push(line, msg, why, { a, marks: { ...win(bs, be, {}), ...Object.fromEntries(Array.from({ length: i - s + 1 }, (_, k) => [s + k, 'sel'])), [i]: 'cmp' }, ptrs: { i } }, { current: cur, best, bestRange: `[${bs}..${be}]`, bestSubarray: a.slice(bs, be + 1) });
      emit(0, `Start: cur = best = a[0] = ${a[0]}.`, 'A single element is the first candidate.', 0);
      for (let i = 1; i < a.length; i++) {
        const ext = cur + a[i];
        if (a[i] > ext) { cur = a[i]; s = i; emit(2, `a[${i}]=${a[i]} > cur+a[i]=${ext} → restart the subarray at ${i}.`, 'The previous run is dragging the sum down, so start fresh.', i); }
        else { cur = ext; emit(2, `Extend: cur = ${cur - a[i]} + ${a[i]} = ${cur}.`, 'Adding the element keeps (or improves) the running sum.', i); }
        if (cur > best) { best = cur; bs = s; be = i; emit(3, `New best = ${best} for subarray [${bs}..${be}].`, 'The running sum beat the best seen so far.', i); }
      }
      sp.push(3, `Maximum subarray sum = ${best}: [${a.slice(bs, be + 1).join(', ')}].`, 'Every position has been considered once.', { a, marks: win(bs, be, {}), ptrs: {} }, { best, bestRange: `[${bs}..${be}]` });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { root.append(window.DSA.cells(step.view.a, step.view.marks, step.view.ptrs, 'blue = current run · light = best so far')); },
  });
})();
