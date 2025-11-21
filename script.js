// -----------------------------
// Logic Calculator – script.js
// -----------------------------

// ===== Utilities =====
const $ = (id) => document.getElementById(id);

// จับตัวแปรที่อนุญาต (p q r s)
const VAR_RE = /[pqrs]/g;

// ลำดับความสำคัญของตัวดำเนินการ
const PREC = {
  '~': 5,   // NOT
  '∧': 4,   // AND
  '∨': 3,   // OR
  '→': 2,   // IMPLIES
  '↔': 1    // IFF
};

// เป็นตัวดำเนินการไหม
const isOp = (t) => ['~', '∧', '∨', '→', '↔'].includes(t);

// ===== Expression helpers =====
function normalizeExpr(expr) {
  return expr
    .replace(/\s+/g, '')
    .replace(/<->|<−>|<—>|<\s*-\s*>/g, '↔')
    .replace(/->/g, '→')
    .replace(/\^\^/g, '∧')
    .replace(/\|\|/g, '∨');
}

function extractVariables(expr) {
  const m = (expr.match(VAR_RE) || []);
  return [...new Set(m)].sort();
}

function tokenize(expr) {
  const out = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if ('pqrs'.includes(c)) out.push(c);
    else if ('()'.includes(c)) out.push(c);
    else if (['~', '∧', '∨', '→', '↔'].includes(c)) out.push(c);
  }
  return out;
}

// Shunting-yard: infix -> RPN
function toRPN(tokens) {
  const output = [];
  const ops = [];
  const leftAssoc = (op) => op !== '~';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ('pqrs'.includes(t)) {
      output.push(t);
    } else if (t === '(') {
      ops.push(t);
    } else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        output.push(ops.pop());
      }
      ops.pop();
    } else if (isOp(t)) {
      while (
        ops.length &&
        isOp(ops[ops.length - 1]) &&
        (
          (leftAssoc(t) && PREC[t] <= PREC[ops[ops.length - 1]]) ||
          (!leftAssoc(t) && PREC[t] < PREC[ops[ops.length - 1]]))
      ) {
        output.push(ops.pop());
      }
      ops.push(t);
    }
  }
  while (ops.length) output.push(ops.pop());
  return output;
}

function evalRPN(rpn, env) {
  const st = [];
  for (const t of rpn) {
    if ('pqrs'.includes(t)) {
      st.push(!!env[t]);
    } else if (t === '~') {
      const a = st.pop(); st.push(!a);
    } else if (t === '∧') {
      const b = st.pop(); const a = st.pop(); st.push(a && b);
    } else if (t === '∨') {
      const b = st.pop(); const a = st.pop(); st.push(a || b);
    } else if (t === '→') {
      const b = st.pop(); const a = st.pop(); st.push((!a) || b);
    } else if (t === '↔') {
      const b = st.pop(); const a = st.pop(); st.push(a === b);
    }
  }
  return st[0];
}

// ===== AST Parser (เก็บช่วง index) =====
function buildAstWithSpans(expr) {
  let i = 0;
  const peek = () => expr[i];
  const eat = (ch) => (expr[i] === ch ? (i++, true) : false);
  const expect = (ch) => { if (!eat(ch)) throw new Error(`คาดว่าเป็น '${ch}' ที่ index ${i}`); };
  const node = (s, e, kind, l = null, r = null) => ({ start: s, end: e, kind, left: l, right: r });

  function parseEquiv() {
    let n = parseImplies();
    while (peek() === '↔') { eat('↔'); const r = parseImplies(); n = node(n.start, r.end, '↔', n, r); }
    return n;
  }
  function parseImplies() {
    let n = parseOr();
    while (peek() === '→') { eat('→'); const r = parseOr(); n = node(n.start, r.end, '→', n, r); }
    return n;
  }
  function parseOr() {
    let n = parseAnd();
    while (peek() === '∨') { eat('∨'); const r = parseAnd(); n = node(n.start, r.end, '∨', n, r); }
    return n;
  }
  function parseAnd() {
    let n = parseUnary();
    while (peek() === '∧') { eat('∧'); const r = parseUnary(); n = node(n.start, r.end, '∧', n, r); }
    return n;
  }
  function parseUnary() {
    if (peek() === '~') { const s = i; eat('~'); const r = parseUnary(); return node(s, r.end, '~', r); }
    return parsePrimary();
  }
  function parsePrimary() {
    if (eat('(')) { const s = i - 1; const inside = parseEquiv(); expect(')'); return node(s, i, '()', inside); }
    if ('pqrs'.includes(peek())) { const s = i; i++; return node(s, i, 'var'); }
    throw new Error(`ไม่รู้จัก token ที่ ${i}`);
  }
  const root = parseEquiv();
  if (i !== expr.length) throw new Error('parse ไม่ครบ');
  return root;
}

// เก็บนิพจน์ย่อย (ไม่เอาวงเล็บซ้ำ)
function collectSubExprFromAst(ast, expr) {
  const list = [];
  (function dfs(n) {
    if (!n) return;
    dfs(n.left); dfs(n.right);
    if (n.kind !== 'var' && n.kind !== '()') {
      list.push(expr.slice(n.start, n.end));
    }
  })(ast);
  return list;
}

// ===== UI =====
function addToDisplay(value) {
  const display = $('display');
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;
  display.value = display.value.slice(0, start) + value + display.value.slice(end);
  const pos = start + value.length;
  display.focus(); display.setSelectionRange(pos, pos);
}

