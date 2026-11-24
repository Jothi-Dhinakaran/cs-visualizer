/* os.js — Operating-system visualizers: CPU scheduling Gantt chart and page replacement. */
(function () {
  'use strict';
  const { h, clamp, parseNumList, register, PALETTE } = window.CSViz;

  /* ───────────────────────── CPU scheduling ───────────────────────── */
  function parseProcs(text) {
    const procs = String(text).split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean).map((tok) => {
      const m = tok.match(/^(\w+)\s*:\s*(\d+)\s*:\s*(\d+)$/);
      if (!m || Number(m[3]) < 1) throw new Error(`Bad process "${tok}". Use Name:arrival:burst (burst ≥ 1), e.g. P1:0:5`);
      return { name: m[1], arrival: Number(m[2]), burst: Number(m[3]) };
    });
    if (!procs.length) throw new Error('Enter at least one process.');
    if (procs.length > 8) throw new Error('Use at most 8 processes.');
    if (new Set(procs.map((x) => x.name)).size !== procs.length) throw new Error('Process names must be unique.');
    return procs;
  }

  const ALGO_NAME = { fcfs: 'FCFS', sjf: 'SJF (non-preemptive)', srtf: 'SRTF (preemptive SJF)', rr: 'Round Robin' };
  const SCHED_PSEUDO = {
    fcfs: ['ready queue ← processes ordered by arrival', 'while processes remain:', '  p ← front of ready queue (earliest arrival)', '  run p until it finishes', '  TAT = completion − arrival; WT = TAT − burst'],
    sjf: ['while processes remain:', '  choose ready p with the smallest burst', '  run p until it finishes (no preemption)', '  TAT = completion − arrival; WT = TAT − burst'],
    srtf: ['while processes remain:', '  choose ready p with the least remaining time', '  run p until it finishes or a new process arrives', '  if a shorter job arrived, p is preempted', '  TAT = completion − arrival; WT = TAT − burst'],
    rr: ['ready queue ← processes ordered by arrival', 'while processes remain:', '  p ← front of ready queue', '  run p for min(quantum, remaining)', '  new arrivals join the queue, then p goes to the back if unfinished', '  TAT = completion − arrival; WT = TAT − burst'],
  };
  const SCHED_LINES = { fcfs: [2, 3], sjf: [1, 2], srtf: [1, 2], rr: [2, 3] };

  register({
    id: 'cpu', group: 'Operating Systems', title: 'CPU Scheduling (Gantt + Ready Queue)',
    blurb: 'Compare FCFS, SJF, SRTF and Round Robin. Each step dispatches one CPU slice.',
    inputs: [
      { key: 'procs', label: 'Processes (Name:arrival:burst)', type: 'text', value: 'P1:0:5, P2:1:3, P3:2:8, P4:3:6' },
      { key: 'algo', label: 'Algorithm', type: 'select', value: 'rr', options: [['fcfs', 'FCFS'], ['sjf', 'SJF (non-preemptive)'], ['srtf', 'SRTF (preemptive)'], ['rr', 'Round Robin']] },
      { key: 'quantum', label: 'Time quantum (Round Robin)', type: 'range', value: 2, min: 1, max: 8, step: 1 },
    ],
    pseudo: (p) => SCHED_PSEUDO[p.algo],
    viva: [
      { q: 'Why does SJF minimize average waiting time, and what is its main drawback?', a: 'shortest job first gives the lowest average waiting time but causes starvation of long processes and needs burst time prediction' },
      { q: 'How does the time quantum affect Round Robin?', a: 'very large quantum behaves like FCFS very small quantum causes many context switches and overhead good quantum balances response time' },
    ],
    build(p) {
      const procs = parseProcs(p.procs), algo = p.algo, q = clamp(Math.round(p.quantum), 1, 8), n = procs.length;
      const rem = procs.map((x) => x.burst), admitted = Array(n).fill(false), ct = Array(n).fill(null);
      const order = [...procs.keys()].sort((a, b) => procs[a].arrival - procs[b].arrival || a - b);
      let queue = [], t = 0, finished = 0;
      const admit = (time) => { const got = []; for (const i of order) if (!admitted[i] && procs[i].arrival <= time) { admitted[i] = true; queue.push(i); got.push(i); } return got; };
      const steps = [], segs = [];
      const table = () => procs.map((x, i) => ({ name: x.name, at: x.arrival, bt: x.burst, rem: rem[i], ct: ct[i], tat: ct[i] === null ? null : ct[i] - x.arrival, wt: ct[i] === null ? null : ct[i] - x.arrival - x.burst }));
      const qView = () => queue.map((i) => ({ i, name: procs[i].name, rem: rem[i] }));

      steps.push({
        line: 0, msg: `${ALGO_NAME[algo]}${algo === 'rr' ? ` (quantum ${q})` : ''}: ${n} processes, nothing has run yet.`, why: 'Initial state before the CPU is given to any process.',
        view: { segs: [], queue: [], running: null, time: 0, table: table() }, state: { time: 0, readyQueue: [], running: '—', finished: 0 },
      });
      admit(0);
      while (finished < n) {
        admit(t);
        if (!queue.length) {
          const nxt = Math.min(...order.filter((i) => !admitted[i]).map((i) => procs[i].arrival));
          segs.push({ idle: true, start: t, end: nxt });
          steps.push({
            line: 0, msg: `t=${t}: CPU idle until t=${nxt} (no process has arrived).`, why: 'The ready queue is empty, so the CPU has nothing to run.',
            view: { segs: segs.map((x) => ({ ...x })), queue: [], running: null, time: nxt, table: table() }, state: { time: nxt, readyQueue: [], running: 'idle', finished },
          });
          t = nxt; continue;
        }
        let pick = queue[0];
        if (algo === 'sjf') for (const i of queue) if (procs[i].burst < procs[pick].burst) pick = i;
        if (algo === 'srtf') for (const i of queue) if (rem[i] < rem[pick]) pick = i;
        queue.splice(queue.indexOf(pick), 1);
        const upcoming = order.filter((i) => !admitted[i]).map((i) => procs[i].arrival);
        let len = rem[pick];
        if (algo === 'rr') len = Math.min(q, rem[pick]);
        if (algo === 'srtf' && upcoming.length) len = Math.min(rem[pick], Math.min(...upcoming) - t);
        const seg = { pid: pick, start: t, end: t + len };
        segs.push(seg);
        const waiting = qView();
        const before = rem[pick];
        rem[pick] -= len; t += len;
        const arrived = admit(t);
        let outcome;
        if (rem[pick] > 0) { queue.push(pick); outcome = `${procs[pick].name} is ${algo === 'rr' ? 'preempted (quantum expired)' : 'preempted for a possibly shorter job'} with ${rem[pick]} left and goes to the back of the queue.`; }
        else { ct[pick] = t; finished++; outcome = `${procs[pick].name} finishes at t=${t} (TAT=${t - procs[pick].arrival}, WT=${t - procs[pick].arrival - procs[pick].burst}).`; }
        const whys = {
          fcfs: 'FCFS always serves the process that arrived first and never preempts it.',
          sjf: 'SJF picks the ready process with the shortest burst and lets it finish.',
          srtf: 'SRTF picks the shortest remaining time and re-checks whenever a new process arrives.',
          rr: `Round Robin gives each process at most ${q} unit(s) in turn, so everyone makes progress.`,
        };
        steps.push({
          line: SCHED_LINES[algo], msg: `t=${seg.start}: dispatch ${procs[pick].name} for ${len} unit(s) [${seg.start}→${seg.end}] (had ${before}). ${arrived.length ? 'Arrived meanwhile: ' + arrived.map((i) => procs[i].name).join(', ') + '. ' : ''}${outcome}`,
          why: whys[algo],
          view: { segs: segs.map((x) => ({ ...x })), queue: waiting, running: pick, time: t, table: table() },
          state: { time: seg.start, running: procs[pick].name, readyQueueAtDispatch: waiting.map((x) => `${x.name}(${x.rem})`), remaining: Object.fromEntries(procs.map((x, i) => [x.name, rem[i]])), finished },
        });
      }
      const rows = table();
      const avgW = rows.reduce((a, r) => a + r.wt, 0) / n, avgT = rows.reduce((a, r) => a + r.tat, 0) / n;
      steps.push({
        line: SCHED_PSEUDO[algo].length - 1, msg: `All done. Average waiting time = ${avgW.toFixed(2)}, average turnaround = ${avgT.toFixed(2)}.`, why: 'WT = TAT − burst and TAT = completion − arrival, averaged over all processes.',
        view: { segs: segs.map((x) => ({ ...x })), queue: [], running: null, time: t, table: rows, avg: { avgW, avgT } },
        state: { avgWaiting: +avgW.toFixed(2), avgTurnaround: +avgT.toFixed(2), finished: n },
      });
      return { steps, meta: { procs, total: Math.max(t, 1) } };
    },
    render(root, step, ctx) {
      const { procs, total } = ctx.meta, v = step.view, col = (i) => PALETTE[i % PALETTE.length];
      const gantt = h('div', { class: 'gantt' });
      const ticks = new Set([0]);
      v.segs.forEach((sg, k) => {
        ticks.add(sg.start); ticks.add(sg.end);
        gantt.appendChild(h('div', { class: 'seg' + (sg.idle ? ' idle' : '') + (k === v.segs.length - 1 && v.running !== null ? ' now' : ''), style: { left: (sg.start / total) * 100 + '%', width: ((sg.end - sg.start) / total) * 100 + '%', background: sg.idle ? null : col(sg.pid) } }, sg.idle ? 'idle' : procs[sg.pid].name));
      });
      ticks.forEach((tk) => gantt.appendChild(h('div', { class: 'tick', style: { left: (tk / total) * 100 + '%' } }, tk)));
      const chip = (x) => h('span', { class: 'chip', style: { borderColor: col(x.i) } }, `${x.name} (rem ${x.rem})`);
      const rows = [h('tr', {}, ['Process', 'Arrival', 'Burst', 'Remaining', 'Completion', 'Turnaround', 'Waiting'].map((t) => h('th', {}, t)))];
      v.table.forEach((r, i) => rows.push(h('tr', {}, [h('td', { style: { color: col(i) } }, r.name), r.at, r.bt, r.rem, r.ct ?? '—', r.tat ?? '—', r.wt ?? '—'].map((c) => (c && c.nodeType ? c : h('td', {}, c))))));
      root.append(
        h('div', { class: 'stat' }, 'Time: ', h('b', {}, v.time)),
        h('div', { class: 'label' }, 'Gantt chart'), gantt,
        h('div', { class: 'chips' }, h('span', { class: 'label' }, 'CPU:'), v.running !== null ? h('span', { class: 'chip run', style: { borderColor: col(v.running) } }, procs[v.running].name) : h('span', { class: 'chip' }, 'idle / done'),
          h('span', { class: 'label', style: { marginLeft: '16px' } }, 'Ready queue (front → back, at dispatch):'), v.queue.length ? v.queue.map(chip) : h('span', { class: 'muted' }, 'empty')),
        h('table', { class: 'grid' }, rows),
        v.avg ? h('div', {}, h('span', { class: 'stat' }, 'Avg waiting: ', h('b', {}, v.avg.avgW.toFixed(2))), h('span', { class: 'stat' }, 'Avg turnaround: ', h('b', {}, v.avg.avgT.toFixed(2)))) : null);
    },
  });

  /* ───────────────────────── Page replacement ───────────────────────── */
  register({
    id: 'page', group: 'Operating Systems', title: 'Page Replacement (FIFO / LRU / Optimal)',
    blurb: 'Feed a reference string through a fixed number of frames and count page faults.',
    inputs: [
      { key: 'refs', label: 'Reference string', type: 'text', value: '7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1' },
      { key: 'frames', label: 'Frames', type: 'range', value: 3, min: 1, max: 6, step: 1 },
      { key: 'algo', label: 'Algorithm', type: 'select', value: 'lru', options: [['fifo', 'FIFO'], ['lru', 'LRU'], ['opt', 'Optimal']] },
    ],
    pseudo: (p) => ['for each page reference r:', '  if r is in a frame: HIT', '  else: PAGE FAULT', '    if a frame is free: load r there',
      '    else victim = ' + { fifo: 'page loaded earliest', lru: 'page used longest ago', opt: 'page whose next use is farthest away' }[p.algo], '    replace victim with r'],
    viva: [
      { q: "What is Belady's anomaly and which algorithm suffers from it?", a: 'increasing the number of frames can increase page faults FIFO suffers LRU and optimal do not stack algorithms' },
      { q: 'Why is the Optimal algorithm not used in real systems?', a: 'requires knowing future references which is impossible used only as a benchmark' },
    ],
    build(p) {
      const refs = parseNumList(p.refs, 'Reference string').map(Math.round);
      if (refs.length > 30) throw new Error('Use at most 30 references.');
      const F = clamp(Math.round(p.frames), 1, 6), algo = p.algo;
      const frames = Array(F).fill(null), loaded = {}, used = {};
      let hits = 0, faults = 0;
      const cols = [], steps = [];
      steps.push({ line: 0, msg: `Start: ${F} empty frames, ${refs.length} references, algorithm ${algo.toUpperCase()}.`, why: 'All frames are empty, so the first references will all fault.', view: { cols: [], cur: -1, hits, faults }, state: { frames: frames.slice(), hits, faults } });
      refs.forEach((r, t) => {
        let hit = frames.includes(r), victim = null, why, msg;
        if (hit) {
          hits++; used[r] = t;
          msg = `Reference ${r}: already in memory → HIT.`; why = 'The page is resident, so no disk access is needed.';
        } else {
          faults++;
          const free = frames.indexOf(null);
          let slot;
          if (free >= 0) { slot = free; msg = `Reference ${r}: not in memory → PAGE FAULT, loaded into free frame ${slot}.`; why = 'A frame is empty, so nothing needs to be evicted.'; }
          else {
            let best = 0, bestScore = null;
            frames.forEach((pg, i) => {
              let score;
              if (algo === 'fifo') score = loaded[pg];
              else if (algo === 'lru') score = used[pg];
              else { const nx = refs.indexOf(pg, t + 1); score = nx === -1 ? -Infinity : -nx; }
              if (bestScore === null || score < bestScore) { bestScore = score; best = i; }
            });
            slot = best; victim = frames[slot];
            const reason = algo === 'fifo' ? `${victim} was loaded earliest (at step ${loaded[victim] + 1})`
              : algo === 'lru' ? `${victim} was last used at step ${used[victim] + 1}, the longest ago`
                : refs.indexOf(victim, t + 1) === -1 ? `${victim} is never used again` : `${victim} is next used at step ${refs.indexOf(victim, t + 1) + 1}, the farthest in the future`;
            msg = `Reference ${r}: PAGE FAULT, memory full → evict ${victim} (${reason}).`;
            why = { fifo: 'FIFO evicts the oldest resident page regardless of use.', lru: 'LRU assumes recently used pages will be used again soon.', opt: 'Optimal looks ahead and evicts the page needed furthest in the future.' }[algo];
          }
          frames[slot] = r; loaded[r] = t; used[r] = t;
        }
        cols.push({ ref: r, frames: frames.slice(), hit, victim });
        steps.push({
          line: hit ? 1 : [2, 3, 4, 5], msg, why,
          view: { cols: cols.map((c) => ({ ...c })), cur: t, hits, faults },
          state: { step: t + 1, reference: r, frames: frames.slice(), result: hit ? 'HIT' : 'FAULT', victim: victim ?? '—', hits, faults },
        });
      });
      const total = refs.length;
      steps.push({ line: 0, msg: `Done: ${hits} hits, ${faults} faults → hit ratio ${(hits / total * 100).toFixed(1)}%, miss ratio ${(faults / total * 100).toFixed(1)}%.`, why: 'Hit ratio = hits / references; miss ratio = faults / references.', view: { cols: cols.map((c) => ({ ...c })), cur: total - 1, hits, faults, final: true }, state: { hits, faults, hitRatio: +(hits / total).toFixed(3), missRatio: +(faults / total).toFixed(3) } });
      return { steps, meta: { refs, F, total } };
    },
    render(root, step, ctx) {
      const { refs, F, total } = ctx.meta, v = step.view;
      const head = [h('th', {}, 'ref')], frameRows = Array.from({ length: F }, (_, i) => [h('th', {}, 'frame ' + i)]), res = [h('th', {}, 'result')];
      refs.forEach((r, t) => {
        const c = v.cols[t], isCur = t === v.cur && !v.final;
        head.push(h('th', { class: isCur ? 'curcol' : '' }, r));
        for (let i = 0; i < F; i++) {
          const val = c ? c.frames[i] : null;
          const cls = c && c.victim !== null && val === r && !c.hit && c.frames[i] === r && isCur ? 'cur' : '';
          frameRows[i].push(h('td', { class: (isCur && val === r ? 'cur' : '') || cls }, val === null || val === undefined ? '' : val));
        }
        res.push(h('td', { class: c ? (c.hit ? 'hit' : 'miss') : '' }, c ? (c.hit ? 'HIT' : 'MISS') : ''));
      });
      const done = v.hits + v.faults;
      root.append(h('table', { class: 'grid' }, h('tr', {}, head), frameRows.map((r) => h('tr', {}, r)), h('tr', {}, res)),
        h('div', {}, h('span', { class: 'stat' }, 'Hits: ', h('b', {}, v.hits)), h('span', { class: 'stat' }, 'Faults: ', h('b', {}, v.faults)),
          h('span', { class: 'stat' }, 'Hit ratio: ', h('b', {}, done ? (v.hits / done * 100).toFixed(1) + '%' : '—')),
          h('span', { class: 'stat' }, 'Miss ratio: ', h('b', {}, done ? (v.faults / done * 100).toFixed(1) + '%' : '—'))));
    },
  });
})();
