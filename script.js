/* ===== Logic Calculator + Subexpression Columns ===== */
let currentExpression = "";
let cursorPosition = 0;
let truthTableVisible = false;

/* DOM helpers */
const $ = s => document.querySelector(s);
const displayEl = () => $("#display");
const resultEl  = () => $("#resultDisplay");
const tHead     = () => $("#tableHeader");
const tBody     = () => $("#tableBody");

/* UI */
function updateDisplay(){
  const el = displayEl(); if(!el) return;
  el.value = currentExpression;
  el.setSelectionRange(cursorPosition, cursorPosition);
  el.focus();
}
function addToDisplay(v){
  currentExpression = currentExpression.slice(0, cursorPosition) + v + currentExpression.slice(cursorPosition);
  cursorPosition += v.length;
  updateDisplay();
  if (truthTableVisible) generateTruthTable();
}
function clearDisplay(){ currentExpression=""; cursorPosition=0; updateDisplay(); hideResult(); if(truthTableVisible) generateTruthTable(); }
function backspace(){ if(cursorPosition>0){ currentExpression=currentExpression.slice(0,cursorPosition-1)+currentExpression.slice(cursorPosition); cursorPosition--; updateDisplay(); if(truthTableVisible) generateTruthTable(); } }
function moveCursorLeft(){ if(cursorPosition>0){ cursorPosition--; updateDisplay(); } }
function moveCursorRight(){ if(cursorPosition<currentExpression.length){ cursorPosition++; updateDisplay(); } }
function showResult(html){ const el=resultEl(); if(!el) return; el.innerHTML=html; el.classList.add("show"); }
function hideResult(){ const el=resultEl(); if(!el) return; el.innerHTML=""; el.classList.remove("show"); }

/* Logic helpers */
function extractVariables(expr){ const m=expr.match(/[pqrs]/g)||[]; return [...new Set(m)].sort(); }
function containsOperator(expr){ return /[~∧∨→↔]/.test(expr); }

function evalNext(expr){
  if(/~[TF]/.test(expr)) return expr.replace(/~([TF])/g,(_,a)=>a==="T"?"F":"T");
  if(/[TF]\s*∧\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*∧\s*([TF])/g,(_,a,b)=>a==="T"&&b==="T"?"T":"F");
  if(/[TF]\s*∨\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*∨\s*([TF])/g,(_,a,b)=>a==="T"||b==="T"?"T":"F");
  if(/[TF]\s*→\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*→\s*([TF])/g,(_,a,b)=>a==="F"||b==="T"?"T":"F");
  if(/[TF]\s*↔\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*↔\s*([TF])/g,(_,a,b)=>a===b?"T":"F");
  return expr;
}
function evaluateSimpleTF(expr){
  let cur=expr, guard=0;
  while(containsOperator(cur) && guard++<50){
    const next=evalNext(cur); if(next===cur) break; cur=next;
  }
  return cur==="T";
}
function evaluateWithValues(expression, values){
  let cur=expression;
  for(const [v,val] of Object.entries(values)){ cur = cur.replace(new RegExp(v,"g"), val?"T":"F"); }
  let i=0;
  while(/\([^()]*\)/.test(cur) && i++<50){
    cur = cur.replace(/\([^()]*\)/g, m => evaluateSimpleTF(m.slice(1,-1)) ? "T":"F");
  }
  return evaluateSimpleTF(cur);
}

/* นิพจน์ย่อย */
function getSubExpressions(expression){
  const out = new Set();

  // 1) ตัวแปร
  const vars = extractVariables(expression);
  vars.forEach(v=>out.add(v));

  // 2) ~ตัวแปร
  (expression.match(/~[pqrs]/g) || []).forEach(x=>out.add(x));

  // 3) เนื้อหาในวงเล็บ
  const innerRe = /\(([^\(\)]+)\)/g; let m;
  while((m = innerRe.exec(expression)) !== null){ out.add(m[1].trim()); }

  // 4) ~(...)
  (expression.match(/~\([^\(\)]+\)/g) || []).forEach(x=>out.add(x));

  // 5) จับคู่ term op term
  const term = '(?:~\\([^)]+\\)|\\([^()]+\\)|~?[pqrs])';
  const binOps = '(?:∧|∨|→|↔)';
  const binRe = new RegExp(`${term}\\s*${binOps}\\s*${term}`,'g');
  for(let i=0;i<4;i++){
    let mm; while((mm = binRe.exec(expression)) !== null){ out.add(mm[0].replace(/\s+/g,'')); }
  }

  const subExprs = [...out].filter(x => !vars.includes(x) && x !== expression).sort((a,b)=>a.length-b.length);
  return { variables: vars, subExprs, full: expression };
}

