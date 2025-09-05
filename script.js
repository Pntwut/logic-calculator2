// =====================================================
// Logic Calculator - Full script.js (TH)
// - รวมทุกฟังก์ชันเดิม
// - แก้ generateTruthTable() + createSingleTable()
//   ให้แทรก <table> ลงใน .table-container เสมอ
// =====================================================

// ตัวแปรหลัก
let currentExpression = '';
let cursorPosition = 0;
let truthTableVisible = false;

// เริ่มต้นเว็บเมื่อโหลดเสร็จ
document.addEventListener('DOMContentLoaded', function () {
  const display = document.getElementById('display');

  // จัดการอินพุตและการเคลื่อนของเคอร์เซอร์
  display.addEventListener('input', function () {
    currentExpression = this.value;
    cursorPosition = this.selectionStart;
    if (truthTableVisible) {
      generateTruthTable();
    }
  });

  display.addEventListener('click', function () {
    cursorPosition = this.selectionStart;
  });

  display.addEventListener('keyup', function () {
    cursorPosition = this.selectionStart;
  });

  // จัดการปุ่มลูกศรและปุ่มลบ (เผื่อไว้)
  display.addEventListener('keydown', function (event) {
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Backspace'
    ) {
      // ให้ใช้พฤติกรรมปกติ
    }
  });
});

// ===== ฟังก์ชันจัดการการแสดงผล =====
function addToDisplay(value) {
  currentExpression =
    currentExpression.slice(0, cursorPosition) +
    value +
    currentExpression.slice(cursorPosition);
  cursorPosition += value.length;
  updateDisplay();
  if (truthTableVisible) {
    generateTruthTable();
  }
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
  if (truthTableVisible) {
    generateTruthTable();
  }
}

function backspace() {
  if (cursorPosition > 0) {
    currentExpression =
      currentExpression.slice(0, cursorPosition - 1) +
      currentExpression.slice(cursorPosition);
    cursorPosition--;
    updateDisplay();
    if (truthTableVisible) {
      generateTruthTable();
    }
  }
}

// ===== เปิด/ปิดตารางค่าความจริง =====
function toggleTruthTable() {
  truthTableVisible = !truthTableVisible;
  const truthTable = document.getElementById('truthTable');
  const toggleText = document.getElementById('toggleText');

  if (truthTableVisible) {
    truthTable.classList.add('show');
    toggleText.textContent = 'ปิดตารางค่าความจริง';
    generateTruthTable(); // เรียกทุกครั้งที่เปิด
  } else {
    truthTable.classList.remove('show');
    toggleText.textContent = 'เปิดตารางค่าความจริง';
  }
}

// ===== ประเมินนิพจน์ / ตรวจสัจนิรันดร์ =====
function evaluateExpression() {
  if (!currentExpression) return;

  const resultDisplay = document.getElementById('resultDisplay');
  const variables = extractVariables(currentExpression);

  if (variables.length === 0) {
    resultDisplay.innerHTML = '<span class="error">ไม่พบตัวแปรในสูตร</span>';
    resultDisplay.classList.add('show');
    return;
  }

  try {
    let isTautology = true;
    const numRows = Math.pow(2, variables.length);

    // ตรวจทุกกรณีของค่าความจริง
    for (let i = 0; i < numRows; i++) {
      const values = {};
      for (let j = 0; j < variables.length; j++) {
        values[variables[j]] = Boolean(
          i & (1 << (variables.length - 1 - j))
        );
      }
      const result = evaluateStepByStep(currentExpression, values);
      if (!result.result) {
        isTautology = false;
        break;
      }
    }

    // แสดงผล
    resultDisplay.innerHTML = `
      <div><strong>สูตร:</strong> ${currentExpression}</div>
      <div><strong>ตัวแปร:</strong> ${variables.join(', ')}</div>
      <div><strong>สถานะ:</strong> <span style="color: ${
        isTautology ? '#27ae60' : '#e74c3c'
      }">${isTautology ? 'เป็นสัจนิรันดร์' : 'ไม่เป็นสัจนิรันดร์'}</span></div>
    `;
    resultDisplay.classList.add('show');

    if (truthTableVisible) {
      generateTruthTable();
    }
  } catch (error) {
    resultDisplay.innerHTML = '<span class="error">สูตรไม่ถูกต้อง</span>';
    resultDisplay.classList.add('show');
  }
}

