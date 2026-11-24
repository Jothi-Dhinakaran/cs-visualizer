/* core.js — visualizer registry + tiny DOM helpers shared by every module.
 *
 * A visualizer is registered with CSViz.register({...}):
 *   id, group, title, blurb
 *   inputs: [{key,label,type:'text'|'number'|'range'|'select'|'checkbox',value,min,max,step,options}]
 *   pseudo: string[] | (params) => string[]
 *   viva:   [{q, a}]                      (offline viva questions)
 *   build(params) -> { steps, meta }      (pure; throws Error on bad input)
 *       step = { line, msg, why, state, view }
 *         line  : pseudocode line index (or array of indices) to highlight
 *         msg   : what happened in this step
 *         why   : why it happened (used by the offline tutor)
 *         state : flat object shown in the State Inspector and sent to the AI
 *         view  : anything render() needs
 *   render(container, step, ctx)          (ctx = {params, meta, index, steps, setParam})
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const registry = [];

  function append(el, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach((c) => append(el, c)); return; }
    el.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }

  function make(ns, tag, attrs, children) {
    const el = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    append(el, children);
    return el;
  }

  const h = (tag, attrs, ...children) => make(null, tag, attrs, children);
  const s = (tag, attrs, ...children) => make(SVG_NS, tag, attrs, children);

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function parseNumList(str, label) {
    const parts = String(str).split(/[\s,;]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (!nums.length || nums.some((n) => !Number.isFinite(n))) {
      throw new Error((label || 'Input') + ' must be a list of numbers, e.g. 3, 1, 4');
    }
    return nums;
  }

  function fmt(v) {
    if (v === null || v === undefined) return '—';
    if (v === Infinity) return '∞';
    if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
    if (typeof v === 'object') {
      return '{' + Object.entries(v).map(([k, x]) => k + ': ' + fmt(x)).join(', ') + '}';
    }
    return String(v);
  }

  const PALETTE = ['#4f9dff', '#f0a43c', '#4cc38a', '#c084fc', '#f26d85', '#2dd4bf', '#e8d44d', '#fb923c'];

  window.CSViz = {
    register: (viz) => registry.push(viz),
    list: () => registry,
    h, s, clamp, parseNumList, fmt, PALETTE,
  };
})();