/* ตาราง */
function generateTruthTable(){
  const expr = (currentExpression||"").trim();
  const head=tHead(), body=tBody(); if(!head||!body) return;
  head.innerHTML=""; body.innerHTML=""; if(!expr) return;

  const { variables, subExprs, full } = getSubExpressions(expr);
  if (variables.length===0){ return; }

  // หัวคอลัมน์: ตัวแปร -> นิพจน์ย่อย -> นิพจน์เต็ม
  [...variables, ...subExprs, full].forEach(label=>{
    const th=document.createElement("th"); th.textContent=label; head.appendChild(th);
  });

  const n=variables.length, rows=2**n;
  for(let i=rows-1;i>=0;i--){
    const tr=document.createElement("tr");
    const values={};
    // ตัวแปร
    variables.forEach((v,j)=>{
      const val=Boolean(i&(1<<(n-1-j))); values[v]=val;
      const td=document.createElement("td"); td.textContent=val?"T":"F"; td.className=val?"true":"false"; tr.appendChild(td);
    });
    // นิพจน์ย่อย
    subExprs.forEach(se=>{
      const res=evaluateWithValues(se, values);
      const td=document.createElement("td"); td.textContent=res?"T":"F"; td.className=res?"true":"false"; tr.appendChild(td);
    });
    // เต็ม
    const res=evaluateWithValues(full, values);
    const td=document.createElement("td"); td.textContent=res?"T":"F"; td.className=res?"true":"false"; tr.appendChild(td);

    body.appendChild(tr);
  }
}

/* Evaluate summary */
function evaluateExpression(){
  const expr=(currentExpression||"").trim(); if(!expr) return;
  const vars=extractVariables(expr);
  if(vars.length===0){ showResult('<span style="color:#e11d48">ไม่พบตัวแปรในสูตร</span>'); return; }
  let isT=true; const rows=2**vars.length;
  for(let i=0;i<rows;i++){
    const values={}; for(let j=0;j<vars.length;j++){ values[vars[j]]=Boolean(i&(1<<(vars.length-1-j))); }
    if(!evaluateWithValues(expr, values)){ isT=false; break; }
  }
  showResult(`<div><strong>สูตร:</strong> ${expr}</div><div><strong>ตัวแปร:</strong> ${vars.join(", ")}</div><div><strong>สถานะ:</strong> <span style="color:${isT?"#16a34a":"#e11d48"}">${isT?"เป็นสัจนิรันดร์":"ไม่เป็นสัจนิรันดร์"}</span></div>`);
  if(truthTableVisible) generateTruthTable();
}

/* Toggle ตาราง */
function toggleTruthTable(){
  truthTableVisible = !truthTableVisible;
  const box = document.getElementById('truthTable');
  const txt = document.getElementById('toggleText');
  if(!box||!txt) return;
  if(truthTableVisible){ box.style.display='block'; txt.textContent='ปิดตารางค่าความจริง'; generateTruthTable(); }
  else{ box.style.display='none'; txt.textContent='เปิดตารางค่าความจริง'; }
}

/* Input events */
document.addEventListener("DOMContentLoaded", ()=>{
  const input=displayEl(); if(!input) return;
  input.addEventListener("input", function(){ currentExpression=this.value; cursorPosition=this.selectionStart||currentExpression.length; if(truthTableVisible) generateTruthTable(); });
  input.addEventListener("click", function(){ cursorPosition=this.selectionStart||0; });
  input.addEventListener("keyup", function(){ cursorPosition=this.selectionStart||0; });
});

