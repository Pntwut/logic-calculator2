// -----------------------------
// Logic Calculator – script.js
// -----------------------------

// ===== Utilities =====
const $ = (id) => document.getElementById(id);

// จับตัวแปรที่อนุญาต (p q r s)
const VAR_RE = /[pqrs]/g;

// ลำดับความสำคัญของตัวดำเนินการ (ยิ่งมากยิ่งมาก่อน)
const PREC = {
  '~': 5,   // NOT (unary)
  '∧': 4,   // AND
  '∨': 3,   // OR
  '→': 2,   // IMPLIES
  '↔': 1    // IFF
};

// เป็นตัวดำเนินการไหม
const isOp = (t) => ['~', '∧', '∨', '→', '↔'].includes(t);

// ===== Expression helpers =====

// ตัดช่องว่าง + normalize ให้เป็นสัญลักษณ์มาตรฐาน (ไม่แตะต้องวงเล็บ)
function normalizeExpr(expr) {
  return expr
    .replace(/\s+/g, '')
    // IFF
    .replace(/<->|<−>|<—>|<\s*-\s*>/g, '↔')
    // IMPLIES
    .replace(/->/g, '→')
    // AND / OR (แบบคีย์บอร์ด)
    .replace(/\^\^/g, '∧')
    .replace(/\|\|/g, '∨');
}

// ดึงตัวแปรจากนิพจน์
function extractVariables(expr) {
  const m = (expr.match(VAR_RE) || []);
  return [...new Set(m)].sort(); // ไม่ซ้ำ + เรียง
}

// tokenize นิพจน์เป็น array
function tokenize(expr) {
  const out = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if ('pqrs'.includes(c)) out.push(c);
    else if ('()'.includes(c)) out.push(c);
    else if (['~', '∧', '∨', '→', '↔'].includes(c)) out.push(c);
    else {
      // ข้ามตัวอักษรที่ไม่รู้จัก
    }
  }
  return out;
}

// Shunting-yard: infix -> RPN (postfix)
function toRPN(tokens) {
  const output = [];
  const ops = [];
  const leftAssoc = (op) => op !== '~'; // ~ เป็น unary (prefix) – ขวาไปซ้าย

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
      if (!ops.length) throw new Error('วงเล็บไม่สมดุล');
      ops.pop(); // ทิ้ง '('
    } else if (isOp(t)) {
      while (
        ops.length &&
        isOp(ops[ops.length - 1]) &&
        (
          (leftAssoc(t) && PREC[t] <= PREC[ops[ops.length - 1]]) ||
          (!leftAssoc(t) && PREC[t] < PREC[ops[ops.length - 1]])
        )
      ) {
        output.push(ops.pop());
      }
      ops.push(t);
    } else {
      throw new Error('ตัวอักษรไม่ถูกต้องในสูตร');
    }
  }

  while (ops.length) {
    const op = ops.pop();
    if (op === '(' || op === ')') throw new Error('วงเล็บไม่สมดุล');
    output.push(op);
  }

  return output;
}

// ประเมิน RPN ด้วย mapping ของค่าตัวแปร
function evalRPN(rpn, env) {
  const st = [];
  for (const t of rpn) {
    if ('pqrs'.includes(t)) {
      st.push(!!env[t]);
    } else if (t === '~') {
      const a = st.pop();
      st.push(!a);
    } else if (t === '∧') {
      const b = st.pop(); const a = st.pop();
      st.push(a && b);
    } else if (t === '∨') {
      const b = st.pop(); const a = st.pop();
      st.push(a || b);
    } else if (t === '→') {
      const b = st.pop(); const a = st.pop();
      st.push((!a) || b);
    } else if (t === '↔') {
      const b = st.pop(); const a = st.pop();
      st.push(a === b);
    } else {
      throw new Error('RPN token ไม่รู้จัก: ' + t);
    }
  }
  if (st.length !== 1) throw new Error('สูตรไม่ถูกต้อง');
  return st[0];
}

