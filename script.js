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

// ตัดช่องว่าง + normalize ให้เป็นสัญลักษณ์มาตรฐาน
function normalizeExpr(expr) {
  return expr
    .replace(/\s+/g, '')
    .replace(/<->|<−>|<—>|<\s*-\s*>/g, '↔')
    .replace(/->/g, '→')
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

// ===== NEW: สร้างรายชื่อ "นิพจน์ย่อย" จาก RPN ตามกติกาวงเล็บ =====
function extractSubExpressions(rpn) {
  const st = [];
  const subs = []; // เก็บตามลำดับที่สร้าง

  for (const t of rpn) {
    if ('pqrs'.includes(t)) {
      st.push(t);
    } else if (t === '~') {
      const a = st.pop();
      const expr = `~${a}`;
      st.push(expr);
      subs.push(expr);
    } else if (['∧','∨','→','↔'].includes(t)) {
      const b = st.pop();
      const a = st.pop();
      let expr;

      if (t === '∧' || t === '∨') {
        // ตัวดำเนินการเดี่ยว (binary) แบบพื้นฐาน ไม่ใส่วงเล็บ
        expr = `${a}${t}${b}`;
      } else {
        // →, ↔ หรือโครงสร้างซ้อน: ใส่วงเล็บทั้งก้อน
        expr = `(${a}${t}${b})`;
      }

      st.push(expr);
      subs.push(expr);
    }
  }

  return subs;
}

// ===== UI actions =====

// แทรกข้อความลงช่อง input ตามตำแหน่งเคอร์เซอร์
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

// ใส่สูตรตัวอย่าง
function quickInsert(expr) {
  const d = $('display');
  d.value = expr;
  $('resultDisplay').textContent = '';
  if ($('truthTable').style.display !== 'none') {
    generateTruthTable();
  }
}

// กด "=" ประเมิน & แสดงสรุป (และอัปเดตตารางถ้าเปิดอยู่)
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

// เปิด/ปิดตาราง
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

// ===== สร้างตารางค่าความจริง (ตัวแปร + นิพจน์ย่อย + นิพจน์หลัก) =====
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

    // เตรียม RPN ของ "นิพจน์หลัก"
    const mainRPN = toRPN(tokenize(expr));

    // ดึงรายชื่อ "นิพจน์ย่อย" ตามกติกาวงเล็บ
    const subs = extractSubExpressions(mainRPN); // ลำดับ: จากย่อยไปใหญ่สุด (ตัวสุดท้ายคือนิพจน์หลัก)

    // เอาเฉพาะคอลัมน์ย่อยที่ "ไม่ซ้ำ" และ "ไม่ใช่ตัวแปรล้วน"
    const seen = new Set();
    const subCols = [];
    for (const s of subs) {
      if (!seen.has(s) && !/^[pqrs]$/.test(s)) {
        seen.add(s);
        subCols.push(s);
      }
    }

    // สร้าง header: ตัวแปร -> นิพจน์ย่อย -> (ถ้ายังไม่มี) นิพจน์หลัก
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
    // กันพลาด: ถ้านิพจน์หลักยังไม่อยู่ท้าย ให้ใส่เพิ่ม (ปกติจะอยู่ตัวท้ายของ subs แล้ว)
    if (subCols[subCols.length - 1] !== subs[subs.length - 1]) {
      const th = document.createElement('th');
      th.textContent = subs[subs.length - 1] || expr;
      headerFrag.appendChild(th);
    }
    tableHeader.appendChild(headerFrag);

    // เตรียม RPN สำหรับทุกคอลัมน์ย่อย (รวมคอลัมน์สุดท้ายคือหลัก)
    const allExprCols = [...subCols];
    const mainExprPretty = subs[subs.length - 1] || expr;
    if (allExprCols[allExprCols.length - 1] !== mainExprPretty) {
      allExprCols.push(mainExprPretty);
    }
    const rpnMap = new Map();
    allExprCols.forEach(se => {
      rpnMap.set(se, toRPN(tokenize(normalizeExpr(se))));
    });

    // สร้างบรรทัดข้อมูล (เรียงจาก T..F เหมือนปกติ)
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

      // ค่านิพจน์ย่อยทั้งหมด (รวมคอลัมน์นิพจน์หลัก)
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

// ดาวน์โหลด CSV จากตารางปัจจุบัน
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

// ===== expose to window (สำหรับ inline onclick) =====
window.addToDisplay = addToDisplay;
window.clearDisplay = clearDisplay;
window.backspace = backspace;
window.moveCursorLeft = moveCursorLeft;
window.moveCursorRight = moveCursorRight;
window.evaluateExpression = evaluateExpression;
window.toggleTruthTable = toggleTruthTable;
window.quickInsert = quickInsert;
window.downloadCSV = downloadCSV;
