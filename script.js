// =====================================================
// Logic Calculator - script.js (TH) – Improved
// - ASCII normalize
// - XSS-safe output
// - Parentheses check
// - Enter to evaluate + remember last expr
// - Truth table renders inside .table-container
// =====================================================

// -------------------------
// State
// -------------------------
let currentExpression = '';
let cursorPosition = 0;
let truthTableVisible = false;

// -------------------------
// Utils
// -------------------------
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// แปลงอินพุต ASCII -> สัญลักษณ์ตรรกศาสตร์ และลบช่องว่าง
function normalizeInput(src) {
  return src
    .replace(/\s+/g, '')                // ลบช่องว่างทั้งหมด
    .replace(/!/g, '~')                 // !p -> ~p
    .replace(/\^/g, '∧')                // p^q -> p∧q
    .replace(/\|/g, '∨')                // p|q -> p∨q
    .replace(/->|=>/g, '→')             // p->q, p=>q -> p→q
    .replace(/<->|<=>/g, '↔')           // p<->q -> p↔q
    .replace(/\bxor\b/gi, '⊕');         // xor -> ⊕
}

// ตรวจวงเล็บสมดุลไหม
function checkParentheses(s) {
  let c = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') c++;
    else if (s[i] === ')') c--;
    if (c < 0) return { ok:false, at:i }; // ปิดเกิน
  }
  return { ok: c === 0, at: -1 };
}

// -------------------------
// Bootstrap
// -------------------------
document.addEventListener('DOMContentLoaded', function () {
  const display = document.getElementById('display');

  // โหลดสูตรล่าสุด (optional UX)
  const last = localStorage.getItem('lc:lastExpr');
  if (last) {
    currentExpression = last;
    updateDisplay();
  }

  // พิมพ์: sync state + gen table ถ้าเปิดไว้
  display.addEventListener('input', function () {
    currentExpression = normalizeInput(this.value);
    cursorPosition = this.selectionStart;
    // เก็บค่า
    localStorage.setItem('lc:lastExpr', currentExpression);
    // ซิงก์ช่องแสดง (เพราะ normalize ตัดช่องว่างออก)
    updateDisplay();
    if (truthTableVisible) generateTruthTable();
  });

  display.addEventListener('click', function () {
    cursorPosition = this.selectionStart;
  });

  display.addEventListener('keyup', function () {
    cursorPosition = this.selectionStart;
  });

  // Enter = evaluate
  display.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      evaluateExpression();
    }
  });
});

// -------------------------
// Display helpers
// -------------------------
function addToDisplay(value) {
  currentExpression =
    currentExpression.slice(0, cursorPosition) +
    value +
    currentExpression.slice(cursorPosition);
  currentExpression = normalizeInput(currentExpression);
  cursorPosition += value.length;
  updateDisplay();
  localStorage.setItem('lc:lastExpr', currentExpression);
  if (truthTableVisible) generateTruthTable();
}

function updateDisplay() {
  const display = document.getElementById('display');
  display.value = currentExpression;
  display.setSelectionRange(cursorPosition, cursorPosition);
  display.focus();
}

function moveCursorLeft() {
  const display = document.getElementById('display');
  if (cursorPosition > 0) {
    cursorPosition--;
    display.setSelectionRange(cursorPosition, cursorPosition);
    display.focus();
  }
}

function moveCursorRight() {
  const display = document.getElementById('display');
  if (cursorPosition < currentExpression.length) {
    cursorPosition++;
    display.setSelectionRange(cursorPosition, cursorPosition);
    display.focus();
  }
}

function clearDisplay() {
  currentExpression = '';
  cursorPosition = 0;
  updateDisplay();
  const rd = document.getElementById('resultDisplay');
  rd.classList.remove('show');
  if (truthTableVisible) generateTruthTable();
}

function backspace() {
  if (cursorPosition > 0) {
    currentExpression =
      currentExpression.slice(0, cursorPosition - 1) +
      currentExpression.slice(cursorPosition);
    currentExpression = normalizeInput(currentExpression);
    cursorPosition--;
    updateDisplay();
    localStorage.setItem('lc:lastExpr', currentExpression);
    if (truthTableVisible) generateTruthTable();
  }
}

// -------------------------
// Truth table toggle
// -------------------------
function toggleTruthTable() {
  truthTableVisible = !truthTableVisible;
  const truthTable = document.getElementById('truthTable');
  const toggleText = document.getElementById('toggleText');

  if (truthTableVisible) {
    truthTable.classList.add('show');
    toggleText.textContent = 'ปิดตารางค่าความจริง';
    generateTruthTable();
  } else {
    truthTable.classList.remove('show');
    toggleText.textContent = 'เปิดตารางค่าความจริง';
  }
}