// ===== NEW (สำคัญ): Parser ที่ “รักษาวงเล็บตามที่ผู้ใช้พิมพ์” =====
// ใช้ recursive-descent สร้าง AST โดยเก็บช่วง index start..end (exclusive)
// แล้วใช้ slice กับนิพจน์ที่ normalize แล้วเพื่อให้หัวตารางตรงตามที่พิมพ์จริง
function buildAstWithSpans(expr) {
  let i = 0;

  const peek = () => expr[i];
  const eat = (ch) => {
    if (expr[i] === ch) { i++; return true; }
    return false;
  };
  const expect = (ch) => {
    if (!eat(ch)) throw new Error(`คาดว่าเป็น '${ch}' ที่ index ${i}`);
  };

  function node(start, end, kind, left = null, right = null) {
    return { start, end, kind, left, right };
  }

  // precedence: ↔ < → < ∨ < ∧ < unary ~
  function parseEquiv() {
    let n = parseImplies();
    while (peek() === '↔') {
      const opStart = i; eat('↔');
      const r = parseImplies();
      n = node(n.start, r.end, '↔', n, r);
    }
    return n;
  }

  function parseImplies() {
    let n = parseOr();
    while (peek() === '→') {
      const opStart = i; eat('→');
      const r = parseOr();
      n = node(n.start, r.end, '→', n, r);
    }
    return n;
  }

  function parseOr() {
    let n = parseAnd();
    while (peek() === '∨') {
      const opStart = i; eat('∨');
      const r = parseAnd();
      n = node(n.start, r.end, '∨', n, r);
    }
    return n;
  }

  function parseAnd() {
    let n = parseUnary();
    while (peek() === '∧') {
      const opStart = i; eat('∧');
      const r = parseUnary();
      n = node(n.start, r.end, '∧', n, r);
    }
    return n;
  }

  function parseUnary() {
    if (peek() === '~') {
      const s = i; eat('~');
      const r = parseUnary();
      return node(s, r.end, '~', r, null);
    }
    return parsePrimary();
  }

  function parsePrimary() {
    if (eat('(')) {
      const s = i - 1; // รวม '('
      const inside = parseEquiv();
      expect(')');
      const e = i;     // รวม ')'
      // โหนดครอบวงเล็บทั้งก้อน
      return node(s, e, '()', inside, null);
    }
    const ch = peek();
    if ('pqrs'.includes(ch)) {
      const s = i; i++;
      return node(s, i, 'var', null, null);
    }
    throw new Error(`ตัวอักษรไม่ถูกต้องที่ index ${i}`);
  }

  const root = parseEquiv();
  if (i !== expr.length) throw new Error('วิเคราะห์นิพจน์ไม่ครบทั้งสตริง');
  return root;
}

// เก็บ “นิพจน์ย่อย” ตามที่พิมพ์จริง จาก AST (post-order)
function collectSubExprFromAst(ast, expr) {
  const list = [];
  (function dfs(n) {
    if (!n) return;
    dfs(n.left);
    dfs(n.right);
    if (n.kind !== 'var') {
      list.push(expr.slice(n.start, n.end)); // ตัดตามช่วงจริง
    }
  })(ast);
  return list;
}

// ===== UI actions =====
function addToDisplay(value) {
  const display = $('display');
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;
  const text = display.value;
  display.value = text.slice(0, start) + value + text.slice(end);
  const pos = start + value.length;
  display.focus();
  display.setSelectionRange(pos, pos);
}

function clearDisplay() {
  $('display').value = '';
  $('resultDisplay').textContent = '';
}

function backspace() {
  const display = $('display');
  const start = display.selectionStart ?? display.value.length;
  const end = display.selectionEnd ?? display.value.length;
  if (start === end && start > 0) {
    display.value = display.value.slice(0, start - 1) + display.value.slice(end);
    display.setSelectionRange(start - 1, start - 1);
  } else {
    display.value = display.value.slice(0, start) + display.value.slice(end);
    display.setSelectionRange(start, start);
  }
  display.focus();
}

function moveCursorLeft() {
  const d = $('display');
  const s = Math.max(0, (d.selectionStart ?? d.value.length) - 1);
  d.setSelectionRange(s, s); d.focus();
}

function moveCursorRight() {
  const d = $('display');
  const s = Math.min(d.value.length, (d.selectionStart ?? d.value.length) + 1);
  d.setSelectionRange(s, s); d.focus();
}

function quickInsert(expr) {
  const d = $('display');
  d.value = expr;
  $('resultDisplay').textContent = '';
  if ($('truthTable').style.display !== 'none') {
    generateTruthTable();
  }
}

function evaluateExpression() {
  const raw = $('display').value;
  const resultDisplay = $('resultDisplay');

  try {
    const expr = normalizeExpr(raw);
    const vars = extractVariables(expr);
    if (vars.length === 0) {
      resultDisplay.innerHTML = `<span class="error">ไม่พบตัวแปรในสูตร</span>`;
      return;
    }

    const rpn = toRPN(tokenize(expr));

    // ตรวจว่าเป็นสัจนิรันดร์หรือไม่
    let tautology = true;
    const rows = 1 << vars.length;
    for (let i = 0; i < rows; i++) {
      const env = {};
      for (let j = 0; j < vars.length; j++) {
        env[vars[j]] = !!(i & (1 << (vars.length - 1 - j)));
      }
      const v = evalRPN(rpn, env);
      if (!v) { tautology = false; break; }
    }

    resultDisplay.innerHTML = `
      <div><strong>สูตร:</strong> ${expr}</div>
      <div><strong>ตัวแปร:</strong> ${vars.join(', ')}</div>
      <div><strong>สถานะ:</strong>
        <span style="color:${tautology ? '#16a34a' : '#e11d48'}">
          ${tautology ? 'เป็นสัจนิรันดร์' : 'ไม่เป็นสัจนิรันดร์'}
        </span>
      </div>
    `;

    if ($('truthTable').style.display !== 'none') {
      generateTruthTable();
    }
  } catch (e) {
    resultDisplay.innerHTML = `<span class="error">สูตรไม่ถูกต้อง</span>`;
    console.error(e);
  }
}

