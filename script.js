// ===================== Helper: Normalize ASCII → Logic Symbols =====================
function normalizeLogicInput(raw) {
  let s = String(raw);

  // รูปแบบยาวก่อน (หลีกเลี่ยงแทนที่ซ้อน)
  s = s.replaceAll('<->', '↔').replaceAll('<—>', '↔'); // กันพิมพ์ขีดยาว
  s = s.replaceAll('->', '→');

  // AND / OR / NOT / XOR
  s = s.replaceAll('&&', '∧').replaceAll('&', '∧');
  s = s.replaceAll('||', '∨').replaceAll('|', '∨');
  s = s.replaceAll('!', '~');
  s = s.replaceAll('^', '⊕');

  return s;
}

// ===================== ตัวแปรหลัก =====================
let currentExpression = '';
let cursorPosition = 0;
let truthTableVisible = false;

// ===================== เริ่มต้นเว็บเมื่อโหลดเสร็จ =====================
document.addEventListener('DOMContentLoaded', function() {
  const display = document.getElementById('display');

  // จัดการอินพุตและการเคลื่อนของเคอร์เซอร์ + แปลงสัญลักษณ์อัตโนมัติ
  display.addEventListener('input', function() {
    const before = this.value;
    const norm = normalizeLogicInput(before);
    if (norm !== before) {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      this.value = norm;
      // คงตำแหน่งเคอร์เซอร์ไว้คร่าว ๆ
      this.selectionStart = this.selectionEnd = Math.max(start, end);
    }
    currentExpression = this.value;
    cursorPosition = this.selectionStart;
    if (truthTableVisible) {
      generateTruthTable();
    }
  });

  display.addEventListener('click', function() {
    cursorPosition = this.selectionStart;
  });

  display.addEventListener('keyup', function() {
    cursorPosition = this.selectionStart;
  });

  // กด Enter เพื่อคำนวณ
  display.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      evaluateExpression();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace') {
      // ให้ใช้ฟังก์ชันจัดการตามปกติ
    }
  });
});

// ===================== ฟังก์ชันจัดการการแสดงผล =====================
function addToDisplay(value) {
  // เผื่อปุ่มกดเป็น ASCII — normalize ให้ด้วย
  const v = normalizeLogicInput(value);
  currentExpression = currentExpression.slice(0, cursorPosition) + v + currentExpression.slice(cursorPosition);
  cursorPosition += v.length;
  updateDisplay();
  if (truthTableVisible) {
    generateTruthTable();
  }
}

function updateDisplay() {
  const display = document.getElementById('display');
  // อัปเดตค่าแบบ normalize เสมอ
  const norm = normalizeLogicInput(currentExpression);
  currentExpression = norm;
  display.value = norm;
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
  document.getElementById('resultDisplay').classList.remove('show');
  if (truthTableVisible) {
    generateTruthTable();
  }
}

function backspace() {
  if (cursorPosition > 0) {
    currentExpression = currentExpression.slice(0, cursorPosition - 1) + currentExpression.slice(cursorPosition);
    cursorPosition--;
    updateDisplay();
    if (truthTableVisible) {
      generateTruthTable();
    }
  }
}

// ===================== ฟังก์ชันเปิด/ปิดตารางค่าความจริง =====================
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

