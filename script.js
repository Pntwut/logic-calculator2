// -----------------------------
// Logic Calculator – script.js
// -----------------------------

const $ = (id) => document.getElementById(id);

const VAR_RE = /[pqrs]/g;

const PREC = {
  '~': 5,
  '∧': 4,
  '∨': 3,
  '→': 2,
  '↔': 1
};

const isOp = (t) => ['~', '∧', '∨', '→', '↔'].includes(t);

// =================== Normalize & Tokenize ===================
function normalizeExpr(expr) {
  return expr
    .replace(/\s+/g, '')
    .replace(/<->/g, '↔')
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
    else if (['~','∧','∨','→','↔'].includes(c)) out.push(c);
  }
  return out;
}

// =================== Parser (Shunting Yard) ===================
function toRPN(tokens) {
  const output = [];
  const ops = [];
  const leftAssoc = (op) => op !== '~';

  for (let t of tokens) {
    if ('pqrs'.includes(t)) {
      output.push(t);
    } else if (t === '(') {
      ops.push(t);
    } else if (t === ')') {
      while (ops.length && ops[ops.length-1] !== '(') {
        output.push(ops.pop());
      }
      ops.pop();
    } else if (isOp(t)) {
      while (
        ops.length &&
        isOp(ops[ops.length-1]) &&
        (
          (leftAssoc(t) && PREC[t] <= PREC[ops[ops.length-1]]) ||
          (!leftAssoc(t) && PREC[t] < PREC[ops[ops.length-1]])
        )
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
      const a = st.pop();
      st.push(!a);
    } else if (t === '∧') {
      const b = st.pop(), a = st.pop();
      st.push(a && b);
    } else if (t === '∨') {
      const b = st.pop(), a = st.pop();
      st.push(a || b);
    } else if (t === '→') {
      const b = st.pop(), a = st.pop();
      st.push((!a) || b);
    } else if (t === '↔') {
      const b = st.pop(), a = st.pop();
      st.push(a === b);
    }
  }
  return st[0];
}

// =================== Collect Sub-expressions ===================
function collectSubExpr(rpn) {
  const stack = [];
  const subs = [];

  for (const t of rpn) {
    if ('pqrs'.includes(t)) {
      stack.push(t);
    } else if (t === '~') {
      const a = stack.pop();
      const expr = `~${a}`;
      stack.push(expr);
      subs.push(expr);
    } else if (['∧','∨','→','↔'].includes(t)) {
      const b = stack.pop();
      const a = stack.pop();
      // ถ้า operator มีตัวเดียว ไม่ต้องใส่วงเล็บ
      let expr;
      if (!a.includes('→') && !a.includes('↔') && !a.includes('∨') && !a.includes('∧') && !a.startsWith('~') &&
          !b.includes('→') && !b.includes('↔') && !b.includes('∨') && !b.includes('∧') && !b.startsWith('~')) {
        expr = `${a}${t}${b}`;
      } else {
        expr = `(${a}${t}${b})`;
      }
      stack.push(expr);
      subs.push(expr);
    }
  }
  return subs;
}

// =================== UI Functions ===================
function addToDisplay(value) {
  const d = $('display');
  const start = d.selectionStart ?? d.value.length;
  const end = d.selectionEnd ?? d.value.length;
  d.value = d.value.slice(0, start) + value + d.value.slice(end);
  const pos = start + value.length;
  d.focus();
  d.setSelectionRange(pos, pos);
}

function clearDisplay() {
  $('display').value = '';
  $('resultDisplay').textContent = '';
}

function backspace() {
  const d = $('display');
  const start = d.selectionStart ?? d.value.length;
  const end = d.selectionEnd ?? d.value.length;
  if (start === end && start > 0) {
    d.value = d.value.slice(0, start-1) + d.value.slice(end);
    d.setSelectionRange(start-1, start-1);
  } else {
    d.value = d.value.slice(0, start) + d.value.slice(end);
    d.setSelectionRange(start, start);
  }
  d.focus();
}

function moveCursorLeft() {
  const d = $('display');
  const s = Math.max(0, (d.selectionStart ?? d.value.length)-1);
  d.setSelectionRange(s, s); d.focus();
}

function moveCursorRight() {
  const d = $('display');
  const s = Math.min(d.value.length, (d.selectionStart ?? d.value.length)+1);
  d.setSelectionRange(s, s); d.focus();
}

function quickInsert(expr) {
  $('display').value = expr;
  $('resultDisplay').textContent = '';
  if ($('truthTable').style.display !== 'none') generateTruthTable();
}

function evaluateExpression() {
  const raw = $('display').value;
  const resultDisplay = $('resultDisplay');

  try {
    const expr = normalizeExpr(raw);
    const vars = extractVariables(expr);
    const rpn = toRPN(tokenize(expr));

    // ตรวจสัจนิรันดร์
    let tautology = true;
    const rows = 1 << vars.length;
    for (let i=0;i<rows;i++){
      const env={};
      for (let j=0;j<vars.length;j++){
        env[vars[j]] = !!(i & (1<<(vars.length-1-j)));
      }
      if (!evalRPN(rpn, env)) { tautology=false; break; }
    }

    resultDisplay.innerHTML = `
      <div><strong>สูตร:</strong> ${expr}</div>
      <div><strong>ตัวแปร:</strong> ${vars.join(', ')}</div>
      <div><strong>สถานะ:</strong>
        <span style="color:${tautology?'#16a34a':'#e11d48'}">
          ${tautology?'เป็นสัจนิรันดร์':'ไม่เป็นสัจนิรันดร์'}
        </span>
      </div>
    `;

    if ($('truthTable').style.display !== 'none') generateTruthTable();
  } catch(e){
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

    const rpn = toRPN(tokenize(expr));
    const subExprs = collectSubExpr(rpn);
    const columns = [...vars, ...subExprs];

    // Header
    const tr = document.createElement('tr');
    columns.forEach(c=>{
      const th=document.createElement('th');
      th.textContent=c;
      tr.appendChild(th);
    });
    tableHeader.appendChild(tr);

    const rows = 1<<vars.length;
    for(let i=rows-1;i>=0;i--){
      const env={};
      const tr=document.createElement('tr');
      vars.forEach((v,j)=>{
        env[v]=!!(i&(1<<(vars.length-1-j)));
      });

      columns.forEach(c=>{
        let val;
        if(vars.includes(c)) val=env[c];
        else val=evalRPN(toRPN(tokenize(c)), env);
        const td=document.createElement('td');
        td.textContent=val?'T':'F';
        td.className=val?'true':'false';
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    }
  } catch(e){
    const tr=document.createElement('tr');
    const td=document.createElement('td');
    td.colSpan=99;
    td.textContent='ไม่สามารถสร้างตารางได้: สูตรไม่ถูกต้อง';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    console.error(e);
  }
}

function downloadCSV() {
  const table = $('truthTableContent');
  if (!table) return;
  const rows = [...table.querySelectorAll('tr')];
  const csv = rows.map(r=>{
    const cells=[...r.children].map(c=>'"'+c.textContent+'"');
    return cells.join(',');
  }).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=(normalizeExpr($('display').value)||'truth-table')+'.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// expose
window.addToDisplay=addToDisplay;
window.clearDisplay=clearDisplay;
window.backspace=backspace;
window.moveCursorLeft=moveCursorLeft;
window.moveCursorRight=moveCursorRight;
window.evaluateExpression=evaluateExpression;
window.toggleTruthTable=toggleTruthTable;
window.quickInsert=quickInsert;
window.downloadCSV=downloadCSV;