/* export for inline buttons */
window.addToDisplay=addToDisplay;
window.clearDisplay=clearDisplay;
window.backspace=backspace;
window.moveCursorLeft=moveCursorLeft;
window.moveCursorRight=moveCursorRight;
window.evaluateExpression=evaluateExpression;
window.toggleTruthTable=toggleTruthTable;  const numRows = Math.pow(2, variables.length);
  for (let i = 0; i < numRows; i++) {
    const row = document.createElement('tr');
    const values = {};
    variables.forEach((v, j) => { values[v] = Boolean(i & (1 << (variables.length - 1 - j))); 
      const td = document.createElement('td'); td.textContent = values[v] ? 'T' : 'F'; td.className = values[v] ? 'true' : 'false'; row.appendChild(td); 
    });
    const tdExpr = document.createElement('td'); tdExpr.textContent = '…'; row.appendChild(tdExpr);
    tableBody.appendChild(row);
  }
}function getSubExpressions(expression){
  const out = new Set();

  // 1) ตัวแปรเดี่ยว
  extractVariables(expression).forEach(v=>out.add(v));

  // 2) นิเสธของตัวแปร (~p, ~q, …)
  (expression.match(/~[pqrs]/g) || []).forEach(x=>out.add(x));

  // 3) เนื้อหาในวงเล็บ (เช่น (p∧q) → เพิ่ม "p∧q")
  const innerBracketRe = /\(([^\(\)]+)\)/g;
  let m;
  while((m = innerBracketRe.exec(expression)) !== null){
    out.add(m[1].trim());
  }

  // 4) นิเสธทั้งวงเล็บ (~(p∨q))
  (expression.match(/~\([^\(\)]+\)/g) || []).forEach(x=>out.add(x));

  // 5) จับคู่ไบนารีพื้นฐานอย่าง "term op term"
  // term = ~?variable | ~(...) | (...) | variable
  const term = '(?:~\\([^)]+\\)|\\([^()]+\\)|~?[pqrs])';
  const binOps = '(?:∧|∨|→|↔)';
  const binRe = new RegExp(`${term}\\s*${binOps}\\s*${term}`,'g');

  // รันหลายรอบเพื่อเก็บ subexpr ซ้อน ๆ
  for(let i=0;i<5;i++){
    const found = [];
    let mm;
    while((mm = binRe.exec(expression)) !== null){
      found.push(mm[0].replace(/\s+/g,'').trim());
    }
    found.forEach(x=>out.add(x));
    // พยายามขยาย subexpr จากชิ้นส่วนที่มีอยู่แล้ว (เช่น "p∧q" + "∨r")
    // split โดย operator ชั้นนอกแบบหยาบ ๆ เพื่อเก็บชิ้นย่อยที่ใหญ่ขึ้น
    const ops = ['↔','→','∨','∧']; // ไล่จากความสำคัญต่ำไปสูงพอให้แตกส่วน
    for(const op of ops){
      if(expression.includes(op)){
        const parts = expression.split(op);
        // เก็บกลุ่มซ้ายรวมขวาทีละส่วนแบบง่าย
        for(let j=0;j<parts.length-1;j++){
          const left = parts.slice(0,j+1).join(op);
          const right = parts[j+1];
          const cand = (left + op + right).replace(/\s+/g,'').trim();
          if(cand && cand !== expression) out.add(cand);
        }
      }
    }
  }

  // 6) ลบตัวที่ซ้ำกับตัวแปร (เราจะเรียงตัวแปรขึ้นก่อนอยู่แล้ว)
  // แล้วเพิ่มนิพจน์เต็มท้ายสุด
  const variables = extractVariables(expression);
  const subExprs = [...out].filter(x => !(variables.includes(x)) && x !== expression);

  // เรียงให้สวย: ความยาวน้อย→มาก จะได้ p∧q มาก่อน p∧q∨r
  subExprs.sort((a,b)=>a.length-b.length);

  return { variables, subExprs, full: expression };
}