// -------------------------
// Evaluation
// -------------------------
function evaluateExpression() {
  if (!currentExpression) return;

  // normalize รอบสุดท้ายกันพลาด
  currentExpression = normalizeInput(currentExpression);
  updateDisplay();

  // วงเล็บต้องสมดุลก่อน
  const pc = checkParentheses(currentExpression);
  const resultDisplay = document.getElementById('resultDisplay');
  if (!pc.ok) {
    resultDisplay.innerHTML = '<span class="error">วงเล็บไม่สมดุล</span>';
    resultDisplay.classList.add('show');
    return;
  }

  const variables = extractVariables(currentExpression);
  if (variables.length === 0) {
    resultDisplay.innerHTML = '<span class="error">ไม่พบตัวแปรในสูตร</span>';
    resultDisplay.classList.add('show');
    return;
  }

  try {
    let isTautology = true;
    const numRows = Math.pow(2, variables.length);

    for (let i = 0; i < numRows; i++) {
      const values = {};
      for (let j = 0; j < variables.length; j++) {
        values[variables[j]] = Boolean(i & (1 << (variables.length - 1 - j)));
      }
      const result = evaluateStepByStep(currentExpression, values);
      if (!result.result) { isTautology = false; break; }
    }

    // แสดงผลแบบ XSS-safe: ใช้ textContent ใส่สูตร
    resultDisplay.innerHTML = `
      <div><strong>สูตร:</strong> <span id="exprOut"></span></div>
      <div><strong>ตัวแปร:</strong> ${variables.join(', ')}</div>
      <div><strong>สถานะ:</strong> <span style="color:${isTautology ? '#27ae60' : '#e74c3c'}">
        ${isTautology ? 'เป็นสัจนิรันดร์' : 'ไม่เป็นสัจนิรันดร์'}
      </span></div>
    `;
    const exprOut = document.getElementById('exprOut');
    exprOut.textContent = currentExpression; // ✅ ปลอดภัย

    resultDisplay.classList.add('show');
    if (truthTableVisible) generateTruthTable();

  } catch (error) {
    resultDisplay.innerHTML = '<span class="error">สูตรไม่ถูกต้อง</span>';
    resultDisplay.classList.add('show');
  }
}

// -------------------------
// Truth table (fixed styles)
// -------------------------
function generateTruthTable() {
  if (!currentExpression) return;

  const truthTableDiv = document.getElementById('truthTable');
  truthTableDiv.innerHTML = `
    <h3>ตารางค่าความจริง</h3>
    <div class="table-container" id="ttContainer"></div>
  `;

  const container = document.getElementById('ttContainer');
  const subExpressions = getSubExpressions(currentExpression);
  if (subExpressions.length > 0) {
    createSingleTable(subExpressions, container);
  }
}