function toggleTruthTable() {
  const box = $('truthTable');
  const text = $('toggleText');
  if (box.style.display === 'none') {
    box.style.display = '';
    text.textContent = 'ปิดตารางค่าความจริง';
    generateTruthTable();
  } else {
    box.style.display = 'none';
    text.textContent = 'เปิดตารางค่าความจริง';
  }
}

// ===== สร้างตารางค่าความจริง (หัวคอลัมน์ตาม “ที่พิมพ์จริง”) =====
function generateTruthTable() {
  const raw = $('display').value;
  const tableHeader = $('tableHeader');
  const tableBody = $('tableBody');

  tableHeader.innerHTML = '';
  tableBody.innerHTML = '';

  try {
    const expr = normalizeExpr(raw);
    const vars = extractVariables(expr);
    if (vars.length === 0) return;

    // 1) สร้าง AST ที่คงวงเล็บตามผู้ใช้
    const ast = buildAstWithSpans(expr);

    // 2) ดึง “นิพจน์ย่อย” ตามที่พิมพ์จริง (post-order)
    const subList = collectSubExprFromAst(ast, expr); // ตัวท้ายคือทั้งนิพจน์ (รวมวงเล็บถ้ามี)

    // 3) กรองไม่ให้ซ้ำ + ไม่เอาคอลัมน์ที่เป็นตัวแปรเดี่ยว
    const seen = new Set();
    const subCols = [];
    for (const s of subList) {
      if (!seen.has(s) && !/^[pqrs]$/.test(s)) {
        seen.add(s);
        subCols.push(s);
      }
    }

    // 4) header: ตัวแปร -> นิพจน์ย่อย (ตามลำดับ parse) -> (กันพลาด) นิพจน์หลัก
    const headerFrag = document.createDocumentFragment();
    vars.forEach(v => {
      const th = document.createElement('th');
      th.textContent = v;
      headerFrag.appendChild(th);
    });
    subCols.forEach(se => {
      const th = document.createElement('th');
      th.textContent = se;
      headerFrag.appendChild(th);
    });
    const mainPretty = subCols.length ? subCols[subCols.length - 1] : expr;
    if (mainPretty !== expr) {
      // กรณีสุดท้ายของ subCols ไม่ตรงกับนิพจน์เต็ม ให้ต่อท้ายเป็นนิพจน์เต็ม
      const th = document.createElement('th');
      th.textContent = expr;
      headerFrag.appendChild(th);
    }
    tableHeader.appendChild(headerFrag);

    // 5) เตรียม RPN ของทุกคอลัมน์นิพจน์ (ย่อยทั้งหมด + นิพจน์เต็ม)
    const allExprCols = [...subCols];
    if (allExprCols[allExprCols.length - 1] !== expr) allExprCols.push(expr);

    const rpnMap = new Map();
    allExprCols.forEach(se => {
      rpnMap.set(se, toRPN(tokenize(normalizeExpr(se))));
    });

    // 6) วาดตารางข้อมูล (เรียงจาก T..F)
    const rows = 1 << vars.length;
    for (let i = rows - 1; i >= 0; i--) {
      const env = {};
      const tr = document.createElement('tr');

      // ค่าตัวแปร
      vars.forEach((v, j) => {
        const val = !!(i & (1 << (vars.length - 1 - j)));
        env[v] = val;
        const td = document.createElement('td');
        td.textContent = val ? 'T' : 'F';
        td.className = val ? 'true' : 'false';
        tr.appendChild(td);
      });

      // ค่านิพจน์ย่อย + นิพจน์หลัก
      allExprCols.forEach(se => {
        const rv = evalRPN(rpnMap.get(se), env);
        const td = document.createElement('td');
        td.textContent = rv ? 'T' : 'F';
        td.className = rv ? 'true' : 'false';
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    }
  } catch (e) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 99;
    td.textContent = 'ไม่สามารถสร้างตารางได้: สูตรไม่ถูกต้อง';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    console.error(e);
  }
}

// ดาวน์โหลด CSV
function downloadCSV() {
  const table = document.getElementById('truthTableContent');
  if (!table) return;

  const rows = [...table.querySelectorAll('tr')];
  const csv = rows.map(row => {
    const cells = [...row.children].map(c => '"' + c.textContent.replace(/"/g, '""') + '"');
    return cells.join(',');
  }).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const expr = normalizeExpr($('display').value) || 'truth-table';
  a.download = `${expr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== expose =====
window.addToDisplay = addToDisplay;
window.clearDisplay = clearDisplay;
window.backspace = backspace;
window.moveCursorLeft = moveCursorLeft;
window.moveCursorRight = moveCursorRight;
window.evaluateExpression = evaluateExpression;
window.toggleTruthTable = toggleTruthTable;
window.quickInsert = quickInsert;
window.downloadCSV = downloadCSV;