/* ---------- สร้างตารางค่าความจริง ---------- */
function generateTruthTable(){
  const expr=currentExpression.trim(); const head=tHead(); const body=tBody(); if(!head||!body) return;
  head.innerHTML=""; body.innerHTML=""; if(!expr) return;

  const { variables, subExprs, full } = getSubExpressions(expr);
  const n=variables.length; const rows=2**n;

  // หัวตาราง: ตัวแปร → นิพจน์ย่อย → นิพจน์เต็ม
  [...variables, ...subExprs, full].forEach(label=>{
    const th=document.createElement("th");
    th.textContent=label;
    head.appendChild(th);
  });

  // สร้างแถว
  for(let i=rows-1;i>=0;i--){
    const tr=document.createElement("tr");
    const values={};
    // ค่า T/F ให้ตัวแปร
    variables.forEach((v,j)=>{
      const val=Boolean(i&(1<<(n-1-j)));
      values[v]=val;
      const td=document.createElement("td");
      td.textContent=val?"T":"F";
      td.className=val?"true":"false";
      tr.appendChild(td);
    });
    // ประเมินนิพจน์ย่อย
    subExprs.forEach(se=>{
      const td=document.createElement("td");
      const res = evaluateWithValues(se, values);
      td.textContent = res?"T":"F";
      td.className   = res?"true":"false";
      tr.appendChild(td);
    });
    // นิพจน์เต็ม
    {
      const td=document.createElement("td");
      const res=evaluateWithValues(full, values);
      td.textContent=res?"T":"F";
      td.className  =res?"true":"false";
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

/* Evaluate button */
function evaluateExpression(){
  const expr=currentExpression.trim(); if(!expr) return;
  const vars=extractVariables(expr); if(vars.length===0){ showResult('<span style="color:#e11d48">ไม่พบตัวแปรในสูตร</span>'); return; }
  let isTautology=true; const rows=2**vars.length;
  for(let i=0;i<rows;i++){ const values={}; for(let j=0;j<vars.length;j++){ values[vars[j]]=Boolean(i&(1<<(vars.length-1-j))); } if(!evaluateWithValues(expr,values)){ isTautology=false; break; } }
  showResult(`<div><strong>สูตร:</strong> ${expr}</div><div><strong>ตัวแปร:</strong> ${vars.join(", ")}</div><div><strong>สถานะ:</strong> <span style="color:${isTautology?"#16a34a":"#e11d48"}">${isTautology?"เป็นสัจนิรันดร์":"ไม่เป็นสัจนิรันดร์"}</span></div>`);
  if(truthTableVisible) generateTruthTable();
}

/* Toggle */
function toggleTruthTable(){
  truthTableVisible = !truthTableVisible;
  const box=truthBox(), txt=toggleTxt(); if(!box||!txt) return;
  if(truthTableVisible){ box.hidden=false; txt.textContent="ปิดตารางค่าความจริง"; generateTruthTable(); }
  else{ box.hidden=true; txt.textContent="เปิดตารางค่าความจริง"; }
}

/* Download CSV (ตารางที่เห็นปัจจุบัน) */
function downloadTruthTable(){
  const tbl = document.getElementById("truthTableContent");
  if(!tbl){ alert("ยังไม่มีตารางค่าความจริง"); return; }
  const rows = tbl.querySelectorAll("tr");
  const csv = [];
  rows.forEach(r=>{
    const cols = r.querySelectorAll("th,td");
    const line = Array.from(cols).map(c=>c.innerText.trim()).join(",");
    csv.push(line);
  });
  const blob = new Blob([csv.join("\n")], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "truth_table.csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* Input events */
document.addEventListener("DOMContentLoaded", ()=>{
  const input=displayEl(); if(!input) return;
  input.addEventListener("input", function(){ currentExpression=this.value; cursorPosition=this.selectionStart||currentExpression.length; if(truthTableVisible) generateTruthTable(); });
  input.addEventListener("click", function(){ cursorPosition=this.selectionStart||0; });
  input.addEventListener("keyup", function(){ cursorPosition=this.selectionStart||0; });
});

/* export to window (for inline buttons) */
window.addToDisplay=addToDisplay;
window.clearDisplay=clearDisplay;
window.backspace=backspace;
window.moveCursorLeft=moveCursorLeft;
window.moveCursorRight=moveCursorRight;
window.evaluateExpression=evaluateExpression;
window.toggleTruthTable=toggleTruthTable;
window.downloadTruthTable=downloadTruthTable;