function clearDisplay() { $('display').value = ''; $('resultDisplay').textContent = ''; }
function backspace() {
  const d = $('display'); const s = d.selectionStart ?? d.value.length; const e = d.selectionEnd ?? d.value.length;
  if (s === e && s > 0) { d.value = d.value.slice(0, s - 1) + d.value.slice(e); d.setSelectionRange(s - 1, s - 1); }
  else { d.value = d.value.slice(0, s) + d.value.slice(e); d.setSelectionRange(s, s); }
  d.focus();
}
function moveCursorLeft() { const d = $('display'); const s = Math.max(0, (d.selectionStart ?? d.value.length) - 1); d.setSelectionRange(s, s); d.focus(); }
function moveCursorRight() { const d = $('display'); const s = Math.min(d.value.length, (d.selectionStart ?? d.value.length) + 1); d.setSelectionRange(s, s); d.focus(); }
function quickInsert(expr) { const d = $('display'); d.value = expr; $('resultDisplay').textContent = ''; if ($('truthTable').style.display !== 'none') generateTruthTable(); }

function evaluateExpression() {
  const raw = $('display').value, resultDisplay = $('resultDisplay');
  try {
    const expr = normalizeExpr(raw), vars = extractVariables(expr);
    if (!vars.length) return resultDisplay.innerHTML = `<span class="error">ไม่พบประพจน์</span>`;
    const rpn = toRPN(tokenize(expr));
    let tautology = true, rows = 1 << vars.length;
    for (let i = 0; i < rows; i++) {
      const env = {}; for (let j = 0; j < vars.length; j++) env[vars[j]] = !!(i & (1 << (vars.length - 1 - j)));
      if (!evalRPN(rpn, env)) { tautology = false; break; }
    }
    resultDisplay.innerHTML = `<div><strong>สูตร:</strong> ${expr}</div>
      <div><strong>ตัวแปร:</strong> ${vars.join(', ')}</div>
      <div><strong>สถานะ:</strong>
        <span style="color:${tautology ? '#16a34a' : '#e11d48'}">
          ${tautology ? 'เป็นสัจนิรันดร์' : 'ไม่เป็นสัจนิรันดร์'}
        </span></div>`;
    if ($('truthTable').style.display !== 'none') generateTruthTable();
  } catch { resultDisplay.innerHTML = `<span class="error">สูตรไม่ถูกต้อง</span>`; }
}

function toggleTruthTable() {
  const box = $('truthTable'), text = $('toggleText');
  if (box.style.display === 'none') { box.style.display = ''; text.textContent = 'ปิดตารางค่าความจริง'; generateTruthTable(); }
  else { box.style.display = 'none'; text.textContent = 'เปิดตารางค่าความจริง'; }
}

function generateTruthTable() {
  const raw = $('display').value, tableHeader = $('tableHeader'), tableBody = $('tableBody');
  tableHeader.innerHTML = ''; tableBody.innerHTML = '';
  try {
    const expr = normalizeExpr(raw), vars = extractVariables(expr); if (!vars.length) return;
    const ast = buildAstWithSpans(expr), subList = collectSubExprFromAst(ast, expr);
    const seen = new Set(), subCols = [];
    for (const s of subList) if (!seen.has(s) && !/^[pqrs]$/.test(s)) { seen.add(s); subCols.push(s); }
    const headerFrag = document.createDocumentFragment();
    vars.forEach(v => { const th = document.createElement('th'); th.textContent = v; headerFrag.appendChild(th); });
    subCols.forEach(se => { const th = document.createElement('th'); th.textContent = se; headerFrag.appendChild(th); });
    if (!subCols.includes(expr)) { const th = document.createElement('th'); th.textContent = expr; headerFrag.appendChild(th); }
    tableHeader.appendChild(headerFrag);
    const allExprCols = [...subCols]; if (!allExprCols.includes(expr)) allExprCols.push(expr);
    const rpnMap = new Map(); allExprCols.forEach(se => rpnMap.set(se, toRPN(tokenize(normalizeExpr(se)))));
    const rows = 1 << vars.length;
    for (let i = rows - 1; i >= 0; i--) {
      const env = {}, tr = document.createElement('tr');
      vars.forEach((v, j) => { const val = !!(i & (1 << (vars.length - 1 - j))); env[v] = val;
        const td = document.createElement('td'); td.textContent = val ? 'T' : 'F'; td.className = val ? 'true' : 'false'; tr.appendChild(td); });
      allExprCols.forEach(se => { const rv = evalRPN(rpnMap.get(se), env); const td = document.createElement('td'); td.textContent = rv ? 'T' : 'F'; td.className = rv ? 'true' : 'false'; tr.appendChild(td); });
      tableBody.appendChild(tr);
    }
  } catch { const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 99; td.textContent = 'ไม่สามารถสร้างตารางได้'; tr.appendChild(td); tableBody.appendChild(tr); }
}

function downloadCSV() {
  const table = $('truthTableContent'); if (!table) return;
  const rows = [...table.querySelectorAll('tr')];
  const csv = rows.map(row => [...row.children].map(c => `"${c.textContent.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; const expr = normalizeExpr($('display').value) || 'truth-table'; a.download = `${expr}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// expose
window.addToDisplay = addToDisplay;
window.clearDisplay = clearDisplay;
window.backspace = backspace;
window.moveCursorLeft = moveCursorLeft;
window.moveCursorRight = moveCursorRight;
window.evaluateExpression = evaluateExpression;
window.toggleTruthTable = toggleTruthTable;
window.quickInsert = quickInsert;
window.downloadCSV = downloadCSV;

