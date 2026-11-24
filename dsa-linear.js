/* dsa-linear.js — Stack, expression conversion, queues, linked lists, Floyd, monotonic stack, hashing. */
(function () {
  'use strict';
  const { h, clamp, register } = window.CSViz;
  const D = window.DSA, { ints, stepper, parseOps } = D;
  const LIN = 'Linear Structures', HASH = 'Hashing';
  const needArg = (o, n = 1) => { if (o.args.length < n) throw new Error(`"${o.raw}" needs ${n} argument(s).`); };

  /* ───────────────────────── Stack ───────────────────────── */
  register({
    id: 'stack', group: 'DSA', section: LIN, title: 'Stack (push / pop / balanced brackets)',
    blurb: 'LIFO structure. Run push/pop/peek operations, or check a bracket string for balance.',
    inputs: [
      { key: 'mode', label: 'Mode', type: 'select', value: 'ops', options: [['ops', 'Stack operations'], ['brackets', 'Balanced brackets']] },
      { key: 'ops', label: 'Operations (push x, pop, peek)', type: 'text', value: 'push 5, push 8, push 2, pop, peek, push 9, pop, pop, pop, pop' },
      { key: 'text', label: 'Bracket string', type: 'text', value: '{[()]}(' },
      { key: 'cap', label: 'Capacity (ops mode)', type: 'number', value: 5, min: 1, max: 10 },
    ],
    pseudo: (p) => p.mode === 'ops' ? ['push(x): if full → overflow; else stack[top++] = x', 'pop(): if empty → underflow; else return stack[--top]', 'peek(): return stack[top-1]']
      : ['for each char c:', '  if c is an opener: push c', '  if c is a closer: pop and check that it matches', 'balanced ⇔ no mismatch and stack empty at the end'],
    viva: [{ q: 'What is LIFO and give two real uses of a stack?', a: 'last in first out function call stack undo redo expression evaluation bracket matching backtracking' }, { q: 'What are stack overflow and underflow?', a: 'overflow pushing to a full stack underflow popping from an empty stack' }],
    build(p) {
      const sp = stepper(400), stack = [];
      const view = (extra) => ({ stack: stack.slice(), ...extra });
      if (p.mode === 'ops') {
        const cap = clamp(Math.round(p.cap), 1, 10), ops = parseOps(p.ops);
        sp.push(0, `Empty stack, capacity ${cap}.`, 'Initial state.', view({ cap }), { stack: [], size: 0 });
        ops.forEach((o) => {
          if (o.op === 'push' || o.op === 'insert') {
            needArg(o);
            if (stack.length >= cap) sp.push(0, `push(${o.args[0]}): stack is FULL → overflow!`, 'There is no free slot above the top.', view({ cap, err: true }), { stack: stack.slice(), size: stack.length, error: 'overflow' });
            else { stack.push(o.args[0]); sp.push(0, `push(${o.args[0]}): placed on top.`, 'push adds an element at the top.', view({ cap, hl: stack.length - 1 }), { stack: stack.slice(), top: o.args[0], size: stack.length }); }
          } else if (o.op === 'pop') {
            if (!stack.length) sp.push(1, 'pop(): stack is EMPTY → underflow!', 'There is nothing to remove.', view({ cap, err: true }), { stack: [], size: 0, error: 'underflow' });
            else { const v = stack.pop(); sp.push(1, `pop(): removed ${v} from the top.`, 'The most recently pushed element leaves first (LIFO).', view({ cap }), { stack: stack.slice(), popped: v, size: stack.length }); }
          } else if (o.op === 'peek' || o.op === 'top') sp.push(2, stack.length ? `peek(): top is ${stack.at(-1)} (not removed).` : 'peek(): stack is empty.', 'peek reads the top without changing the stack.', view({ cap, hl: stack.length - 1 }), { stack: stack.slice(), top: stack.at(-1) ?? '—', size: stack.length });
          else throw new Error(`Unknown operation "${o.raw}". Use push x, pop or peek.`);
        });
        return { steps: sp.steps, meta: {} };
      }
      const text = String(p.text); if (text.length > 30) throw new Error('Use at most 30 characters.');
      const pairs = { ')': '(', ']': '[', '}': '{' };
      sp.push(0, `Check "${text}" for balanced brackets.`, 'Every closer must match the most recent unmatched opener.', view({ text, i: -1 }), { stack: [], index: -1 });
      let bad = false;
      for (let i = 0; i < text.length && !bad; i++) {
        const c = text[i];
        if ('([{'.includes(c)) { stack.push(c); sp.push(1, `'${c}' is an opener → push.`, 'Openers wait on the stack for their closer.', view({ text, i }), { stack: stack.slice(), index: i }); }
        else if (pairs[c]) {
          if (stack.at(-1) === pairs[c]) { stack.pop(); sp.push(2, `'${c}' matches the top '${pairs[c]}' → pop.`, 'The closer matches the latest unmatched opener.', view({ text, i }), { stack: stack.slice(), index: i }); }
          else { bad = true; sp.push(2, `'${c}' does not match top ${stack.length ? "'" + stack.at(-1) + "'" : '(empty)'} → NOT balanced.`, 'A closer found the wrong opener (or none).', view({ text, i, err: true }), { stack: stack.slice(), index: i, balanced: false }); }
        }
      }
      if (!bad) sp.push(3, stack.length ? `Input ended but ${stack.length} opener(s) remain → NOT balanced.` : 'Stack is empty at the end → balanced!', 'Leftover openers mean some bracket was never closed.', view({ text, i: text.length, err: !!stack.length }), { stack: stack.slice(), balanced: !stack.length });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view;
      if (v.text !== undefined) root.append(h('div', { class: 'text-align' }, h('div', { class: 'row' }, [...v.text].map((c, i) => h('span', { class: 'ch ' + (i === v.i ? (v.err ? 'miss' : 'win') : '') }, c)))));
      root.append(D.vstack(`Stack (top is highlighted)${v.cap ? ' — capacity ' + v.cap : ''}`, v.stack));
      if (v.err) root.append(h('p', { class: 'error' }, '⚠ error condition'));
    },
  });

  /* ───────────────────────── Infix → postfix ───────────────────────── */
  register({
    id: 'postfix', group: 'DSA', section: LIN, title: 'Infix → Postfix & Evaluation',
    blurb: 'Shunting-yard algorithm with an operator stack, then evaluate the postfix result (when all operands are numbers).',
    inputs: [{ key: 'expr', label: 'Infix expression', type: 'text', value: '3 + 4 * 2 / ( 1 - 5 ) ^ 2' }],
    pseudo: () => ['operand → append to output', 'operator → pop higher/equal-precedence ops to output, then push', '"(" → push;  ")" → pop to output until "("', 'end: pop all remaining operators', 'evaluate: operand → push; operator → pop b, pop a, push a∘b'],
    viva: [{ q: 'Why is postfix evaluation easy for computers?', a: 'no parentheses or precedence rules needed a single left to right scan with a stack' }, { q: 'How does the algorithm handle operator precedence and associativity?', a: 'pop operators with higher or equal precedence before pushing left associative power is right associative so it pops only strictly higher' }],
    build(p) {
      const toks = String(p.expr).match(/\d+(?:\.\d+)?|[A-Za-z]\w*|[-+*/^()]/g) || [];
      if (!toks.length) throw new Error('Enter an expression such as 3 + 4 * 2'); if (toks.length > 25) throw new Error('Use at most 25 tokens.');
      const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }, right = { '^': true };
      const out = [], ops = [], sp = stepper(300);
      const view = (i, extra) => ({ toks, i, out: out.slice(), ops: ops.slice(), phase: 'convert', ...extra });
      const st = (i) => ({ token: toks[i] ?? '—', output: out.join(' '), operatorStack: ops.slice() });
      sp.push(0, 'Start converting infix to postfix.', 'Scan tokens left to right.', view(-1), st(-1));
      toks.forEach((t, i) => {
        if (prec[t]) {
          let popped = false;
          while (ops.length && ops.at(-1) !== '(' && (prec[ops.at(-1)] > prec[t] || (prec[ops.at(-1)] === prec[t] && !right[t]))) { const o = ops.pop(); out.push(o); popped = true; sp.push(1, `'${t}': top '${o}' has ${prec[o] > prec[t] ? 'higher' : 'equal'} precedence → pop to output.`, 'Higher-precedence operators must be applied first.', view(i), st(i)); }
          ops.push(t); sp.push(1, `Push operator '${t}'${popped ? '' : ' (nothing to pop)'}.`, 'The operator waits for its right operand.', view(i), st(i));
        } else if (t === '(') { ops.push(t); sp.push(2, "'(' → push.", 'Parentheses start a new sub-expression.', view(i), st(i)); }
        else if (t === ')') {
          while (ops.length && ops.at(-1) !== '(') { out.push(ops.pop()); sp.push(2, `')' → pop '${out.at(-1)}' to output.`, 'Everything inside the parentheses is output.', view(i), st(i)); }
          if (!ops.length) throw new Error('Mismatched parentheses.');
          ops.pop(); sp.push(2, "Discard the matching '('.", 'Parentheses never appear in postfix.', view(i), st(i));
        } else { out.push(t); sp.push(0, `Operand '${t}' → output.`, 'Operands go straight to the output.', view(i), st(i)); }
      });
      while (ops.length) { const o = ops.pop(); if (o === '(') throw new Error('Mismatched parentheses.'); out.push(o); sp.push(3, `End of input: pop '${o}' to output.`, 'Remaining operators are applied last.', view(toks.length), st(toks.length)); }
      const post = out.slice();
      sp.push(3, `Postfix: ${post.join(' ')}`, 'Conversion complete.', view(toks.length), st(toks.length));
      if (post.every((t) => prec[t] || /^\d/.test(t))) {
        const vs = [];
        post.forEach((t, i) => {
          if (prec[t]) {
            const b = vs.pop(), a = vs.pop(); if (a === undefined || b === undefined) throw new Error('Malformed expression.');
            const r = t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : t === '/' ? a / b : a ** b; vs.push(r);
            sp.push(4, `Operator ${t}: pop ${b} and ${a} → push ${a} ${t} ${b} = ${+r.toFixed(4)}.`, 'The first popped value is the right operand.', { toks: post, i, out: [], ops: [], vals: vs.map((x) => +x.toFixed(4)), phase: 'eval' }, { token: t, valueStack: vs.map((x) => +x.toFixed(4)) });
          } else { vs.push(Number(t)); sp.push(4, `Operand ${t} → push onto the value stack.`, 'Operands wait until an operator needs them.', { toks: post, i, out: [], ops: [], vals: vs.slice(), phase: 'eval' }, { token: t, valueStack: vs.slice() }); }
        });
        sp.push(4, `Result = ${+vs[0].toFixed(4)}.`, 'One value remains on the stack: the answer.', { toks: post, i: post.length, out: [], ops: [], vals: [vs[0]], phase: 'eval' }, { result: +vs[0].toFixed(4) });
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view;
      root.append(h('div', { class: 'label' }, v.phase === 'convert' ? 'Infix tokens' : 'Postfix tokens'), h('div', { class: 'text-align' }, h('div', { class: 'row' }, v.toks.map((t, i) => h('span', { class: 'ch ' + (i === v.i ? 'win' : ''), style: { minWidth: '30px', padding: '0 4px' } }, t)))));
      if (v.phase === 'convert') root.append(D.chips('Output:', v.out), D.vstack('Operator stack', v.ops));
      else root.append(D.vstack('Value stack', v.vals));
    },
  });

  /* ───────────────────────── Queues ───────────────────────── */
  register({
    id: 'queue', group: 'DSA', section: LIN, title: 'Queue, Circular Queue & Deque',
    blurb: 'FIFO queue, ring buffer with wrap-around, and double-ended queue.',
    inputs: [
      { key: 'kind', label: 'Structure', type: 'select', value: 'circular', options: [['queue', 'Simple queue'], ['circular', 'Circular queue'], ['deque', 'Deque']] },
      { key: 'ops', label: 'Operations', type: 'text', value: 'enqueue 1, enqueue 2, enqueue 3, enqueue 4, dequeue, dequeue, enqueue 5, enqueue 6, enqueue 7, dequeue' },
      { key: 'cap', label: 'Capacity (2–10)', type: 'number', value: 5, min: 2, max: 10 },
    ],
    pseudo: (p) => ({
      queue: ['enqueue(x): if full → overflow; else items.push(x) at rear', 'dequeue(): if empty → underflow; else remove from front', 'front = first item; rear = last item'],
      circular: ['enqueue(x): if size == cap → full; buf[(front+size) % cap] = x; size++', 'dequeue(): if size == 0 → empty; front = (front+1) % cap; size--', 'indices wrap around, so freed slots are reused'],
      deque: ['pushFront / pushBack add at either end', 'popFront / popBack remove from either end', '(enqueue = pushBack, dequeue = popFront)'],
    })[p.kind],
    viva: [{ q: 'Why use a circular queue instead of a simple array queue?', a: 'a simple queue wastes freed front slots after dequeues circular queue wraps around using modulo to reuse space' }, { q: 'How do you tell a full circular queue from an empty one?', a: 'keep a size counter or leave one slot unused because front equals rear in both cases otherwise' }],
    build(p) {
      const kind = p.kind, cap = clamp(Math.round(p.cap), 2, 10), ops = parseOps(p.ops), sp = stepper(400);
      let items = [], buf = Array(cap).fill(null), front = 0, size = 0;
      const snap = (line, msg, why, hl, err) => sp.push(line, msg, why, { kind, items: items.slice(), buf: buf.slice(), front, size, cap, hl, err }, kind === 'circular' ? { buffer: buf.slice(), front, rear: size ? (front + size - 1) % cap : '—', size } : { items: items.slice(), size: items.length });
      snap(0, `Empty ${kind}, capacity ${cap}.`, 'Initial state.', -1);
      ops.forEach((o) => {
        const op = { enqueue: 'pushback', insert: 'pushback', push: 'pushback', dequeue: 'popfront', pop: 'popfront', pushfront: 'pushfront', pushback: 'pushback', popfront: 'popfront', popback: 'popback', front: 'peek', peek: 'peek' }[o.op];
        if (!op) throw new Error(`Unknown operation "${o.raw}".`);
        if (kind !== 'deque' && (op === 'pushfront' || op === 'popback')) throw new Error(`"${o.raw}" is only valid for a deque.`);
        if (op === 'pushback' || op === 'pushfront') {
          needArg(o);
          const x = o.args[0], n = kind === 'circular' ? size : items.length;
          if (n >= cap) { snap(0, `${o.raw}: queue is FULL → overflow.`, 'No free slot' + (kind === 'queue' ? ' at the rear.' : '.'), -1, true); return; }
          if (kind === 'circular') { const pos = (front + size) % cap; buf[pos] = x; size++; snap(0, `enqueue(${x}): store at index (${front}+${size - 1}) % ${cap} = ${pos}.`, 'The rear index wraps around with modulo.', pos); }
          else if (op === 'pushfront') { items.unshift(x); snap(0, `pushFront(${x}).`, 'Deques add at either end.', 0); } else { items.push(x); snap(0, `enqueue(${x}) at the rear.`, 'FIFO: new items join the back.', items.length - 1); }
        } else if (op === 'popfront' || op === 'popback') {
          const n = kind === 'circular' ? size : items.length;
          if (!n) { snap(1, `${o.raw}: queue is EMPTY → underflow.`, 'Nothing to remove.', -1, true); return; }
          if (kind === 'circular') { const v = buf[front]; buf[front] = null; front = (front + 1) % cap; size--; snap(1, `dequeue() → ${v}; front moves to ${front}.`, 'The oldest element leaves; its slot becomes reusable.', front); }
          else { const v = op === 'popfront' ? items.shift() : items.pop(); snap(1, `${op === 'popfront' ? 'dequeue/popFront' : 'popBack'}() → ${v}.`, op === 'popfront' ? 'FIFO: the oldest item leaves first.' : 'A deque can also remove from the rear.', -1); }
        } else snap(2, kind === 'circular' ? `front item is ${buf[front] ?? 'none'}.` : `front item is ${items[0] ?? 'none'}.`, 'peek reads without removing.', kind === 'circular' ? front : 0);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, marks = {}, ptrs = {};
      if (v.kind === 'circular') {
        v.buf.forEach((x, i) => { if (x !== null) marks[i] = 'sel'; }); if (v.hl >= 0 && v.buf[v.hl] !== null) marks[v.hl] = 'done';
        ptrs.front = v.size ? v.front : -1; ptrs.rear = v.size ? (v.front + v.size - 1) % v.cap : -1;
        root.append(D.cells(v.buf, marks, ptrs, `Ring buffer (capacity ${v.cap}, size ${v.size}) — indices wrap around`));
      } else {
        v.items.forEach((_, i) => { marks[i] = i === v.hl ? 'done' : 'sel'; }); ptrs.front = v.items.length ? 0 : -1; ptrs.rear = v.items.length ? v.items.length - 1 : -1;
        root.append(D.cells(v.items.length ? v.items : [null], marks, ptrs, `${v.kind === 'deque' ? 'Deque' : 'Queue'} (capacity ${v.cap}) front → rear`));
      }
      if (v.err) root.append(h('p', { class: 'error' }, '⚠ error condition'));
    },
  });

  /* ───────────────────────── Linked lists ───────────────────────── */
  function listViz(kind) {
    const title = kind === 'singly' ? 'Singly Linked List' : 'Doubly & Circular Linked List';
    register({
      id: 'll-' + kind, group: 'DSA', section: LIN, title,
      blurb: kind === 'singly' ? 'Insert, delete, search and reverse — watch the pointers.' : 'Doubly linked (prev + next) or circular (tail points back to head).',
      inputs: [
        ...(kind === 'singly' ? [] : [{ key: 'kind', label: 'Variant', type: 'select', value: 'doubly', options: [['doubly', 'Doubly linked'], ['circular', 'Circular singly linked']] }]),
        { key: 'init', label: 'Initial list', type: 'text', value: '10, 20, 30' },
        { key: 'ops', label: 'Operations (inserthead x, inserttail x, insertat i x, delete x, search x, reverse)', type: 'text', value: kind === 'singly' ? 'inserthead 5, inserttail 40, insertat 2 25, delete 20, search 30, reverse' : 'inserthead 5, inserttail 40, delete 20, search 30, reverse' },
      ],
      pseudo: () => ['insertHead(x): new.next = head; head = new', 'insertTail(x): walk to the last node; last.next = new', 'delete(x): find node; prev.next = node.next', 'search(x): walk until value matches', 'reverse(): prev=null; for each node: next=cur.next; cur.next=prev; prev=cur; cur=next'],
      viva: [{ q: 'Compare linked lists with arrays for insertion and access.', a: 'linked list insertion at head O(1) no shifting but access by index is O(n) arrays have O(1) access but O(n) insertion shifting' }, { q: 'What is the advantage of a doubly or circular linked list?', a: 'doubly allows traversal both ways and O(1) deletion given node circular allows round robin traversal and wraps from tail to head' }],
      build(p) {
        const k = kind === 'singly' ? 'singly' : p.kind, L = ints(p.init, 'Initial list', { maxLen: 10, minLen: 0 }) , ops = parseOps(p.ops), sp = stepper(600);
        const snap = (line, msg, why, o = {}) => sp.push(line, msg, why, { k, vals: L.slice(), cur: -1, flipped: 0, ptrs: {}, ...o }, { list: L.join(' → ') || 'empty', length: L.length });
        snap(0, `List: ${L.join(' → ') || 'empty'}.`, 'Initial state.');
        ops.forEach((o) => {
          if (L.length >= 12 && /insert/.test(o.op)) throw new Error('Use at most 12 nodes.');
          if (o.op === 'inserthead') { needArg(o); L.unshift(o.args[0]); snap(0, `insertHead(${o.args[0]}): new node points to the old head and becomes the head.`, 'O(1): only the head pointer changes.', { cur: 0, mark: 'new' }); }
          else if (o.op === 'inserttail' || o.op === 'insert') {
            needArg(o);
            for (let i = 0; i < L.length; i++) snap(1, `insertTail: walk to the end (at node ${L[i]}).`, 'Without a tail pointer we must traverse the whole list: O(n).', { cur: i });
            L.push(o.args[0]); snap(1, `Append ${o.args[0]} as the new tail.`, 'The old last node now points to the new node.', { cur: L.length - 1, mark: 'new' });
          } else if (o.op === 'insertat') {
            needArg(o, 2); const i = Math.round(o.args[0]); if (i < 0 || i > L.length) throw new Error(`insertAt index ${i} is out of range 0..${L.length}.`);
            for (let j = 0; j < i; j++) snap(1, `insertAt(${i}): walk to node ${j} (${L[j]}).`, 'We need the node just before the insertion point.', { cur: j });
            L.splice(i, 0, o.args[1]); snap(1, `Insert ${o.args[1]} at index ${i}: rewire the neighbours.`, 'new.next = prev.next; prev.next = new.', { cur: i, mark: 'new' });
          } else if (o.op === 'delete') {
            needArg(o); let found = -1;
            for (let i = 0; i < L.length; i++) { snap(2, `delete(${o.args[0]}): checking node ${L[i]}.`, 'Walk until the value is found.', { cur: i }); if (L[i] === o.args[0]) { found = i; break; } }
            if (found < 0) snap(2, `${o.args[0]} not found; nothing deleted.`, 'The walk reached the end.'); else { snap(2, `Found ${o.args[0]}: bypass it (prev.next = node.next).`, 'The node is unlinked and can be freed.', { cur: found, mark: 'bad' }); L.splice(found, 1); snap(2, `Deleted ${o.args[0]}.`, 'List relinked.'); }
          } else if (o.op === 'search') {
            needArg(o); let hit = false;
            for (let i = 0; i < L.length; i++) { const m = L[i] === o.args[0]; snap(3, m ? `search(${o.args[0]}): found at index ${i}!` : `search(${o.args[0]}): ${L[i]} ≠ ${o.args[0]}.`, 'Linked lists only support sequential access.', { cur: i, mark: m ? 'new' : '' }); if (m) { hit = true; break; } }
            if (!hit) snap(3, `${o.args[0]} is not in the list.`, 'End of list reached.');
          } else if (o.op === 'reverse') {
            if (k === 'singly') {
              snap(4, 'reverse(): prev = null, cur = head.', 'We flip every pointer, one node at a time.', { ptrs: { cur: 0 } });
              for (let i = 0; i < L.length; i++) snap(4, `Node ${L[i]}: save next, point it back to ${i ? L[i - 1] : 'null'}, advance prev and cur.`, 'Re-pointing each next pointer reverses the direction.', { flipped: i + 1, ptrs: { prev: i, cur: i + 1 < L.length ? i + 1 : -1 } });
            }
            L.reverse(); snap(4, `List reversed: ${L.join(' → ')}.`, k === 'singly' ? 'prev is now the new head.' : 'Swap each node\'s next/prev (or re-link) and swap head/tail.');
          } else throw new Error(`Unknown operation "${o.raw}".`);
        });
        return { steps: sp.steps, meta: {} };
      },
      render(root, step) {
        const v = step.view, row = h('div', { class: 'll' });
        if (!v.vals.length) row.append(h('span', { class: 'muted' }, 'head → null (empty list)'));
        v.vals.forEach((x, i) => {
          const tags = []; if (i === 0) tags.push('head'); if (i === v.vals.length - 1) tags.push('tail'); Object.entries(v.ptrs).forEach(([n, j]) => { if (j === i) tags.push(n); });
          row.append(h('div', { class: 'lnode' }, h('div', { class: 'lbox ' + (i === v.cur ? (v.mark || 'cur') : '') }, x), h('div', { class: 'ptr' }, tags.join(' · '))));
          if (i < v.vals.length - 1) row.append(h('span', { class: 'larrow' + (i < v.flipped ? ' rev' : '') }, v.k === 'doubly' ? '⇄' : i < v.flipped ? '←' : '→'));
        });
        if (v.vals.length) row.append(h('span', { class: 'larrow' }, v.k === 'circular' ? '↻ back to head' : '→ null'));
        root.append(row);
      },
    });
  }
  listViz('singly'); listViz('multi');

  /* ───────────────────────── Floyd cycle detection ───────────────────────── */
  register({
    id: 'floyd', group: 'DSA', section: LIN, title: "Floyd's Cycle Detection (Tortoise & Hare)",
    blurb: 'Slow moves 1 step, fast moves 2. If they meet there is a cycle; reset one pointer to find where it starts.',
    inputs: [
      { key: 'vals', label: 'Node values', type: 'text', value: '3, 1, 4, 1, 5, 9, 2' },
      { key: 'pos', label: 'Tail links back to index (-1 = no cycle)', type: 'number', value: 2, min: -1, max: 11 },
    ],
    pseudo: () => ['slow = fast = head', 'while fast and fast.next:', '  slow = slow.next; fast = fast.next.next', '  if slow == fast: cycle detected', 'slow = head; while slow != fast: both move 1 step', 'meeting node = cycle start'],
    viva: [{ q: 'Why do the two pointers always meet inside a cycle and what is the complexity?', a: 'fast gains one node per step on slow so it must catch it O(n) time O(1) space' }, { q: 'Why does resetting slow to head find the cycle start?', a: 'distance from head to cycle start equals distance from meeting point to cycle start going around the loop' }],
    build(p) {
      const vals = ints(p.vals, 'Values', { maxLen: 12 }), n = vals.length, pos = Math.round(p.pos) >= n ? -1 : Math.round(p.pos), sp = stepper(200);
      const nxt = (i) => (i === null ? null : i + 1 < n ? i + 1 : pos >= 0 ? pos : null);
      const snap = (line, msg, why, S, F, mark) => sp.push(line, msg, why, { vals, pos, S, F, mark }, { slow: S === null ? 'null' : `${S} (${vals[S]})`, fast: F === null ? 'null' : `${F} (${vals[F]})`, cycleAt: pos });
      let S = 0, F = 0; snap(0, 'slow and fast both start at the head.', 'Both pointers begin at node 0.', S, F);
      let met = false;
      for (let g = 0; g < 4 * n + 4; g++) {
        const f1 = nxt(F), f2 = f1 === null ? null : nxt(f1);
        if (f2 === null) { snap(1, 'fast reached null → the list has NO cycle.', 'A cycle-free list ends, so fast falls off the end.', S, F === null ? null : F); return { steps: sp.steps, meta: {} }; }
        S = nxt(S); F = f2;
        snap(2, `slow → node ${S}, fast → node ${F}.`, 'slow moves one node, fast moves two.', S, F);
        if (S === F) { met = true; snap(3, `slow == fast at node ${S}: a cycle exists!`, 'Inside a cycle, fast catches up with slow.', S, F, 'meet'); break; }
      }
      if (met) {
        S = 0; snap(4, 'Reset slow to the head; fast stays at the meeting point. Now both move one step at a time.', 'The distances to the cycle start become equal.', S, F);
        while (S !== F) { S = nxt(S); F = nxt(F); snap(4, `slow → ${S}, fast → ${F}.`, 'Both move at the same speed.', S, F); }
        snap(5, `They meet at node ${S} (value ${vals[S]}): this is where the cycle begins.`, 'The meeting point of the second phase is the cycle entry.', S, F, 'meet');
      }
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, row = h('div', { class: 'll' });
      v.vals.forEach((x, i) => {
        const tags = []; if (v.S === i) tags.push('S'); if (v.F === i) tags.push('F'); if (v.pos === i) tags.push('↩ tail links here');
        row.append(h('div', { class: 'lnode' }, h('div', { class: 'lbox ' + (v.S === i && v.F === i ? (v.mark === 'meet' ? 'new' : 'cur') : v.S === i || v.F === i ? 'sel' : '') }, x), h('div', { class: 'ptr' }, tags.join(' '))));
        if (i < v.vals.length - 1) row.append(h('span', { class: 'larrow' }, '→'));
      });
      row.append(h('span', { class: 'larrow' }, v.pos >= 0 ? `↩ node ${v.pos}` : '→ null'));
      root.append(row, h('p', { class: 'muted' }, 'S = slow pointer · F = fast pointer'));
    },
  });

  /* ───────────────────────── Monotonic stack ───────────────────────── */
  register({
    id: 'monostack', group: 'DSA', section: LIN, title: 'Monotonic Stack (Next Greater Element)',
    blurb: 'Keep a decreasing stack of indices; each new larger value resolves the smaller ones on top.',
    inputs: [{ key: 'arr', label: 'Array', type: 'text', value: '4, 5, 2, 25, 7, 8, 1' }],
    pseudo: () => ['for i in 0..n-1:', '  while stack not empty and a[top] < a[i]:', '    result[top] = a[i]; pop', '  push i', 'remaining indices have no greater element (-1)'],
    viva: [{ q: 'Why is next-greater-element O(n) with a stack although it has a nested loop?', a: 'each index is pushed once and popped at most once amortized O(n)' }],
    build(p) {
      const a = ints(p.arr, 'Array', { maxLen: 16 }), res = Array(a.length).fill(null), stack = [], sp = stepper(400);
      const snap = (line, msg, why, i, marks) => sp.push(line, msg, why, { a, res: res.map((x) => x), stack: stack.map((j) => `${a[j]}@${j}`), i, marks: marks || {} }, { stack: stack.slice(), result: res.slice() });
      snap(0, 'Find the next greater element to the right of each position.', 'The stack holds indices still waiting for a greater value.', -1);
      a.forEach((x, i) => {
        while (stack.length && a[stack.at(-1)] < x) { const t = stack.pop(); res[t] = x; snap(2, `a[${i}]=${x} > a[${t}]=${a[t]} → next greater of index ${t} is ${x}; pop.`, 'The first larger value to the right is the answer for the popped index.', i, { [t]: 'done', [i]: 'cmp' }); }
        stack.push(i); snap(3, `Push index ${i} (value ${x}).`, 'Its answer is not known yet.', i, { [i]: 'sel' });
      });
      stack.forEach((j) => { res[j] = -1; }); snap(4, `Remaining indices have no greater element → -1. Result: ${res.join(', ')}.`, 'Nothing larger appeared to their right.', a.length);
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view; root.append(D.cells(v.a, v.marks, { i: v.i }, 'Array'), D.cells(v.res, {}, {}, 'Next greater (blank = pending)'), D.vstack('Stack (value@index)', v.stack)); },
  });

  /* ───────────────────────── Hashing ───────────────────────── */
  const HF = { mod: [(k, m) => ((k % m) + m) % m, 'k mod m'], lin: [(k, m) => (((3 * k + 1) % m) + m) % m, '(3k+1) mod m'] };
  register({
    id: 'hash-chain', group: 'DSA', section: HASH, title: 'Hash Table — Separate Chaining',
    blurb: 'Collisions are stored in a linked chain per bucket.',
    inputs: [
      { key: 'm', label: 'Table size m (3–11)', type: 'number', value: 5, min: 3, max: 11 },
      { key: 'hf', label: 'Hash function', type: 'select', value: 'mod', options: [['mod', 'h(k) = k mod m'], ['lin', 'h(k) = (3k+1) mod m']] },
      { key: 'ops', label: 'Operations (insert k, search k, delete k)', type: 'text', value: 'insert 12, insert 22, insert 7, insert 17, search 22, delete 12, search 12' },
    ],
    pseudo: () => ['i = h(key)', 'insert: append key to chain at bucket i', 'search: walk chain at bucket i', 'delete: unlink key from chain at bucket i', 'load factor α = n / m'],
    viva: [{ q: 'What is the load factor and how does it affect chaining?', a: 'load factor is n over m average chain length is alpha so search is O(1 + alpha) keep it small by resizing' }, { q: 'What causes collisions and how does chaining resolve them?', a: 'different keys hash to same bucket chaining stores them in a linked list at that bucket' }],
    build(p) {
      const m = clamp(Math.round(p.m), 3, 11), [hf, hname] = HF[p.hf], ops = parseOps(p.ops), T = Array.from({ length: m }, () => []), sp = stepper(300); let n = 0;
      const snap = (line, msg, why, b, mark) => sp.push(line, msg, why, { T: T.map((c) => c.slice()), b, mark, m }, { table: T.map((c) => c.slice()), items: n, loadFactor: +(n / m).toFixed(2) });
      snap(0, `Empty table with ${m} buckets, ${hname}.`, 'Initial state.', -1);
      ops.forEach((o) => {
        needArg(o); const k = o.args[0], b = hf(k, m);
        if (o.op === 'insert') {
          snap(0, `insert(${k}): h(${k}) = ${p.hf === 'mod' ? `${k} mod ${m}` : `(3·${k}+1) mod ${m}`} = ${b}.`, 'The hash function picks the bucket.', b);
          if (T[b].includes(k)) { snap(1, `${k} already in bucket ${b}; ignored.`, 'Keys are unique.', b); return; }
          T[b].push(k); n++; snap(1, T[b].length > 1 ? `Collision! Bucket ${b} already has ${T[b].length - 1} key(s): chain ${k} at the end.` : `Bucket ${b} was empty: store ${k}.`, 'Chaining keeps colliding keys in the same bucket list.', b, 'new');
        } else if (o.op === 'search') {
          snap(0, `search(${k}): h = ${b}.`, 'Go straight to the bucket.', b);
          const idx = T[b].indexOf(k); T[b].slice(0, idx < 0 ? undefined : idx + 1).forEach((x) => snap(2, `Compare with ${x} in bucket ${b}: ${x === k ? 'match!' : 'no match.'}`, 'Walk the chain.', b));
          snap(2, idx >= 0 ? `Found ${k} in bucket ${b}.` : `${k} not found (chain exhausted).`, 'Search cost depends on the chain length.', b, idx >= 0 ? 'new' : 'bad');
        } else if (o.op === 'delete') {
          const idx = T[b].indexOf(k); snap(0, `delete(${k}): h = ${b}.`, 'Locate the bucket first.', b);
          if (idx >= 0) { T[b].splice(idx, 1); n--; snap(3, `Unlink ${k} from the chain of bucket ${b}.`, 'Only that bucket changes.', b, 'bad'); } else snap(3, `${k} not present.`, 'Nothing to delete.', b);
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) {
      const v = step.view, box = h('div', { class: 'hash' });
      v.T.forEach((c, i) => box.append(h('div', { class: 'hrow' + (i === v.b ? ' cur' : '') }, h('div', { class: 'hidx' }, i), h('span', { class: 'chip' }, c.length ? '•' : '∅'), c.map((x) => [h('span', { class: 'larrow' }, '→'), h('span', { class: 'chip ' + (i === v.b && v.mark === 'new' && x === c.at(-1) ? 'good' : '') }, x)]))));
      root.append(box);
    },
  });

  register({
    id: 'hash-open', group: 'DSA', section: HASH, title: 'Hash Table — Open Addressing',
    blurb: 'Collisions probe for the next free slot: linear, quadratic or double hashing (with tombstones for delete).',
    inputs: [
      { key: 'm', label: 'Table size m (5–13, prime best)', type: 'number', value: 7, min: 5, max: 13 },
      { key: 'probe', label: 'Probing', type: 'select', value: 'linear', options: [['linear', 'Linear'], ['quad', 'Quadratic'], ['double', 'Double hashing']] },
      { key: 'ops', label: 'Operations', type: 'text', value: 'insert 10, insert 17, insert 24, insert 3, search 24, delete 17, search 24, insert 31' },
    ],
    pseudo: (p) => ['i = h(key)', `probe: ${{ linear: '(h + j) mod m', quad: '(h + j²) mod m', double: '(h + j·h2) mod m, h2 = 1 + key mod (m-1)' }[p.probe]}  for j = 0,1,2…`, 'insert: first empty or deleted slot', 'search: continue past tombstones until empty', 'delete: mark slot as DELETED (tombstone)'],
    viva: [{ q: 'What is primary clustering and which probing avoids it?', a: 'linear probing creates long runs of filled slots quadratic and double hashing reduce clustering' }, { q: 'Why do we use tombstones when deleting in open addressing?', a: 'emptying the slot would break the probe chain for keys placed after it so mark it deleted instead' }],
    build(p) {
      const m = clamp(Math.round(p.m), 5, 13), ops = parseOps(p.ops), T = Array(m).fill(null), sp = stepper(400); let n = 0;
      const slot = (k, j) => { const b = ((k % m) + m) % m; return p.probe === 'linear' ? (b + j) % m : p.probe === 'quad' ? (b + j * j) % m : (b + j * (1 + (((k % (m - 1)) + (m - 1)) % (m - 1)))) % m; };
      const snap = (line, msg, why, hl, mark) => sp.push(line, msg, why, { T: T.slice(), hl, mark, m }, { table: T.map((x) => x ?? '·'), items: n, loadFactor: +(n / m).toFixed(2) });
      snap(0, `Empty table of ${m} slots, ${p.probe} probing.`, 'Initial state.', -1);
      ops.forEach((o) => {
        needArg(o); const k = o.args[0];
        if (o.op === 'insert') {
          let placed = false;
          for (let j = 0; j < m; j++) { const s = slot(k, j); const free = T[s] === null || T[s] === 'DEL'; snap(1, `insert(${k}): probe j=${j} → slot ${s} is ${free ? (T[s] === 'DEL' ? 'a tombstone (reusable)' : 'empty') : 'occupied by ' + T[s]}.`, j ? 'Collision: try the next slot in the probe sequence.' : 'Start at the hash slot.', s); if (free) { T[s] = k; n++; placed = true; snap(2, `Store ${k} in slot ${s}.`, 'First free slot found.', s, 'new'); break; } if (T[s] === k) { snap(2, `${k} already present.`, 'Keys are unique.', s); placed = true; break; } }
          if (!placed) snap(2, `Table full: cannot insert ${k}.`, 'Every probe hit an occupied slot.', -1);
        } else if (o.op === 'search' || o.op === 'delete') {
          let hit = -1;
          for (let j = 0; j < m; j++) { const s = slot(k, j); snap(3, `${o.op}(${k}): probe j=${j} → slot ${s} holds ${T[s] ?? 'nothing'}.`, 'Follow the same probe sequence as insertion.', s); if (T[s] === k) { hit = s; break; } if (T[s] === null) break; }
          if (hit >= 0) { if (o.op === 'delete') { T[hit] = 'DEL'; n--; snap(4, `Mark slot ${hit} as DELETED (tombstone).`, 'Keeps later probe chains intact.', hit, 'bad'); } else snap(3, `Found ${k} at slot ${hit}.`, 'Key located.', hit, 'new'); }
          else snap(3, `${k} not found.`, 'An empty slot ends the probe sequence.', -1);
        } else throw new Error(`Unknown operation "${o.raw}".`);
      });
      return { steps: sp.steps, meta: {} };
    },
    render(root, step) { const v = step.view, marks = {}; v.T.forEach((x, i) => { marks[i] = x === 'DEL' ? 'dim' : x !== null ? 'sel' : ''; }); if (v.hl >= 0) marks[v.hl] = v.mark === 'new' ? 'done' : v.mark === 'bad' ? 'swap' : 'cmp'; root.append(D.cells(v.T.map((x) => (x === 'DEL' ? '✝' : x)), marks, {}, 'Table slots (✝ = tombstone)')); },
  });
})();
