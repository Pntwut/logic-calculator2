let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function showInstallHelp() {
  const help = document.getElementById('installHelp');
  if (!help) return;
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isInApp = /(line|fbav|fbios|instagram|tiktok|twitter)/i.test(ua);
  let msg = 'อุปกรณ์ของคุณอาจไม่รองรับการติดตั้งอัตโนมัติ';
  if (isInApp) msg = 'กำลังเปิดจากแอปรอบนอก (LINE/FB/IG ฯลฯ) ให้เปิดลิงก์นี้ด้วย Safari หรือ Chrome';
  else if (isIOS && isSafari) msg = 'บน iPhone/iPad: ปุ่ม “แชร์” > “เพิ่มไปยังหน้าจอหลัก”';
  else if (isIOS && !isSafari) msg = 'บน iOS ให้เปิดด้วย Safari แล้วกด “แชร์” > “เพิ่มไปยังหน้าจอหลัก”';
  else msg = 'ถ้าไม่เห็นปุ่มติดตั้ง ลองรีเฟรชแบบล้างแคช (Ctrl+Shift+R) หรือเปิดด้วย Chrome/Edge/Safari';
  help.textContent = msg;
  help.hidden = false;
}

window.addEventListener('load', async () => {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./sw.js'); } catch (e) {}
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installButton');
  if (btn && !isStandalone()) btn.style.display = 'inline-flex';
});

window.installApp = async function () {
  const btn = document.getElementById('installButton');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(()=>({outcome:'dismissed'}));
    deferredPrompt = null;
    if (choice && choice.outcome === 'accepted') { if (btn) btn.style.display = 'none'; }
    else { showInstallHelp(); }
  } else {
    showInstallHelp();
  }
};

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installButton');
  if (btn) btn.style.display = 'none';
  const help = document.getElementById('installHelp');
  if (help) help.hidden = true;
});