function createSingleTable(expressions, container) {
  const variables = extractVariables(expressions[expressions.length - 1]);
  const numRows = Math.pow(2, variables.length);

  const mainExpr = expressions[expressions.length - 1];
  const subExprs = expressions.slice(0, -1).filter(e => !variables.includes(e));
  const orderedExprs = [...subExprs, mainExpr];

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = document.createElement('tr');
  variables.forEach(v => {
    const th = document.createElement('th');
    th.textContent = v;
    headerRow.appendChild(th);
  });
  orderedExprs.forEach(expr => {
    const th = document.createElement('th');
    th.textContent = expr;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  for (let i = numRows - 1; i >= 0; i--) {
    const row = document.createElement('tr');
    const values = {};

    variables.forEach((v, j) => {
      values[v] = Boolean(i & (1 << (variables.length - 1 - j)));
      const td = document.createElement('td');
      td.textContent = values[v] ? 'T' : 'F';
      td.className = values[v] ? 'true' : 'false';
      row.appendChild(td);
    });

    orderedExprs.forEach(expr => {
      const ev = evaluateStepByStep(expr, values);
      const td = document.createElement('td');
      td.textContent = ev.result ? 'T' : 'F';
      td.className = ev.result ? 'true' : 'false';
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);        // ✅ สำคัญ: อยู่ใน .table-container
  return table;
}

// -------------------------
// Expression analysis helpers
// -------------------------
function getSubExpressions(expression) {
  const result = [];

  const variables = expression.match(/[pqrs]/g) || [];
  [...new Set(variables)].sort().forEach(v => result.push(v));

  const negations = expression.match(/~[pqrs]/g) || [];
  negations.forEach(neg => { if (!result.includes(neg)) result.push(neg); });

  const bracketRegex = /\(([^\(\)]+)\)/g;
  let m;
  while ((m = bracketRegex.exec(expression)) !== null) {
    const inner = m[1];
    if (!result.includes(inner)) result.push(inner);
  }

  const negBrackets = expression.match(/~\([^\(\)]+\)/g) || [];
  negBrackets.forEach(nb => { if (!result.includes(nb)) result.push(nb); });

  if (!expression.includes('(')) {
    const ops = ['∧', '∨', '→', '↔', '⊕'];

    for (let op of ops) {
      const opRegex = new RegExp(`([^${ops.join('')}~()]+)\\${op}`, 'g');
      let mm;
      while ((mm = opRegex.exec(expression)) !== null) {
        const left = mm[1].trim();
        if (left && !result.includes(left) && left !== expression) result.push(left);
      }
    }

    for (let op of ops) {
      if (expression.includes(op)) {
        const parts = expression.split(op);
        for (let i = 0; i < parts.length - 1; i++) {
          let subExpr =
            parts.slice(0, i + 1).join(op) +
            op +
            parts[i + 1].split(ops.find(o => o !== op && parts[i + 1].includes(o)) || '')[0];
          subExpr = subExpr.replace(/[∧∨→↔⊕]$/, '').trim();
          if (
            subExpr &&
            !result.includes(subExpr) &&
            subExpr !== expression &&
            subExpr.match(/[pqrs~]+[∧∨→↔⊕][pqrs~]+/)
          ) {
            result.push(subExpr);
          }
        }
        break;
      }
    }
  }

  if (!result.includes(expression)) result.push(expression);
  return result;
}

function evaluateStepByStep(expression, values) {
  let steps = [];
  let current = expression;

  for (const [variable, value] of Object.entries(values)) {
    const regex = new RegExp(variable, 'g');
    current = current.replace(regex, value ? 'T' : 'F');
  }
  steps.push(`แทนค่าตัวแปร: ${current}`);

  let iteration = 0;
  while (current.includes('(') && iteration < 50) {
    iteration++;
    const innerMatch = current.match(/\([^()]*\)/);
    if (innerMatch) {
      const innerExpr = innerMatch[0];
      const innerContent = innerExpr.slice(1, -1);
      const innerResult = evaluateSimpleExpression(innerContent);
      current = current.replace(innerExpr, innerResult ? 'T' : 'F');
      steps.push(`${innerExpr} = ${innerResult ? 'T' : 'F'} ≡ ${current}`);
    } else break;
  }

  while (containsOperator(current) && iteration < 200) {
    iteration++;
    const oldCurrent = current;
    current = evaluateNextOperation(current);
    if (current !== oldCurrent) steps.push(`${oldCurrent} ≡ ${current}`);
    else break;
  }

  return { result: current === 'T', steps };
}

function containsOperator(expr) {
  return /[~∧∨→↔⊕]/.test(expr);
}

function evaluateNextOperation(expr) {
  if (expr.includes('~')) {
    return expr.replace(/~([TF])/g, (m, p1) => (p1 === 'T' ? 'F' : 'T'));
  }
  if (expr.includes('∧')) {
    return expr.replace(/([TF])\s*∧\s*([TF])/g, (m, a, b) => (a === 'T' && b === 'T' ? 'T' : 'F'));
  }
  if (expr.includes('∨')) {
    return expr.replace(/([TF])\s*∨\s*([TF])/g, (m, a, b) => (a === 'T' || b === 'T' ? 'T' : 'F'));
  }
  if (expr.includes('→')) {
    return expr.replace(/([TF])\s*→\s*([TF])/g, (m, a, b) => (a === 'F' || b === 'T' ? 'T' : 'F'));
  }
  if (expr.includes('↔')) {
    return expr.replace(/([TF])\s*↔\s*([TF])/g, (m, a, b) => (a === b ? 'T' : 'F'));
  }
  if (expr.includes('⊕')) {
    return expr.replace(/([TF])\s*⊕\s*([TF])/g, (m, a, b) => (a !== b ? 'T' : 'F'));
  }
  return expr;
}

function evaluateSimpleExpression(expr) {
  let current = expr;
  let iteration = 0;
  while (containsOperator(current) && iteration < 200) {
    iteration++;
    const oldCurrent = current;
    current = evaluateNextOperation(current);
    if (current === oldCurrent) break;
  }
  return current === 'T';
}

function extractVariables(expression) {
  const matches = expression.match(/[pqrs]/g);
  if (matches) return [...new Set(matches)].sort();
  return [];
}
