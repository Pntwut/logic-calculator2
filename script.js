/* =========================
   Logic Calculator – Script
   ========================= */

/* --- สถานะอินพุต --- */
let currentExpression = "";
let cursorPosition = 0;
let truthTableVisible = false;

/* --- DOM refs --- */
const $ = (sel) => document.querySelector(sel);
const displayEl        = () => $("#display");
const resultEl         = () => $("#resultDisplay");
const truthBoxEl       = () => $("#truthTable");
const tableHeaderEl    = () => $("#tableHeader");
const tableBodyEl      = () => $("#tableBody");
const toggleTextEl     = () => $("#toggleText");

/* =========================
   UI Helpers
   ========================= */
function updateDisplay() {
  const el = displayEl();
  if (!el) return;
  el.value = currentExpression;
  el.setSelectionRange(cursorPosition, cursorPosition);
  el.focus();
}
function addToDisplay(value) {
  currentExpression =
    currentExpression.slice(0, cursorPosition) +
    value +
    currentExpression.slice(cursorPosition);
  cursorPosition += value.length;
  updateDisplay();
  if (truthTableVisible) generateTruthTable();
}
function clearDisplay() {
  currentExpression = "";
  cursorPosition = 0;
  updateDisplay();
  hideResult();
  if (truthTableVisible) generateTruthTable();
}
function backspace() {
  if (cursorPosition > 0) {
    currentExpression =
      currentExpression.slice(0, cursorPosition - 1) +
      currentExpression.slice(cursorPosition);
    cursorPosition--;
    updateDisplay();
    if (truthTableVisible) generateTruthTable();
  }
}
function moveCursorLeft() {
  if (cursorPosition > 0) {
    cursorPosition--;
    updateDisplay();
  }
}
function moveCursorRight() {
  if (cursorPosition < currentExpression.length) {
    cursorPosition++;
    updateDisplay();
  }
}
function showResult(html) {
  const el = resultEl();
  if (!el) return;
  el.innerHTML = html;
  el.classList.add("show");
}
function hideResult() {
  const el = resultEl();
  if (!el) return;
  el.innerHTML = "";
  el.classList.remove("show");
}

/* =========================
   Evaluate & Truth Table
   ========================= */
/** ดึงตัวแปรจากนิพจน์ (p,q,r,s) */
function extractVariables(expression) {
  const matches = expression.match(/[pqrs]/g) || [];
  return [...new Set(matches)].sort();
}

/** ตรวจว่ามีตัวดำเนินการอยู่ไหม */
function containsOperator(expr) {
  return /[~∧∨→↔⊕]/.test(expr);
}

/** ประเมินขั้นต่อไป ตาม precedence: ~ → ∧ → ∨ → → → ↔ → ⊕ */
function evalNext(expr) {
  // NOT (~)
  if (/~[TF]/.test(expr)) {
    return expr.replace(/~([TF])/g, (_, a) => (a === "T" ? "F" : "T"));
  }
  // AND
  if (/[TF]\s*∧\s*[TF]/.test(expr)) {
    return expr.replace(/([TF])\s*∧\s*([TF])/g, (_, a, b) =>
      a === "T" && b === "T" ? "T" : "F"
    );
  }
  // OR
  if (/[TF]\s*∨\s*[TF]/.test(expr)) {
    return expr.replace(/([TF])\s*∨\s*([TF])/g, (_, a, b) =>
      a === "T" || b === "T" ? "T" : "F"
    );
  }
  // IMPLIES
  if (/[TF]\s*→\s*[TF]/.test(expr)) {
    return expr.replace(/([TF])\s*→\s*([TF])/g, (_, a, b) =>
      a === "F" || b === "T" ? "T" : "F"
    );
  }
  // IFF
  if (/[TF]\s*↔\s*[TF]/.test(expr)) {
    return expr.replace(/([TF])\s*↔\s*([TF])/g, (_, a, b) =>
      a === b ? "T" : "F"
    );
  }
  // XOR
  if (/[TF]\s*⊕\s*[TF]/.test(expr)) {
    return expr.replace(/([TF])\s*⊕\s*([TF])/g, (_, a, b) =>
      a !== b ? "T" : "F"
    );
  }
  return expr;
}

/** ประเมินนิพจน์ย่อยที่เป็น TF + operators */
function evaluateSimpleTF(expr) {
  let cur = expr;
  let guard = 0;
  while (containsOperator(cur) && guard++ < 50) {
    const next = evalNext(cur);
    if (next === cur) break;
    cur = next;
  }
  return cur === "T";
}

/** ประเมินนิพจน์เต็ม พร้อมแทนค่าตัวแปรและวงเล็บ */
function evaluateWithValues(expression, values) {
  let cur = expression;

  // แทนค่าตัวแปร p,q,r,s เป็น T/F
  for (const [v, val] of Object.entries(values)) {
    cur = cur.replace(new RegExp(v, "g"), val ? "T" : "F");
  }

  // ประเมินวงเล็บจากในสุดออกนอก
  let safety = 0;
  while (/\([^()]*\)/.test(cur) && safety++ < 50) {
    cur = cur.replace(/\([^()]*\)/g, (m) => {
      const inner = m.slice(1, -1);
      const res = evaluateSimpleTF(inner);
      return res ? "T" : "F";
    });
  }

  // ประเมินส่วนที่เหลือ
  const final = evaluateSimpleTF(cur);
  return final;
}