// ===================== ฟังก์ชันประเมินนิพจน์ =====================
function evaluateExpression() {
  if (!currentExpression) return;

  const resultDisplay = document.getElementById('resultDisplay');
  // ใช้ค่าที่ normalize แล้วเสมอ
  const expr = normalizeLogicInput(currentExpression);
  currentExpression = expr;

  const variables = extractVariables(expr);

  if (variables.length === 0) {
    resultDisplay.innerHTML = '<span class="error">ไม่พบตัวแปรในสูตร</span>';
    resultDisplay.classList.add('show');
    return;
  }

  try {
    // ตรวจสอบว่าเป็นสัจนิรันดร์หรือไม่
    let isTautology = true;
    const numRows = Math.pow(2, variables.length);

    // ตรวจสอบทุกกรณีของค่าความจริง
    for (let i = 0; i < numRows; i++) {
      const values = {};
      for (let j = 0; j < variables.length; j++) {
        values[variables[j]] = Boolean(i & (1 << (variables.length - 1 - j)));
      }
      const result = evaluateStepByStep(expr, values);
      if (!result.result) {
        isTautology = false;
        break;
      }
    }

    // แสดงผลการประเมิน
    resultDisplay.innerHTML = `
      <div><strong>สูตร:</strong> ${expr}</div>
      <div><strong>ตัวแปร:</strong> ${variables.join(', ')}</div>
      <div><strong>สถานะ:</strong> <span style="color: ${isTautology ? '#27ae60' : '#e74c3c'}">${isTautology ? 'เป็นสัจนิรันดร์' : 'ไม่เป็นสัจนิรันดร์'}</span></div>
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

// ===================== ฟังก์ชันสร้างตารางค่าความจริง =====================
function generateTruthTable() {
  if (!currentExpression) return;

  const truthTableDiv = document.getElementById('truthTable');
  truthTableDiv.innerHTML = '<h3>ตารางค่าความจริง</h3>';

  // ใช้ expression ที่ normalize แล้ว
  const expr = normalizeLogicInput(currentExpression);

  // ใช้ getSubExpressions กับทุกนิพจน์ (ไม่ว่าจะมีวงเล็บหรือไม่)
  const subExpressions = getSubExpressions(expr);
  if (subExpressions.length > 0) {
    const tableDiv = document.createElement('div');
    tableDiv.className = 'truth-table-variant';
    createSingleTable(subExpressions, tableDiv);
    truthTableDiv.appendChild(tableDiv);
  }
}

// ===================== ฟังก์ชันสนับสนุนสร้างตารางค่าความจริง =====================
function createSingleTable(expressions, container) {
  const variables = extractVariables(expressions[expressions.length - 1]);
  const numRows = Math.pow(2, variables.length);

  // เรียงคอลัมน์: ตัวแปร → นิพจน์ย่อย → นิพจน์หลัก
  const mainExpr = expressions[expressions.length - 1];
  const subExprs = expressions.slice(0, -1).filter(e => !variables.includes(e));
  const orderedExprs = [...subExprs, mainExpr];

  // สร้างตาราง
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // สร้างส่วนหัวตาราง
  const headerRow = document.createElement('tr');

  // เพิ่มคอลัมน์สำหรับตัวแปร
  variables.forEach(variable => {
    const th = document.createElement('th');
    th.textContent = variable;
    headerRow.appendChild(th);
  });

  // เพิ่มคอลัมน์สำหรับนิพจน์ย่อยและนิพจน์สุดท้าย
  orderedExprs.forEach(expr => {
    const th = document.createElement('th');
    th.textContent = expr;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);

  // สร้างแถวข้อมูล
  for (let i = numRows - 1; i >= 0; i--) {
    const row = document.createElement('tr');

    // กำหนดค่าความจริงให้ตัวแปร
    const values = {};
    variables.forEach((variable, j) => {
      values[variable] = Boolean(i & (1 << (variables.length - 1 - j)));
      const td = document.createElement('td');
      td.textContent = values[variable] ? 'T' : 'F';
      td.className = values[variable] ? 'true' : 'false';
      row.appendChild(td);
    });

    // คำนวณผลลัพธ์สำหรับแต่ละนิพจน์
    orderedExprs.forEach(expr => {
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
  container.appendChild(table);

  return table;
}

// ===================== ฟังก์ชันวิเคราะห์นิพจน์ย่อย =====================
function getSubExpressions(expression) {
  const result = [];

  // 1. ตัวแปรเดี่ยว (p, q, r, s) เรียงตามตัวอักษร
  const variables = (expression.match(/[pqrs]/g) || []);
  [...new Set(variables)].sort().forEach(v => {
    result.push(v);
  });

  // 2. นิเสธของตัวแปรเดี่ยว (~p, ~q, ~r, ~s)
  const negations = expression.match(/~[pqrs]/g) || [];
  negations.forEach(neg => {
    if (!result.includes(neg)) {
      result.push(neg);
    }
  });

  // 3. นิพจน์ในวงเล็บ (เฉพาะเนื้อหาข้างใน)
  const bracketRegex = /\(([^\(\)]+)\)/g;
  let bracketMatch;
  while ((bracketMatch = bracketRegex.exec(expression)) !== null) {
    const innerContent = bracketMatch[1]; // เช่น q∨s จาก (q∨s)
    if (!result.includes(innerContent)) {
      result.push(innerContent);
    }
  }

  // 4. นิเสธของนิพจน์ในวงเล็บ (~(q∨s))
  const negatedBrackets = expression.match(/~\([^\(\)]+\)/g) || [];
  negatedBrackets.forEach(negBracket => {
    if (!result.includes(negBracket)) {
      result.push(negBracket);
    }
  });

  // 5. สำหรับประพจน์ที่ไม่มีวงเล็บ - เรียงตามลำดับความสำคัญ
  if (!expression.includes('(')) {
    const operators = ['∧', '∨', '→', '↔', '⊕'];

    for (let op of operators) {
      const opRegex = new RegExp(`([^${operators.join('')}~()]+)\\${op}`, 'g');
      let match;
      while ((match = opRegex.exec(expression)) !== null) {
        const leftPart = match[1].trim();
        if (leftPart && !result.includes(leftPart) && leftPart !== expression) {
          result.push(leftPart);
        }
      }
    }

    // หานิพจน์ย่อยขนาดใหญ่ขึ้น (เช่น p∧q จาก p∧q→r∨s)
    for (let op of operators) {
      if (expression.includes(op)) {
        const parts = expression.split(op);
        for (let i = 0; i < parts.length - 1; i++) {
          let subExpr = parts.slice(0, i + 1).join(op) + op + parts[i + 1].split(operators.find(o => o !== op && parts[i + 1].includes(o)))[0];
          subExpr = subExpr.replace(/[∧∨→↔⊕]$/, '').trim();
          if (subExpr && !result.includes(subExpr) && subExpr !== expression) {
            if (subExpr.match(/[pqrs~]+[∧∨→↔⊕][pqrs~]+/)) {
              result.push(subExpr);
            }
          }
        }
        break; // หยุดเมื่อเจอตัวดำเนินการแรก
      }
    }
  }

  // 6. เพิ่มนิพจน์หลักเป็นคอลัมน์สุดท้าย
  if (!result.includes(expression)) {
    result.push(expression);
  }

  return result;
}

// ===================== ฟังก์ชันประเมินผลและแสดงขั้นตอน =====================
function evaluateStepByStep(expression, values) {
  let steps = [];
  let current = expression;

  // แทนค่าตัวแปรด้วยค่า
  for (const [variable, value] of Object.entries(values)) {
    const regex = new RegExp(variable, 'g');
    current = current.replace(regex, value ? 'T' : 'F');
  }
  steps.push(`แทนค่าตัวแปร: ${current}`);

  // ประเมินผลในวงเล็บซ้ายไปขวา
  let iteration = 0;
  while (current.includes('(') && iteration < 10) {
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

  // ประเมินผลที่เหลือ
  while (containsOperator(current) && iteration < 20) {
    iteration++;
    const oldCurrent = current;
    current = evaluateNextOperation(current);
    if (current !== oldCurrent) {
      steps.push(`${oldCurrent} ≡ ${current}`);
    } else {
      break;
    }
  }

  return { result: current === 'T', steps: steps };
}

// ===================== ฟังก์ชันตรวจสอบตัวดำเนินการ =====================
function containsOperator(expr) {
  return /[~∧∨→↔⊕]/.test(expr);
}

// ===================== ฟังก์ชันประเมินการดำเนินการขั้นต่อไป =====================
function evaluateNextOperation(expr) {
  // ลำดับการดำเนินการ: ~ → ∧ → ∨ → → → ↔ → ⊕

  // NOT (~)
  if (expr.includes('~')) {
    return expr.replace(/~([TF])/g, (match, p1) => {
      return p1 === 'T' ? 'F' : 'T';
    });
  }

  // AND (∧)
  if (expr.includes('∧')) {
    return expr.replace(/([TF])\s*∧\s*([TF])/g, (match, p1, p2) => {
      return (p1 === 'T' && p2 === 'T') ? 'T' : 'F';
    });
  }

  // OR (∨)
  if (expr.includes('∨')) {
    return expr.replace(/([TF])\s*∨\s*([TF])/g, (match, p1, p2) => {
      return (p1 === 'T' || p2 === 'T') ? 'T' : 'F';
    });
  }

  // IMPLIES (→)
  if (expr.includes('→')) {
    return expr.replace(/([TF])\s*→\s*([TF])/g, (match, p1, p2) => {
      return (p1 === 'F' || p2 === 'T') ? 'T' : 'F';
    });
  }

  // IFF (↔)
  if (expr.includes('↔')) {
    return expr.replace(/([TF])\s*↔\s*([TF])/g, (match, p1, p2) => {
      return (p1 === p2) ? 'T' : 'F';
    });
  }

  // XOR (⊕)
  if (expr.includes('⊕')) {
    return expr.replace(/([TF])\s*⊕\s*([TF])/g, (match, p1, p2) => {
      return (p1 !== p2) ? 'T' : 'F';
    });
  }

  return expr;
}

// ===================== ฟังก์ชันประเมินนิพจน์ง่ายๆ =====================
function evaluateSimpleExpression(expr) {
  let current = expr;
  let iteration = 0;

  while (containsOperator(current) && iteration < 20) {
    iteration++;
    const oldCurrent = current;
    current = evaluateNextOperation(current);
    if (current === oldCurrent) break;
  }

  return current === 'T';
}

// ===================== ฟังก์ชันดึงตัวแปรจากนิพจน์ =====================
function extractVariables(expression) {
  const variables = [];
  const variablePattern = /[pqrs]/g;
  const matches = expression.match(variablePattern);
  if (matches) {
    return [...new Set(matches)].sort();
  }
  return [];
}
