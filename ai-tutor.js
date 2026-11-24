/* ai-tutor.js — AI Tutor panel: Gemini API, local Ollama, or built-in rule-based fallback.
 * Reads the live visualization through window.CSApp.getContext(). */
(function () {
  'use strict';
  const { fmt } = window.CSViz;
  const $ = (id) => document.getElementById(id);
  const KEY = 'csviz.settings.v1';
  const DEFAULTS = { provider: 'offline', apiKey: '', gModel: 'gemini-3.5-flash-lite', gCustom: '', oUrl: 'http://localhost:11434/api/generate', oModel: 'gemma4', oCustom: '' };
  let cfg = { ...DEFAULTS };
  try { cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* storage unavailable */ }

  const SYSTEM = 'You are a patient computer-science tutor inside a step-by-step algorithm visualizer. Use simple words, be accurate, and keep answers under 150 words. Use the supplied state exactly; never invent values.';

  /* ── model calls ── */
  async function callGemini(prompt) {
    const model = cfg.gCustom.trim() || cfg.gModel;
    if (!cfg.apiKey) throw new Error('No Gemini API key set.');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 1024 } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Gemini HTTP ' + res.status);
    const text = ((data.candidates || [])[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    if (!text) throw new Error('Gemini returned an empty reply.');
    return text;
  }

  async function callOllama(prompt) {
    const res = await fetch(cfg.oUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.oCustom.trim() || cfg.oModel, system: SYSTEM, prompt, stream: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Ollama HTTP ' + res.status);
    return String(data.response || '').trim();
  }

  /* Returns {text, via}. Falls back to `offline()` on any failure. */
  async function ask(prompt, offline) {
    if (cfg.provider !== 'offline') {
      try { return { text: cfg.provider === 'gemini' ? await callGemini(prompt) : await callOllama(prompt), via: cfg.provider }; }
      catch (e) { return { text: offline(), via: 'offline', error: e.message }; }
    }
    return { text: offline(), via: 'offline' };
  }

  /* ── chat rendering (safe: escape first, then a tiny markdown subset) ── */
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function md(t) {
    const lines = esc(t).split('\n'); let out = '', list = false;
    for (const ln of lines) {
      const li = ln.match(/^\s*[-*•]\s+(.*)/);
      if (li && !list) { out += '<ul>'; list = true; }
      if (!li && list) { out += '</ul>'; list = false; }
      const inline = (li ? li[1] : ln).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
      out += li ? `<li>${inline}</li>` : inline ? `<p>${inline}</p>` : '';
    }
    return out + (list ? '</ul>' : '');
  }
  function say(text, cls) {
    const div = document.createElement('div');
    div.className = 'msg ' + (cls || 'ai');
    div.innerHTML = cls === 'user' ? esc(text) : md(text);
    const chat = $('chat'); chat.prepend(div); return div;
  }
  function note(res) { if (res.error) say(`${cfg.provider} failed (${res.error}). Showing the rule-based answer instead.`, 'sys'); }

  /* ── context & prompts ── */
  const ctxJson = (c) => JSON.stringify({ topic: c.title, inputs: c.params, step: `${c.index} of ${c.total}`, pseudocodeLine: c.lineText, previousStep: c.prevMsg, thisStep: c.msg, state: c.state }, null, 1);
  const needCtx = () => { const c = window.CSApp.getContext(); if (!c) say('Pick a topic and build a visualization first.', 'sys'); return c; };

  const STOP = new Set('the is to of and in it then with for on at by as be an that this will are from its into so we do does'.split(' '));
  const tokens = (t) => String(t).toLowerCase().split(/[^a-z0-9.]+/).filter((w) => w && !STOP.has(w));
  function grade(answer, truth) {
    const want = [...new Set(tokens(truth))], got = new Set(tokens(answer));
    if (!want.length) return { score: 0, verdict: 'unknown' };
    const score = want.filter((w) => got.has(w)).length / want.length;
    return { score, verdict: score >= 0.5 ? 'correct' : score >= 0.25 ? 'partial' : 'wrong' };
  }
  const verdictText = { correct: '✅ **Correct!**', partial: '🟡 **Partly right.**', wrong: '❌ **Not quite.**', unknown: 'Could not grade.' };

  /* ── Explain current step ── */
  async function explain() {
    const c = needCtx(); if (!c) return;
    const off = () => `**Step ${c.index}/${c.total}** — ${c.msg}\n\n**Why it happened:** ${c.why || 'This follows from the previous step.'}\n\n**Pseudocode line:** \`${c.lineText || '—'}\`\n\n**State now:**\n` +
      Object.entries(c.state).map(([k, v]) => `- ${k}: ${fmt(v)}`).join('\n');
    const prompt = `Explain, in simple terms, why this state transition just happened. Mention the key idea of the algorithm.\n\n${ctxJson(c)}`;
    const wait = say('Thinking…', 'sys'); const res = await ask(prompt, off); wait.remove(); note(res); say(res.text);
  }

  /* ── Quizzes (predict-next-step and viva) ── */
  let quiz = null;
  function openQuiz(q) {
    quiz = q; $('quiz-q').innerHTML = md(q.question); $('quiz-answer').value = ''; $('quiz-box').hidden = false; $('quiz-answer').focus();
  }
  function closeQuiz() { quiz = null; $('quiz-box').hidden = true; }

  async function predict() {
    const c = needCtx(); if (!c) return;
    if (!c.next) { say('This is the last step — nothing left to predict. Step back and try again.', 'sys'); return; }
    window.CSApp.pause();
    const off = () => 'What will happen in the **next** step? Look at the current state and the highlighted pseudocode line, then describe the next action (include the key values or names).';
    const prompt = `Ask ONE short question that makes the student predict what happens in the NEXT step of this visualization. Do NOT reveal the answer.\nFor your private reference only, the true next step is: ${c.next.msg}\n\nCurrent visualization:\n${ctxJson(c)}`;
    const wait = say('Preparing a question…', 'sys'); const res = await ask(prompt, off); wait.remove(); note(res);
    openQuiz({ type: 'predict', question: res.text, truth: c.next.msg, why: c.next.why, index: c.index, ctx: c });
  }

  async function viva() {
    const c = needCtx(); if (!c) return;
    window.CSApp.pause();
    const bank = c.viva || [];
    const pick = bank[Math.floor(Math.random() * bank.length)] || { q: `In your own words, what problem does "${c.title}" solve and what is its complexity?`, a: 'time complexity space complexity' };
    if (cfg.provider === 'offline') { openQuiz({ type: 'viva', question: pick.q, truth: pick.a, ctx: c }); return; }
    const wait = say('Preparing a viva question…', 'sys');
    const res = await ask(`Ask ONE oral-exam (viva) question about "${c.title}" suited to this moment of the visualization. Do not give the answer.\n\n${ctxJson(c)}`, () => pick.q);
    wait.remove(); note(res); openQuiz({ type: 'viva', question: res.text, truth: pick.a, ctx: c });
  }

  async function submitQuiz(reveal) {
    if (!quiz) return;
    const q = quiz, answer = $('quiz-answer').value.trim();
    if (!reveal && !answer) { $('quiz-answer').focus(); return; }
    if (!reveal) say(answer, 'user');
    closeQuiz();
    const g = reveal ? null : grade(answer, q.truth);
    const off = () => reveal ? `**Answer:** ${q.truth}${q.why ? `\n\n**Why:** ${q.why}` : ''}`
      : `${verdictText[g.verdict]} (keyword match ${Math.round(g.score * 100)}%)\n\n**${q.type === 'predict' ? 'What actually happens next' : 'Model answer'}:** ${q.truth}${q.why ? `\n\n**Why:** ${q.why}` : ''}\n\n${q.type === 'predict' ? 'Press **Step ▶** to watch it happen.' : ''}`;
    if (reveal) { say(off()); return; }
    const prompt = `You are grading a student's answer. Be encouraging and brief.\nQuestion: ${q.question}\nStudent answer: ${answer}\n${q.type === 'predict' ? 'Authoritative true next step' : 'Reference answer'}: ${q.truth}\n${q.why ? 'Reason: ' + q.why + '\n' : ''}Start with Correct, Partly correct, or Incorrect, then explain in 2-3 sentences.\n\nVisualization context:\n${ctxJson(q.ctx)}`;
    const wait = say('Grading…', 'sys'); const res = await ask(prompt, off); wait.remove(); note(res);
    say(res.text, res.via === 'offline' ? (g.verdict === 'correct' ? 'good' : g.verdict === 'wrong' ? 'bad' : 'ai') : 'ai');
  }

  async function freeAsk(text) {
    const c = needCtx(); if (!c) return;
    say(text, 'user');
    const off = () => `I can only answer from the current step when no LLM is connected.\n\n**Step ${c.index}/${c.total}:** ${c.msg}\n\n**Why:** ${c.why}\n\nAdd a Gemini key or enable Ollama in ⚙ AI Settings for open-ended questions.`;
    const wait = say('Thinking…', 'sys'); const res = await ask(`Student question: ${text}\n\nCurrent visualization:\n${ctxJson(c)}`, off); wait.remove(); note(res); say(res.text);
  }

  /* ── settings modal ── */
  function badge() { $('ai-mode').textContent = cfg.provider === 'gemini' ? 'Gemini · ' + (cfg.gCustom.trim() || cfg.gModel) : cfg.provider === 'ollama' ? 'Ollama · ' + (cfg.oCustom.trim() || cfg.oModel) : 'offline rules'; }
  function syncFields() {
    $('fs-gemini').hidden = $('set-provider').value !== 'gemini'; $('fs-ollama').hidden = $('set-provider').value !== 'ollama';
  }
  function init() {
    $('set-provider').value = cfg.provider; $('set-key').value = cfg.apiKey; $('set-gmodel').value = cfg.gModel; $('set-gcustom').value = cfg.gCustom;
    $('set-ourl').value = cfg.oUrl; $('set-omodel').value = cfg.oModel; $('set-ocustom').value = cfg.oCustom; syncFields(); badge();
    $('set-provider').addEventListener('change', syncFields);
    $('btn-settings').addEventListener('click', () => { syncFields(); $('settings').showModal(); });
    $('set-save').addEventListener('click', () => {
      cfg = { provider: $('set-provider').value, apiKey: $('set-key').value.trim(), gModel: $('set-gmodel').value, gCustom: $('set-gcustom').value, oUrl: $('set-ourl').value.trim() || DEFAULTS.oUrl, oModel: $('set-omodel').value, oCustom: $('set-ocustom').value };
      try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { say('Could not save settings (storage blocked).', 'sys'); }
      badge();
    });
    $('btn-explain').addEventListener('click', explain);
    $('btn-predict').addEventListener('click', predict);
    $('btn-viva').addEventListener('click', viva);
    $('quiz-submit').addEventListener('click', () => submitQuiz(false));
    $('quiz-reveal').addEventListener('click', () => submitQuiz(true));
    $('ask-form').addEventListener('submit', (e) => { e.preventDefault(); const t = $('ask-input').value.trim(); if (t) { $('ask-input').value = ''; freeAsk(t); } });
    say('Hi! Use **Explain Current Step** after stepping, or **Predict Next Step Quiz** to test yourself. Works with no key — add Gemini or Ollama in ⚙ AI Settings for richer answers.', 'sys');
  }

  window.AITutor = { init };
})();
