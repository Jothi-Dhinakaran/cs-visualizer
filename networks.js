/* networks.js — Computer-network visualizers: TCP handshake, sliding window, IPv4 subnetting. */
(function () {
  'use strict';
  const { h, s, clamp, register } = window.CSViz;

  /* ───────────────────────── TCP handshake ───────────────────────── */
  register({
    id: 'tcp', group: 'Computer Networks', title: 'TCP 3-Way Handshake (+ data & close)',
    blurb: 'See SYN, SYN-ACK, ACK with sequence/ack numbers and the client/server state machines.',
    inputs: [
      { key: 'cisn', label: 'Client initial seq (x)', type: 'number', value: 100, min: 0, max: 100000 },
      { key: 'sisn', label: 'Server initial seq (y)', type: 'number', value: 300, min: 0, max: 100000 },
      { key: 'data', label: 'Send 5 bytes of data', type: 'checkbox', value: true },
      { key: 'close', label: 'Include connection close (FIN)', type: 'checkbox', value: true },
    ],
    pseudo: () => ['Client: SYN, seq = x              → SYN_SENT', 'Server: SYN+ACK, seq = y, ack = x+1 → SYN_RCVD', 'Client: ACK, seq = x+1, ack = y+1  → ESTABLISHED',
      'Data: seq = x+1, len = n; ACK = x+1+n', 'Close: FIN → ACK → FIN → ACK, then TIME_WAIT'],
    viva: [
      { q: 'Why does TCP need three messages instead of two to open a connection?', a: 'both sides must confirm their initial sequence numbers and that the other can receive and send third ack confirms server sequence number and prevents old duplicate SYNs' },
      { q: 'What is the purpose of the TIME_WAIT state?', a: 'wait 2 MSL so the final ACK can be retransmitted if lost and old duplicate segments expire' },
    ],
    build(p) {
      const x = Math.round(p.cisn), y = Math.round(p.sisn);
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Sequence numbers must be numbers.');
      let c = x + 1, sv = y + 1; // next seq of client / server after handshake
      const ev = [
        { from: 'C', flags: ['SYN'], seq: x, ack: 0, cs: 'SYN_SENT', ss: 'LISTEN', line: 0, msg: `Client → Server: SYN, seq=${x}. Client enters SYN_SENT.`, why: 'The client opens the connection by proposing its initial sequence number.' },
        { from: 'S', flags: ['SYN', 'ACK'], seq: y, ack: x + 1, cs: 'SYN_SENT', ss: 'SYN_RCVD', line: 1, msg: `Server → Client: SYN+ACK, seq=${y}, ack=${x + 1}. Server enters SYN_RCVD.`, why: `The server acknowledges the client's SYN (ack = x+1) and proposes its own sequence number.` },
        { from: 'C', flags: ['ACK'], seq: c, ack: y + 1, cs: 'ESTABLISHED', ss: 'ESTABLISHED', line: 2, msg: `Client → Server: ACK, seq=${c}, ack=${y + 1}. Both sides are ESTABLISHED.`, why: `The client acknowledges the server's SYN (ack = y+1); the connection is now open both ways.` },
      ];
      if (p.data) {
        ev.push({ from: 'C', flags: ['PSH', 'ACK'], seq: c, ack: sv, len: 5, cs: 'ESTABLISHED', ss: 'ESTABLISHED', line: 3, msg: `Client → Server: 5 bytes of data, seq=${c}.`, why: 'Data segments carry the sequence number of their first byte.' });
        c += 5;
        ev.push({ from: 'S', flags: ['ACK'], seq: sv, ack: c, cs: 'ESTABLISHED', ss: 'ESTABLISHED', line: 3, msg: `Server → Client: ACK, ack=${c} (received bytes up to ${c - 1}).`, why: 'The ack number is the next byte the receiver expects.' });
      }
      if (p.close) {
        ev.push({ from: 'C', flags: ['FIN', 'ACK'], seq: c, ack: sv, cs: 'FIN_WAIT_1', ss: 'ESTABLISHED', line: 4, msg: `Client → Server: FIN, seq=${c}. Client enters FIN_WAIT_1.`, why: 'The client has no more data to send and starts closing its side.' });
        ev.push({ from: 'S', flags: ['ACK'], seq: sv, ack: c + 1, cs: 'FIN_WAIT_2', ss: 'CLOSE_WAIT', line: 4, msg: `Server → Client: ACK, ack=${c + 1}. Server CLOSE_WAIT, client FIN_WAIT_2.`, why: 'A FIN consumes one sequence number, so ack = seq + 1.' });
        ev.push({ from: 'S', flags: ['FIN', 'ACK'], seq: sv, ack: c + 1, cs: 'FIN_WAIT_2', ss: 'LAST_ACK', line: 4, msg: `Server → Client: FIN, seq=${sv}. Server enters LAST_ACK.`, why: 'The server finishes sending and closes its own side (TCP closes each direction separately).' });
        ev.push({ from: 'C', flags: ['ACK'], seq: c + 1, ack: sv + 1, cs: 'TIME_WAIT', ss: 'CLOSED', line: 4, msg: `Client → Server: ACK, ack=${sv + 1}. Server CLOSED, client TIME_WAIT.`, why: 'The client waits 2×MSL in case its final ACK is lost.' });
      }
      const steps = [{ line: 0, msg: 'Server called listen(); client is about to call connect().', why: 'A passive open (server) must exist before the active open (client).', view: { upto: 0, cs: 'CLOSED', ss: 'LISTEN', ev: null }, state: { clientState: 'CLOSED', serverState: 'LISTEN' } }];
      ev.forEach((e, i) => steps.push({
        line: e.line, msg: e.msg, why: e.why, view: { upto: i + 1, cs: e.cs, ss: e.ss, ev: e },
        state: { direction: e.from === 'C' ? 'client→server' : 'server→client', flags: e.flags.join('+'), seq: e.seq, ack: e.flags.includes('ACK') ? e.ack : '—', clientState: e.cs, serverState: e.ss },
      }));
      if (p.close) steps.push({ line: 4, msg: 'After 2×MSL the client reaches CLOSED. Connection fully terminated.', why: 'TIME_WAIT expires, releasing the port pair.', view: { upto: ev.length, cs: 'CLOSED', ss: 'CLOSED', ev: null }, state: { clientState: 'CLOSED', serverState: 'CLOSED' } });
      return { steps, meta: { ev } };
    },
    render(root, step, ctx) {
      const { ev } = ctx.meta, v = step.view, GAP = 54, TOP = 90, W = 700, H = TOP + Math.max(ev.length, 3) * GAP + 30;
      const L = 150, R = 550;
      const svg = s('svg', { class: 'viz-svg', viewBox: `0 0 ${W} ${H}`, style: { maxWidth: '800px' } });
      svg.appendChild(s('defs', {}, s('marker', { id: 'ah2', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { class: 'arrowhead', d: 'M0,0 L10,5 L0,10 z' }))));
      [[L, 'Client', v.cs], [R, 'Server', v.ss]].forEach(([x, name, st]) => {
        svg.appendChild(s('rect', { class: 'box', x: x - 70, y: 8, width: 140, height: 56, rx: 8 }));
        svg.appendChild(s('text', { x, y: 25 }, name)); svg.appendChild(s('text', { x, y: 46, class: 'small' }, st));
        svg.appendChild(s('line', { class: 'life', x1: x, y1: 64, x2: x, y2: H - 10 }));
      });
      for (let i = 0; i < v.upto; i++) {
        const e = ev[i], y1 = TOP + i * GAP, y2 = y1 + 30, fromX = e.from === 'C' ? L : R, toX = e.from === 'C' ? R : L, cur = i === v.upto - 1 && v.ev;
        svg.appendChild(s('line', { class: 'arrow' + (cur ? ' cur' : ''), x1: fromX, y1, x2: toX, y2, 'marker-end': 'url(#ah2)' }));
        svg.appendChild(s('text', { x: 350, y: (y1 + y2) / 2 - 10, transform: `rotate(${Math.atan2(30, toX - fromX) * 57.3} 350 ${(y1 + y2) / 2 - 10})` }, `${e.flags.join('+')}  seq=${e.seq}${e.flags.includes('ACK') ? ' ack=' + e.ack : ''}${e.len ? ' len=' + e.len : ''}`));
      }
      const flagRow = h('div', { class: 'flags' }, ['URG', 'ACK', 'PSH', 'RST', 'SYN', 'FIN'].map((f) => h('span', { class: v.ev && v.ev.flags.includes(f) ? 'on' : '' }, f)));
      root.append(svg, h('div', { class: 'label' }, 'TCP header flags of the current segment:'), flagRow);
    },
  });

  /* ───────────────────────── Sliding window ───────────────────────── */
  register({
    id: 'window', group: 'Computer Networks', title: 'Sliding Window (Go-Back-N / Selective Repeat)',
    blurb: 'Watch the sender window slide as ACKs return. Drop a packet to see how each protocol recovers.',
    inputs: [
      { key: 'proto', label: 'Protocol', type: 'select', value: 'gbn', options: [['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']] },
      { key: 'total', label: 'Packets to send (4–12)', type: 'number', value: 8, min: 4, max: 12 },
      { key: 'win', label: 'Window size', type: 'range', value: 4, min: 1, max: 6, step: 1 },
      { key: 'loss', label: 'Packet to lose once (-1 = none)', type: 'number', value: 3, min: -1, max: 11 },
    ],
    pseudo: (p) => p.proto === 'gbn'
      ? ['while base < total:', '  send packets while next < base + W', '  receiver accepts only seq == expected, ACKs it', '  ACK k → base = k + 1 (window slides)', '  timeout → resend everything from base (Go-Back-N)']
      : ['while base < total:', '  send packets while next < base + W', '  receiver buffers any packet in window, ACKs it individually', '  slide base while packet[base] is ACKed', '  timeout → resend ONLY the lost packet'],
    viva: [
      { q: 'What is the difference between Go-Back-N and Selective Repeat?', a: 'go-back-n retransmits all packets from the lost one receiver discards out of order selective repeat retransmits only the lost packet receiver buffers out of order packets' },
      { q: 'What is the maximum window size for Selective Repeat with n-bit sequence numbers?', a: '2^(n-1) half the sequence number space to avoid ambiguity between old and new packets' },
    ],
    build(p) {
      const total = clamp(Math.round(p.total), 4, 12), W = clamp(Math.round(p.win), 1, 6), gbn = p.proto === 'gbn';
      let loss = Math.round(p.loss); if (loss >= total) loss = -1;
      const st = Array(total).fill(0), rcv = Array(total).fill(false); // st: 0 idle, 1 sent, 2 acked
      let base = 0, next = 0, expected = 0, lossDone = loss < 0, retx = 0;
      const steps = [];
      const emit = (line, msg, why, ev) => steps.push({
        line, msg, why, view: { st: st.slice(), rcv: rcv.slice(), base, next, expected, W, total, ev, gbn },
        state: { protocol: gbn ? 'Go-Back-N' : 'Selective Repeat', base, nextSeq: next, windowSize: W, windowRange: `[${base}..${Math.min(base + W - 1, total - 1)}]`, acked: st.map((x, i) => (x === 2 ? i : null)).filter((x) => x !== null), retransmissions: retx },
      });
      emit(0, `Sender has ${total} packets (seq 0–${total - 1}), window size ${W}. ${loss >= 0 ? `Packet ${loss} will be lost on its first transmission.` : 'No packet loss.'}`, 'Initial state: window covers the first W sequence numbers.', null);
      const slide = () => { const o = base; while (base < total && st[base] === 2) base++; return base - o; };
      while (base < total) {
        const sent = [];
        while (next < base + W && next < total) {
          st[next] = 1; sent.push(next);
          emit(1, `Sender transmits packet ${next} (window [${base}..${Math.min(base + W - 1, total - 1)}]).`, 'The sender may have up to W unacknowledged packets in flight.', { kind: 'data', seq: next });
          next++;
        }
        let lost = null;
        for (const k of sent) {
          if (k === loss && !lossDone) { lossDone = true; lost = k; emit(2, `Packet ${k} is LOST in the network.`, 'The packet never reaches the receiver, so no ACK will come back for it.', { kind: 'lost', seq: k }); continue; }
          if (gbn) {
            if (k === expected) {
              rcv[k] = true; expected++; st[k] = 2; slide();
              emit(3, `Receiver accepts packet ${k} in order and sends ACK ${k}. Window slides: base = ${base}.`, 'In Go-Back-N the ACK is cumulative: everything up to k is confirmed.', { kind: 'ack', seq: k });
            } else {
              emit(2, `Packet ${k} arrives out of order (expected ${expected}) → discarded; receiver re-sends ACK ${expected - 1}.`, 'Go-Back-N receivers have no buffer: out-of-order packets are dropped and the last in-order ACK is repeated.', { kind: 'dup', seq: expected - 1 });
            }
          } else {
            rcv[k] = true; st[k] = 2; const moved = slide();
            emit(3, `Receiver buffers packet ${k} and sends ACK ${k}.${moved ? ` Window slides by ${moved}: base = ${base}.` : ` Base stays at ${base} (packet ${base} not yet acked).`}`, 'Selective Repeat ACKs each packet individually and keeps out-of-order packets.', { kind: 'ack', seq: k });
          }
        }
        if (lost !== null) {
          retx++;
          if (gbn) {
            emit(4, `Timeout for packet ${base}: Go-Back-N resends everything from ${base} to ${next - 1}.`, 'No ACK arrived before the timer expired; Go-Back-N cannot tell what the receiver kept, so it resends the whole window.', { kind: 'info', text: 'TIMEOUT' });
            for (let i = base; i < next; i++) st[i] = 0;
            next = base;
          } else {
            emit(4, `Timeout for packet ${lost}: Selective Repeat resends only packet ${lost}.`, 'The other packets were individually ACKed, so only the missing one is retransmitted.', { kind: 'info', text: 'TIMEOUT' });
            emit(1, `Sender retransmits packet ${lost}.`, 'Retransmission of the lost packet only.', { kind: 'data', seq: lost });
            rcv[lost] = true; st[lost] = 2; const moved = slide();
            emit(3, `Receiver gets packet ${lost}, sends ACK ${lost}. Window jumps by ${moved}: base = ${base}.`, 'The buffered packets are now contiguous, so the window slides past all of them at once.', { kind: 'ack', seq: lost });
          }
        }
      }
      emit(0, `All ${total} packets acknowledged with ${retx} timeout(s).`, 'Every sequence number is ACKed, so the window has slid past the end.', null);
      return { steps, meta: { total } };
    },
    render(root, step, ctx) {
      const v = step.view;
      const sender = h('div', { class: 'sw-row' }, Array.from({ length: v.total }, (_, i) => h('div', { class: 'sw-cell ' + (v.st[i] === 2 ? 'acked ' : v.st[i] === 1 ? 'sent ' : '') + (i >= v.base && i < v.base + v.W ? 'inwin' : '') }, i,
        i === v.base ? h('small', {}, 'base') : i === v.next ? h('small', {}, 'next') : null)));
      const recv = h('div', { class: 'sw-row' }, Array.from({ length: v.total }, (_, i) => h('div', { class: 'sw-cell ' + (v.rcv[i] ? 'got' : '') }, v.rcv[i] ? i : '', i === v.expected && v.gbn ? h('small', {}, 'expect') : null)));
      const e = v.ev;
      const lane = e ? h('div', { class: 'pkt ' + (e.kind === 'data' ? 'data' : e.kind === 'ack' || e.kind === 'dup' ? 'ack' : e.kind === 'lost' ? 'lost' : 'info') },
        e.kind === 'data' ? `DATA seq ${e.seq}  ➜` : e.kind === 'ack' ? `⬅  ACK ${e.seq}` : e.kind === 'dup' ? `⬅  duplicate ACK ${e.seq}` : e.kind === 'lost' ? `✕ packet ${e.seq} lost` : e.text) : h('span', { class: 'muted' }, '—');
      root.append(h('div', { class: 'label' }, 'Sender (blue outline = window, amber = sent, green = ACKed)'), sender, h('div', { class: 'sw-lane' }, lane), h('div', { class: 'label' }, 'Receiver'), recv);
    },
  });

  /* ───────────────────────── IPv4 subnetting ───────────────────────── */
  const ipToInt = (str) => {
    const m = String(str).trim().split('.');
    if (m.length !== 4 || m.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) throw new Error('Enter a valid IPv4 address like 192.168.10.77');
    return m.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0);
  };
  const intToIp = (n) => [24, 16, 8, 0].map((sh) => (n >>> sh) & 255).join('.');
  const bin32 = (n) => (n >>> 0).toString(2).padStart(32, '0');

  register({
    id: 'subnet', group: 'Computer Networks', title: 'IPv4 Subnetting & CIDR Calculator',
    blurb: 'Bit-level view of the address, mask, network and broadcast. Click an address bit to flip it, drag the CIDR slider.',
    inputs: [
      { key: 'ip', label: 'IPv4 address', type: 'text', value: '192.168.10.77' },
      { key: 'cidr', label: 'CIDR prefix length (/n)', type: 'range', value: 26, min: 0, max: 32, step: 1 },
      { key: 'borrow', label: 'Split into 2^k subnets (k)', type: 'range', value: 2, min: 0, max: 4, step: 1 },
    ],
    pseudo: () => ['write the address in binary (4 octets × 8 bits)', 'mask = n ones followed by (32 − n) zeros', 'network = address AND mask', 'broadcast = network OR (NOT mask)',
      'hosts = 2^(32 − n) − 2; range = network+1 … broadcast−1', 'borrow k host bits → 2^k subnets of prefix n + k'],
    viva: [
      { q: 'How do you compute the network address and number of usable hosts from an IP and /n?', a: 'bitwise AND of ip and subnet mask gives network address usable hosts 2^(32-n) minus 2 network and broadcast addresses reserved' },
      { q: 'What is the difference between a /24 and a /26 network?', a: '/24 has 256 addresses 254 hosts /26 has 64 addresses 62 hosts mask 255.255.255.192 four /26 subnets fit in one /24' },
    ],
    build(p) {
      const ip = ipToInt(p.ip), n = clamp(Math.round(p.cidr), 0, 32), k = clamp(Math.round(p.borrow), 0, 4);
      const mask = n === 0 ? 0 : (0xFFFFFFFF << (32 - n)) >>> 0, net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0;
      const total = 2 ** (32 - n), hosts = n >= 31 ? (n === 31 ? 2 : 1) : total - 2;
      const first = n >= 31 ? net : net + 1, last = n >= 31 ? bc : bc - 1;
      const o1 = ip >>> 24, o2 = (ip >>> 16) & 255;
      const cls = o1 < 128 ? 'A' : o1 < 192 ? 'B' : o1 < 224 ? 'C' : o1 < 240 ? 'D (multicast)' : 'E (reserved)';
      const priv = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 < 32) || (o1 === 192 && o2 === 168);
      const subs = [];
      if (k > 0 && n + k <= 30) for (let i = 0; i < 2 ** k; i++) { const sn = (net + i * 2 ** (32 - n - k)) >>> 0, sb = (sn + 2 ** (32 - n - k) - 1) >>> 0; subs.push({ net: intToIp(sn), range: `${intToIp(sn + 1)} – ${intToIp(sb - 1)}`, bc: intToIp(sb) }); }
      const mk = (line, msg, why, show, state) => ({ line, msg, why, view: { show }, state });
      const steps = [
        mk(0, `Convert ${intToIp(ip)} to binary: ${bin32(ip).match(/.{8}/g).join('.')}.`, 'Subnet maths is bitwise, so we first see the address as 32 bits.', ['ip'], { address: intToIp(ip), binary: bin32(ip).match(/.{8}/g).join('.') }),
        mk(1, `/${n} means the first ${n} bits are the network part: mask = ${intToIp(mask)}.`, 'The prefix length counts the leading 1-bits of the subnet mask.', ['ip', 'mask'], { prefix: '/' + n, mask: intToIp(mask), networkBits: n, hostBits: 32 - n }),
        mk(2, `Network address = ${intToIp(ip)} AND ${intToIp(mask)} = ${intToIp(net)}.`, 'ANDing with the mask zeroes every host bit and keeps the network bits.', ['ip', 'mask', 'net'], { network: intToIp(net) }),
        mk(3, `Broadcast = network OR NOT mask = ${intToIp(bc)} (all host bits set to 1).`, 'Setting all host bits to 1 gives the last address in the block.', ['ip', 'mask', 'net', 'bc'], { network: intToIp(net), broadcast: intToIp(bc) }),
        mk(4, `Usable hosts = 2^${32 - n} − ${n >= 31 ? '(special /31,/32)' : '2'} = ${hosts}. Range ${intToIp(first)} – ${intToIp(last)}.`, 'The network and broadcast addresses cannot be assigned to hosts (except /31 point-to-point and /32 single host).', ['ip', 'mask', 'net', 'bc'],
          { network: intToIp(net), broadcast: intToIp(bc), firstHost: intToIp(first), lastHost: intToIp(last), usableHosts: hosts, totalAddresses: total, class: cls, private: priv }),
      ];
      if (k > 0) steps.push(mk(5, subs.length ? `Borrowing ${k} host bit(s) splits this block into ${2 ** k} subnets of /${n + k}.` : 'Not enough host bits to split that many times.', 'Each borrowed bit doubles the number of subnets and halves the hosts per subnet.', ['ip', 'mask', 'net', 'bc'], { subnets: subs.length, newPrefix: '/' + (n + k) }));
      steps.forEach((st) => { st.view.info = { ip: intToIp(ip), mask: intToIp(mask), net: intToIp(net), bc: intToIp(bc), first: intToIp(first), last: intToIp(last), hosts, total, cls, priv, n, subs: st === steps.at(-1) ? subs : [] }; st.view.vals = { ip, mask, net, bc }; });
      return { steps, meta: {} };
    },
    render(root, step, ctx) {
      const v = step.view, n = v.info.n, cur = ['ip', 'mask', 'net', 'bc'][Math.min(step.view.show.length, 4) - 1];
      const row = (key, name, val, clickable) => {
        const bits = bin32(val), shown = v.show.includes(key);
        const octs = [0, 1, 2, 3].map((o) => h('div', {}, h('div', { class: 'oct' }, bits.slice(o * 8, o * 8 + 8).split('').map((b, j) => {
          const idx = o * 8 + j;
          return h('span', { class: 'bit ' + (idx < n ? 'net' : 'host') + (clickable ? ' click' : ''), title: clickable ? 'click to flip' : null,
            onclick: clickable ? () => ctx.setParam('ip', intToIp((v.vals.ip ^ (1 << (31 - idx))) >>> 0)) : null }, b);
        })), h('div', { class: 'dec' }, parseInt(bits.slice(o * 8, o * 8 + 8), 2))));
        return h('div', { class: 'bitrow' + (shown ? ' show' : '') + (key === cur ? ' focus' : '') }, h('div', { class: 'name' }, name), octs);
      };
      const i = v.info;
      root.append(row('ip', 'IP address', v.vals.ip, true), row('mask', 'Subnet mask', v.vals.mask), row('net', 'Network (AND)', v.vals.net), row('bc', 'Broadcast', v.vals.bc),
        h('div', { class: 'label' }, h('span', { style: { color: 'var(--accent)' } }, 'blue = network bits'), ' · ', h('span', { style: { color: 'var(--warn)' } }, 'amber = host bits')),
        v.show.includes('bc') ? h('div', { class: 'kv' }, ['Mask', i.mask + ' /' + i.n, 'Network', i.net, 'Broadcast', i.bc, 'Host range', `${i.first} – ${i.last}`, 'Usable hosts', i.hosts, 'Total addresses', i.total, 'Class', i.cls, 'Private (RFC 1918)', i.priv ? 'yes' : 'no'].map((x) => h('span', {}, x))) : null,
        i.subs.length ? h('table', { class: 'grid' }, h('tr', {}, ['#', 'Subnet', 'Host range', 'Broadcast'].map((t) => h('th', {}, t))), i.subs.map((x, j) => h('tr', {}, [j, x.net, x.range, x.bc].map((c) => h('td', {}, c))))) : null);
    },
  });
})();