// =====================================================
//      ฟังก์ชันที่ "แก้ไขแล้ว" สำหรับตาราง (2 ตัว)
// =====================================================

// 1) สร้างตารางค่าความจริง โดยห่อด้วย .table-container เสมอ
function generateTruthTable() {
  if (!currentExpression) return;

  const truthTableDiv = document.getElementById('truthTable');

  // สร้าง container ที่เข้ากับ CSS ใหม่
  truthTableDiv.innerHTML = `
    <h3>ตารางค่าความจริง</h3>
    <div class="table-container" id="ttContainer"></div>
  `;

  const container = document.getElementById('ttContainer');

  // คำนวณชุดคอลัมน์ (นิพจน์ย่อย + นิพจน์หลัก)
  const subExpressions = getSubExpressions(currentExpression);
  if (subExpressions.length > 0) {
    createSingleTable(subExpressions, container); // ส่ง container ของ .table-container
  }
}

// 2) สร้าง <table> ลงใน container (.table-container) ที่รับมา
function createSingleTable(expressions, container) {
  const variables = extractVariables(expressions[expressions.length - 1]);
  const numRows = Math.pow(2, variables.length);

  // เรียงคอลัมน์: ตัวแปร → นิพจน์ย่อย → นิพจน์หลัก
  const mainExpr = expressions[expressions.length - 1];
  const subExprs = expressions.slice(0, -1).filter((e) => !variables.includes(e));
  const orderedExprs = [...subExprs, mainExpr];

  // สร้างตาราง
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // ส่วนหัว
  const headerRow = document.createElement('tr');

  // หัวคอลัมน์ตัวแปร
  variables.forEach((variable) => {
    const th = document.createElement('th');
    th.textContent = variable;
    headerRow.appendChild(th);
  });

  // หัวคอลัมน์นิพจน์ย่อย + นิพจน์หลัก
  orderedExprs.forEach((expr) => {
    const th = document.createElement('th');
    th.textContent = expr;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // แถวข้อมูล
  for (let i = numRows - 1; i >= 0; i--) {
    const row = document.createElement('tr');

    // กำหนดค่าความจริงของตัวแปร
    const values = {};
    variables.forEach((variable, j) => {
      values[variable] = Boolean(i & (1 << (variables.length - 1 - j)));
      const td = document.createElement('td');
      td.textContent = values[variable] ? 'T' : 'F';
      td.className = values[variable] ? 'true' : 'false';
      row.appendChild(td);
    });

    // ผลของนิพจน์ย่อย/หลัก
    orderedExprs.forEach((expr) => {
      const result = evaluateStepByStep(expr, values);
      const td = document.createElement('td');
      td.textContent = result.result ? 'T' : 'F';
      td.className = result.result ? 'true' : 'false';
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(thead);
  table.appendChild(tbody);

  // 👇 สำคัญ: แทรกตารางลงใน .table-container เพื่อให้ CSS ใหม่ทำงาน
  container.appendChild(table);

  return table;
}

// =====================================================
//              ส่วนช่วยประเมินนิพจน์
// =====================================================

// วิเคราะห์นิพจน์ย่อย
function getSubExpressions(expression) {
  const result = [];

  // 1) ตัวแปรเดี่ยว (p,q,r,s) เรียงตามตัวอักษร
  const variables = expression.match(/[pqrs]/g) || [];
  [...new Set(variables)].sort().forEach((v) => result.push(v));

  // 2) นิเสธตัวแปร (~p, ~q, ...)
  const negations = expression.match(/~[pqrs]/g) || [];
  negations.forEach((neg) => {
    if (!result.includes(neg)) result.push(neg);
  });

  // 3) นิพจน์ในวงเล็บ (เฉพาะเนื้อหาข้างใน)
  const bracketRegex = /\(([^\(\)]+)\)/g;
  let bracketMatch;
  while ((bracketMatch = bracketRegex.exec(expression)) !== null) {
    const innerContent = bracketMatch[1];
    if (!result.includes(innerContent)) result.push(innerContent);
  }

  // 4) นิเสธของนิพจน์ในวงเล็บ (~(q∨s))
  const negatedBrackets = expression.match(/~\([^\(\)]+\)/g) || [];
  negatedBrackets.forEach((negBracket) => {
    if (!result.includes(negBracket)) result.push(negBracket);
  });

  // 5) สำหรับกรณีไม่มีวงเล็บ: ดึงตามลำดับตัวดำเนินการ
  if (!expression.includes('(')) {
    // ลำดับความสำคัญ: ~ → ∧ → ∨ → → → ↔ → ⊕
    const operators = ['∧', '∨', '→', '↔', '⊕'];

    for (let op of operators) {
      const opRegex = new RegExp(`([^${operators.join('')}~()]+)\\${op}`, 'g');
      let match;
      while ((match = opRegex.exec(expression)) !== null) {
        const leftPart = match[1].trim();
        if (
          leftPart &&
          !result.includes(leftPart) &&
          leftPart !== expression
        ) {
          result.push(leftPart);
        }
      }
    }

    // หานิพจน์ย่อยขนาดใหญ่ขึ้นแบบหยาบ ๆ
    for (let op of operators) {
      if (expression.includes(op)) {
        const parts = expression.split(op);
        for (let i = 0; i < parts.length - 1; i++) {
          let subExpr =
            parts.slice(0, i + 1).join(op) +
            op +
            parts[i + 1].split(
              operators.find((o) => o !== op && parts[i + 1].includes(o)) || ''
            )[0];
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
        break; // เจอ op แรกแล้วพอ
      }
    }
  }

  // 6) เพิ่มนิพจน์หลักเป็นคอลัมน์สุดท้าย
  if (!result.includes(expression)) result.push(expression);

  return result;
}

// ประเมินผลและเก็บขั้นตอน (ใช้ภายใน)
function evaluateStepByStep(expression, values) {
  let steps = [];
  let current = expression;

  // แทนค่าตัวแปรด้วย T/F
  for (const [variable, value] of Object.entries(values)) {
    const regex = new RegExp(variable, 'g');
    current = current.replace(regex, value ? 'T' : 'F');
  }
  steps.push(`แทนค่าตัวแปร: ${current}`);

  // ประเมินในวงเล็บก่อน (ซ้ายไปขวา)
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
    } else {
      break;
    }
  }

  // ประเมินส่วนที่เหลือ
  while (containsOperator(current) && iteration < 200) {
    iteration++;
    const oldCurrent = current;
    current = evaluateNextOperation(current);
    if (current !== oldCurrent) {
      steps.push(`${oldCurrent} ≡ ${current}`);
    } else {
      break;
    }
  }

  return { result: current === 'T', steps };
}

// ตรวจว่ามีตัวดำเนินการไหม
function containsOperator(expr) {
  return /[~∧∨→↔⊕]/.test(expr);
}

// ประเมินการดำเนินการขั้นถัดไปตามลำดับความสำคัญ
function evaluateNextOperation(expr) {
  // ลำดับ: ~ > ∧ > ∨ > → > ↔ > ⊕

  // NOT (~)
  if (expr.includes('~')) {
    return expr.replace(/~([TF])/g, (m, p1) => (p1 === 'T' ? 'F' : 'T'));
  }

  // AND (∧)
  if (expr.includes('∧')) {
    return expr.replace(/([TF])\s*∧\s*([TF])/g, (m, a, b) =>
      a === 'T' && b === 'T' ? 'T' : 'F'
    );
  }

  // OR (∨)
  if (expr.includes('∨')) {
    return expr.replace(/([TF])\s*∨\s*([TF])/g, (m, a, b) =>
      a === 'T' || b === 'T' ? 'T' : 'F'
    );
  }

  // IMPLIES (→)
  if (expr.includes('→')) {
    return expr.replace(/([TF])\s*→\s*([TF])/g, (m, a, b) =>
      a === 'F' || b === 'T' ? 'T' : 'F'
    );
  }

  // IFF (↔)
  if (expr.includes('↔')) {
    return expr.replace(/([TF])\s*↔\s*([TF])/g, (m, a, b) =>
      a === b ? 'T' : 'F'
    );
  }

  // XOR (⊕)
  if (expr.includes('⊕')) {
    return expr.replace(/([TF])\s*⊕\s*([TF])/g, (m, a, b) =>
      a !== b ? 'T' : 'F'
    );
  }

  return expr;
}

// ประเมินนิพจน์ง่าย ๆ (ไม่มีวงเล็บแล้ว)
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

// ดึงตัวแปรจากนิพจน์
function extractVariables(expression) {
  const matches = expression.match(/[pqrs]/g);
  if (matches) return [...new Set(matches)].sort();
  return [];
}
