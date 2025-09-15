/* ===== Logic Calculator (no update banner) ===== */

let currentExpression = "";
let cursorPosition = 0;
let truthTableVisible = false;

/* DOM helpers */
const $ = (s)=>document.querySelector(s);
const displayEl = ()=>$("#display");
const resultEl  = ()=>$("#resultDisplay");
const truthBox  = ()=>$("#truthTable");
const tHead     = ()=>$("#tableHeader");
const tBody     = ()=>$("#tableBody");
const toggleTxt = ()=>$("#toggleText");

/* UI */
function updateDisplay(){
  const el = displayEl(); if(!el) return;
  el.value = currentExpression;
  el.setSelectionRange(cursorPosition,cursorPosition);
  el.focus();
}
function addToDisplay(v){
  currentExpression = currentExpression.slice(0,cursorPosition)+v+currentExpression.slice(cursorPosition);
  cursorPosition += v.length; updateDisplay();
  if(truthTableVisible) generateTruthTable();
}
function clearDisplay(){ currentExpression=""; cursorPosition=0; updateDisplay(); hideResult(); if(truthTableVisible) generateTruthTable(); }
function backspace(){ if(cursorPosition>0){ currentExpression=currentExpression.slice(0,cursorPosition-1)+currentExpression.slice(cursorPosition); cursorPosition--; updateDisplay(); if(truthTableVisible) generateTruthTable(); } }
function moveCursorLeft(){ if(cursorPosition>0){ cursorPosition--; updateDisplay(); } }
function moveCursorRight(){ if(cursorPosition<currentExpression.length){ cursorPosition++; updateDisplay(); } }
function showResult(html){ const el=resultEl(); if(!el) return; el.innerHTML=html; el.classList.add("show"); }
function hideResult(){ const el=resultEl(); if(!el) return; el.innerHTML=""; el.classList.remove("show"); }

/* Logic helpers */
function extractVariables(expr){ const m=expr.match(/[pqrs]/g)||[]; return [...new Set(m)].sort(); }
function containsOperator(expr){ return /[~∧∨→↔⊕]/.test(expr); }
function evalNext(expr){
  if(/~[TF]/.test(expr)) return expr.replace(/~([TF])/g,(_,a)=>a==="T"?"F":"T");
  if(/[TF]\s*∧\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*∧\s*([TF])/g,(_,a,b)=>a==="T"&&b==="T"?"T":"F");
  if(/[TF]\s*∨\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*∨\s*([TF])/g,(_,a,b)=>a==="T"||b==="T"?"T":"F");
  if(/[TF]\s*→\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*→\s*([TF])/g,(_,a,b)=>a==="F"||b==="T"?"T":"F");
  if(/[TF]\s*↔\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*↔\s*([TF])/g,(_,a,b)=>a===b?"T":"F");
  if(/[TF]\s*⊕\s*[TF]/.test(expr)) return expr.replace(/([TF])\s*⊕\s*([TF])/g,(_,a,b)=>a!==b?"T":"F");
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

/* Truth table */
function generateTruthTable(){
  const expr=currentExpression.trim(); const head=tHead(); const body=tBody(); if(!head||!body) return;
  head.innerHTML=""; body.innerHTML=""; if(!expr) return;
  const vars=extractVariables(expr); const n=vars.length; const rows=2**n;

  vars.forEach(v=>{ const th=document.createElement("th"); th.textContent=v; head.appendChild(th); });
  const th=document.createElement("th"); th.textContent=expr; head.appendChild(th);

  for(let i=rows-1;i>=0;i--){
    const tr=document.createElement("tr"), values={};
    vars.forEach((v,j)=>{ const val=Boolean(i&(1<<(n-1-j))); values[v]=val; const td=document.createElement("td"); td.textContent=val?"T":"F"; td.className=val?"true":"false"; tr.appendChild(td); });
    const res=evaluateWithValues(expr,values); const td=document.createElement("td"); td.textContent=res?"T":"F"; td.className=res?"true":"false"; tr.appendChild(td);
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
window.installApp=()=>{}; // โค้ดติดตั้งอยู่ใน index.html แล้ว
