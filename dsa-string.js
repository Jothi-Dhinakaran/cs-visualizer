/* dsa-string.js — KMP, Rabin-Karp, Z-algorithm. */
(function () {
  'use strict';
  const { h, clamp, register } = window.CSViz;
  const D = window.DSA, { stepper } = D;
  const STR = 'Strings';
  const str = (s, label, max) => { const t = String(s); if (!t.length || t.length > max) throw new Error(`${label}: enter 1–${max} characters.`); return t; };

  /* text row + pattern row shifted by `shift`; cls maps text index → class, pcls maps pattern index → class */
  const align = (text, pat, shift, cls = {}, pcls = {}, i, j) => h('div', { class: 'text-align' },
    h('div', { class: 'row' }, h('span', { class: 'nm' }, 'text'), [...text].map((c, k) => h('span', { class: 'ch ' + (cls[k] || '') }, c))),
    h('div', { class: 'row' }, h('span', { class: 'nm' }, ''), [...text].map((_, k) => h('span', { class: 'ch', style: { border: 'none', height: '16px', fontSize: '10px', color: 'var(--muted)' } }, k === i ? 'i' : ''))),
    pat === null ? null : h('div', { class: 'row' }, h('span', { class: 'nm' }, 'pattern'), Array.from({ length: Math.max(shift, 0) }, () => h('span', { class: 'ch', style: { border: 'none' } })), [...pat].map((c, k) => h('span', { class: 'ch ' + (pcls[k] || '') }, c))),
    pat === null || j === undefined ? null : h('div', { class: 'row' }, h('span', { class: 'nm' }, ''), Array.from({ length: Math.max(shift, 0) }, () => h('span', { class: 'ch', style: { border: 'none', height: '16px' } })), [...pat].map((_, k) => h('span', { class: 'ch', style: { border: 'none', height: '16px', fontSize: '10px', color: 'var(--muted)' } }, k === j ? 'j' : ''))));

  /* ───────────────────────── KMP ───────────────────────── */
  register({
    id: 'kmp', group: 'DSA', section: STR, title: 'KMP Pattern Matching',
    blurb: 'Precompute the failure (LPS) table so the search never re-reads text characters.',
    inputs: [{ key: 'text', label: 'Text (≤ 30)', type: 'text', value: 'ABABDABACDABABCABAB' }, { key: 'pat', label: 'Pattern (≤ 10)', type: 'text', value: 'ABABCABAB' }],
    pseudo: () => ['LPS[i] = length of the longest proper prefix of pattern that is also a suffix of pattern[0..i]', 'search: compare text[i] with pattern[j]', '  equal: i++, j++;  if j == m: match found; j = LPS[j-1]', '  different and j > 0: j = LPS[j-1]  (reuse knowledge, i stays)', '  different and j == 0: i++'],
    viva: [{ q: 'What does the LPS (failure) array store and why does it help?', a: 'longest proper prefix that is also a suffix lets us shift the pattern without re-examining matched characters so text pointer never moves back' }, { q: 'What is the time complexity of KMP?', a: 'O(n + m) linear time' }],
    build(p) {
      const T = str(p.text, 'Text', 30), P = str(p.pat, 'Pattern', 10), n = T.length, m = P.length, lps = Array(m).fill(0), sp = stepper(600), matches = [];
      const snap = (line, msg, why, v) => sp.push(line, msg, why, { T, P, lps: lps.slice(), matches: matches.slice(), ...v }, { i: v.i ?? '—', j: v.j ?? '—', lps: lps.slice(), matches: matches.slice() });
      snap(0, 'Phase 1: build the LPS table for the pattern.', 'Self-matching the pattern tells us how far to fall back on a mismatch.', { phase: 'lps' });
      for (let i = 1, len = 0; i < m;) {
        if (P[i] === P[len]) { len++; lps[i] = len; snap(0, `pattern[${i}]='${P[i]}' = pattern[${len - 1}] → LPS[${i}] = ${len}.`, 'The prefix match extends by one.', { phase: 'lps', pi: i, pl: len - 1 }); i++; }
        else if (len) { snap(0, `pattern[${i}]='${P[i]}' ≠ pattern[${len}]='${P[len]}' → fall back: len = LPS[${len - 1}] = ${lps[len - 1]}.`, 'Try a shorter prefix that is also a suffix.', { phase: 'lps', pi: i, pl: len }); len = lps[len - 1]; }
        else { lps[i] = 0; snap(0, `pattern[${i}]='${P[i]}' ≠ pattern[0] → LPS[${i}] = 0.`, 'No prefix matches.', { phase: 'lps', pi: i, pl: 0 }); i++; }
      }
      snap(1, `LPS table ready: [${lps.join(', ')}]. Phase 2: search the text.`, 'Now the text is scanned once.', { phase: 'search', i: 0, j: 0 });
      let i = 0, j = 0;
      while (i < n) {
        if (T[i] === P[j]) { i++; j++; snap(2, `text[${i - 1}]='${T[i - 1]}' = pattern[${j - 1}] → advance both (i=${i}, j=${j}).`, 'Characters match.', { phase: 'search', i, j, hit: true }); if (j === m) { matches.push(i - m); snap(2, `Full match at index ${i - m}!`, 'j reached the pattern length.', { phase: 'search', i, j, found: i - m }); j = lps[j - 1]; } }
        else if (j) { snap(3, `text[${i}]='${T[i]}' ≠ pattern[${j}]='${P[j]}' → j = LPS[${j - 1}] = ${lps[j - 1]}; i stays.`, 'The LPS value says how much of the pattern is still matched.', { phase: 'search', i, j, bad: true }); j = lps[j - 1]; }
        else { snap(4, `text[${i}]='${T[i]}' ≠ pattern[0] → i++.`, 'Nothing matched, move on.', { phase: 'search', i, j, bad: true }); i++; }
      }
      snap(1, matches.length ? `Matches at index(es): ${matches.join(', ')}.` : 'No match found.', 'The whole text was scanned once without moving i backwards.', { phase: 'search', i: n, j });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, cls = {}, pcls = {};
      v.matches.forEach((s0) => { for (let k = 0; k < v.P.length; k++) cls[s0 + k] = 'found'; });
      if (v.phase === 'search') { const sh = (v.i ?? 0) - (v.j ?? 0) - (v.found !== undefined ? 0 : 0); for (let k = 0; k < (v.j ?? 0); k++) { cls[v.i - 1 - k] = cls[v.i - 1 - k] || 'match'; pcls[(v.j ?? 0) - 1 - k] = 'match'; } if (v.bad) { cls[v.i] = 'miss'; pcls[v.j] = 'miss'; }
        root.append(align(v.T, v.P, Math.max(sh, 0), cls, pcls, v.i, v.j)); } else root.append(align(v.P, null, 0, { [v.pi]: 'win', [v.pl]: 'match' }, {}, v.pi));
      root.append(D.cells(v.lps, {}, {}, 'LPS table (index = pattern position)'), D.chips('Matches at:', v.matches));
    },
  });

  /* ───────────────────────── Rabin-Karp ───────────────────────── */
  register({
    id: 'rabin', group: 'DSA', section: STR, title: 'Rabin-Karp (Rolling Hash)',
    blurb: 'Compare hashes of the pattern and each text window; verify character-by-character only when hashes match.',
    inputs: [{ key: 'text', label: 'Text (≤ 30)', type: 'text', value: 'GEEKS FOR GEEKS' }, { key: 'pat', label: 'Pattern (≤ 8)', type: 'text', value: 'GEEK' }, { key: 'q', label: 'Modulus q (small values cause spurious hits)', type: 'number', value: 13, min: 5, max: 997 }],
    pseudo: () => ['hash(s) = (Σ s[k]·d^(m-1-k)) mod q, with base d = 256', 'for each window: if hash(window) == hash(pattern): compare characters', 'rolling update: h = (d·(h − text[i]·d^(m-1)) + text[i+m]) mod q', 'matching hash but different text = spurious hit'],
    viva: [{ q: 'What is a spurious hit in Rabin-Karp and how is it handled?', a: 'different strings with the same hash value collision it is resolved by comparing the characters directly' }, { q: 'Complexity of Rabin-Karp?', a: 'average O(n + m) worst O(nm) when many collisions' }],
    build(p) {
      const T = str(p.text, 'Text', 30), P = str(p.pat, 'Pattern', 8), q = clamp(Math.round(p.q), 5, 997), d = 256, n = T.length, m = P.length, sp = stepper(300), matches = [];
      if (m > n) throw new Error('The pattern is longer than the text.');
      let ph = 0, th = 0, hp = 1; for (let k = 0; k < m - 1; k++) hp = (hp * d) % q;
      for (let k = 0; k < m; k++) { ph = (d * ph + P.charCodeAt(k)) % q; th = (d * th + T.charCodeAt(k)) % q; }
      let spur = 0;
      const snap = (line, msg, why, v) => sp.push(line, msg, why, { T, P, matches: matches.slice(), ...v }, { windowStart: v.s ?? '—', patternHash: ph, windowHash: th, matches: matches.slice(), spuriousHits: spur });
      snap(0, `Pattern hash = ${ph} (mod ${q}). Hash of the first window "${T.slice(0, m)}" = ${th}.`, 'Hashing turns a string comparison into a number comparison.', { s: 0 });
      for (let s = 0; s <= n - m; s++) {
        if (ph === th) {
          const eq = T.substr(s, m) === P; snap(1, `Window ${s} "${T.substr(s, m)}": hash ${th} = ${ph} → verify the characters.`, 'Equal hashes might be a collision, so check the letters.', { s, verify: true });
          if (eq) { matches.push(s); snap(1, `Characters match → real match at index ${s}.`, 'The window equals the pattern.', { s, ok: true }); } else { spur++; snap(1, `Characters differ → SPURIOUS HIT (hash collision).`, 'Different strings can share a hash.', { s, bad: true }); }
        } else snap(1, `Window ${s} "${T.substr(s, m)}": hash ${th} ≠ ${ph} → skip without comparing letters.`, 'Different hashes guarantee different strings.', { s });
        if (s < n - m) { th = (d * (th - T.charCodeAt(s) * hp) + T.charCodeAt(s + m)) % q; if (th < 0) th += q; snap(2, `Roll the hash: remove '${T[s]}', add '${T[s + m]}' → ${th}.`, 'The next window hash is computed in O(1).', { s: s + 1, rolled: true }); }
      }
      snap(1, matches.length ? `Matches at: ${matches.join(', ')} (${spur} spurious hit(s)).` : 'No match.', 'All windows checked.', { s: undefined });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, cls = {}, pcls = {}; v.matches.forEach((s0) => { for (let k = 0; k < v.P.length; k++) cls[s0 + k] = 'found'; }); if (v.s !== undefined) for (let k = 0; k < v.P.length; k++) { cls[v.s + k] = cls[v.s + k] || (v.bad ? 'miss' : 'win'); pcls[k] = v.verify ? 'win' : ''; } root.append(align(v.T, v.P, v.s ?? 0, cls, pcls), D.chips('Matches at:', v.matches)); },
  });

  /* ───────────────────────── Z-algorithm ───────────────────────── */
  register({
    id: 'zalgo', group: 'DSA', section: STR, title: 'Z-Algorithm',
    blurb: 'Z[i] = length of the longest substring starting at i that matches a prefix. Pattern matching = finding Z[i] = |pattern|.',
    inputs: [{ key: 'pat', label: 'Pattern (≤ 6)', type: 'text', value: 'aab' }, { key: 'text', label: 'Text (≤ 20)', type: 'text', value: 'baabaaabaab' }],
    pseudo: () => ['S = pattern + "#" + text', 'keep a window [l, r] = rightmost match with the prefix', 'if i ≤ r: Z[i] = min(r − i + 1, Z[i − l])  (copy)', 'extend: while S[Z[i]] == S[i + Z[i]]: Z[i]++', 'if i + Z[i] − 1 > r: l = i, r = i + Z[i] − 1', 'Z[i] == |pattern| → match at i − |pattern| − 1'],
    viva: [{ q: 'What does the Z array tell us and what is the time complexity?', a: 'z[i] is the length of the longest common prefix between the string and its suffix starting at i computed in linear time O(n)' }, { q: 'How does the Z-algorithm find pattern occurrences?', a: 'concatenate pattern separator text and look for positions where z equals the pattern length' }],
    build(p) {
      const P = str(p.pat, 'Pattern', 6), T = str(p.text, 'Text', 20); if (/#/.test(P + T)) throw new Error('Do not use "#" (it is the separator).');
      const S = P + '#' + T, n = S.length, z = Array(n).fill(0), sp = stepper(200), matches = []; let l = 0, r = 0;
      const snap = (line, msg, why, i) => sp.push(line, msg, why, { S, z: z.slice(), l, r, i, m: P.length }, { i: i ?? '—', window: `[${l}, ${r}]`, z: z.slice(), matches: matches.slice() });
      snap(0, `S = "${S}". Compute Z for every index.`, 'The separator guarantees Z never exceeds the pattern length.');
      for (let i = 1; i < n; i++) {
        let k = 0; if (i <= r) { k = Math.min(r - i + 1, z[i - l]); snap(2, `i=${i} is inside [${l},${r}]: start with Z[${i}] ≥ min(${r - i + 1}, Z[${i - l}]=${z[i - l]}) = ${k}.`, 'We already know part of the match from the earlier window.', i); }
        const k0 = k; while (i + k < n && S[k] === S[i + k]) k++;
        z[i] = k; if (i + k - 1 > r) { l = i; r = i + k - 1; }
        snap(3, `Z[${i}] = ${k}${k > k0 ? ` (extended ${k - k0} by comparing)` : ''}${i + k - 1 === r && k ? `; window becomes [${l},${r}]` : ''}.`, 'Compare S[k] with S[i+k] until they differ.', i);
        if (k === P.length) { matches.push(i - P.length - 1); snap(5, `Z[${i}] = ${P.length} = |pattern| → match at text index ${i - P.length - 1}.`, 'A suffix that equals the whole pattern.', i); }
      }
      snap(5, matches.length ? `Pattern found at index(es): ${matches.join(', ')}.` : 'Pattern not found.', 'Done in O(n).', undefined);
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, marks = {}; for (let k = v.l; k <= v.r && v.r > 0; k++) marks[k] = 'range'; if (v.i !== undefined) marks[v.i] = 'cmp'; v.z.forEach((x, k) => { if (x === v.m && k) marks[k] = 'done'; }); root.append(D.cells([...v.S], marks, {}, 'S = pattern # text'), D.cells(v.z, marks, {}, `Z array — window [${v.l}, ${v.r}]`)); },
  });
})();