/** สร้างตารางค่าความจริง */
function generateTruthTable() {
  const expr = currentExpression.trim();
  const headerRow = tableHeaderEl();
  const body = tableBodyEl();
  if (!headerRow || !body) return;

  headerRow.innerHTML = "";
  body.innerHTML = "";

  if (!expr) return;

  const vars = extractVariables(expr);
  const n = vars.length;
  const rows = Math.pow(2, n);

  // Header: ตัวแปร + นิพจน์หลัก
  for (const v of vars) {
    const th = document.createElement("th");
    th.textContent = v;
    headerRow.appendChild(th);
  }
  const thExpr = document.createElement("th");
  thExpr.textContent = expr;
  headerRow.appendChild(thExpr);

  // สร้างข้อมูลแถว
  for (let i = rows - 1; i >= 0; i--) {
    const tr = document.createElement("tr");
    const values = {};
    for (let j = 0; j < n; j++) {
      const val = Boolean(i & (1 << (n - 1 - j)));
      values[vars[j]] = val;

      const td = document.createElement("td");
      td.textContent = val ? "T" : "F";
      td.className = val ? "true" : "false";
      tr.appendChild(td);
    }

    const resultVal = evaluateWithValues(expr, values);
    const tdRes = document.createElement("td");
    tdRes.textContent = resultVal ? "T" : "F";
    tdRes.className = resultVal ? "true" : "false";
    tr.appendChild(tdRes);

    body.appendChild(tr);
  }
}

/** ปุ่มคำนวณ */
function evaluateExpression() {
  const expr = currentExpression.trim();
  if (!expr) return;

  const vars = extractVariables(expr);
  if (vars.length === 0) {
    showResult('<span style="color:#e11d48">ไม่พบตัวแปรในสูตร</span>');
    return;
  }

  // ตรวจสัจนิรันดร์
  const rows = Math.pow(2, vars.length);
  let isTautology = true;
  for (let i = 0; i < rows; i++) {
    const values = {};
    for (let j = 0; j < vars.length; j++) {
      values[vars[j]] = Boolean(i & (1 << (vars.length - 1 - j)));
    }
    const ok = evaluateWithValues(expr, values);
    if (!ok) {
      isTautology = false;
      break;
    }
  }

  showResult(
    `<div><strong>สูตร:</strong> ${expr}</div>
     <div><strong>ตัวแปร:</strong> ${vars.join(", ")}</div>
     <div><strong>สถานะ:</strong> <span style="color:${isTautology ? "#16a34a" : "#e11d48"}">${isTautology ? "เป็นสัจนิรันดร์" : "ไม่เป็นสัจนิรันดร์"}</span></div>`
  );

  if (truthTableVisible) generateTruthTable();
}

/** เปิด/ปิดตาราง */
function toggleTruthTable() {
  truthTableVisible = !truthTableVisible;
  const box = truthBoxEl();
  const txt = toggleTextEl();
  if (!box || !txt) return;

  if (truthTableVisible) {
    box.hidden = false;
    txt.textContent = "ปิดตารางค่าความจริง";
    generateTruthTable();
  } else {
    box.hidden = true;
    txt.textContent = "เปิดตารางค่าความจริง";
  }
}

/* =========================
   Input events
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  const input = displayEl();
  if (!input) return;

  input.addEventListener("input", function () {
    currentExpression = this.value;
    cursorPosition = this.selectionStart || currentExpression.length;
    if (truthTableVisible) generateTruthTable();
  });
  input.addEventListener("click", function () {
    cursorPosition = this.selectionStart || 0;
  });
  input.addEventListener("keyup", function () {
    cursorPosition = this.selectionStart || 0;
  });
});

/* =========================
   PWA & Update Banner
   ========================= */
let deferredPrompt = null;

/** ปุ่มติดตั้งแอพ */
function installApp() {
  if (!deferredPrompt) {
    alert("กรุณาเพิ่มเว็บไซต์นี้ไปยังหน้าจอหลักผ่านเมนูของเบราว์เซอร์");
    return;
  }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => (deferredPrompt = null));
}

/** ติดตั้ง Service Worker + แบนเนอร์อัปเดต */
window.addEventListener("load", async () => {
  // beforeinstallprompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById("installButton");
    if (btn) btn.style.display = "inline-flex";
  });
  window.addEventListener("appinstalled", () => {
    const btn = document.getElementById("installButton");
    if (btn) btn.style.display = "none";
  });

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.register("./sw.js");

    const banner = document.getElementById("updateBanner");
    const refreshBtn = document.getElementById("refreshBtn");
    const showBanner = () => banner && (banner.hidden = false);
    const hideBanner = () => banner && (banner.hidden = true);

    // มี SW ใหม่ waiting แล้ว → แสดงแบนเนอร์
    if (reg.waiting) showBanner();

    // เจอ SW ใหม่ระหว่างใช้งาน
    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          showBanner();
        }
      });
    });

    // กด “อัปเดตตอนนี้”
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        const latest = await navigator.serviceWorker.getRegistration();
        if (!latest) return;

        if (latest.waiting) {
          latest.waiting.postMessage({ type: "SKIP_WAITING" });
          return;
        }
        await latest.update();
      };
    }

    // เมื่อ SW ตัวใหม่เข้ามาคุมหน้า → รีโหลด
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      hideBanner();
      setTimeout(() => location.reload(), 50);
    });
  }
});

/* ส่งฟังก์ชันไว้ให้ปุ่มเรียกใช้ (ถ้า bundler ไม่มี) */
window.addToDisplay = addToDisplay;
window.clearDisplay = clearDisplay;
window.backspace = backspace;
window.moveCursorLeft = moveCursorLeft;
window.moveCursorRight = moveCursorRight;
window.evaluateExpression = evaluateExpression;
window.toggleTruthTable = toggleTruthTable;
window.installApp = installApp;
