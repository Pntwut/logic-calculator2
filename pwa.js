let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const ua = navigator.userAgent.toLowerCase();
const isIOS = /iphone|ipad|ipod/.test(ua);
const isInApp = /(line|fbav|fbios|instagram|tiktok|twitter)/i.test(ua);

function showInstallHelp(messageOverride) {
  const help = document.getElementById('installHelp');
  if (!help) return;

  let msg = messageOverride || 'ถ้าไม่เห็นปุ่มติดตั้ง ลองรีเฟรชแบบล้างแคช หรือเปิดด้วย Chrome/Edge/Safari';
  if (isInApp) {
    msg = 'กำลังเปิดจากแอปรอบนอก (LINE/FB/IG ฯลฯ) → เปิดด้วย Safari หรือ Chrome แล้วติดตั้ง';
  } else if (isIOS) {
    msg = 'บน iPhone/iPad: แตะปุ่ม “แชร์” แล้วเลือก “เพิ่มไปยังหน้าจอหลัก”';
  }
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

  if (isIOS) {
    if (btn) btn.style.display = 'inline-flex';
    showInstallHelp();
    return;
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferredPrompt = null;

    if (choice && choice.outcome === 'accepted') {
      if (btn) btn.style.display = 'none';
      const help = document.getElementById('installHelp'); if (help) help.hidden = true;
    } else {
      showInstallHelp();
    }
  } else {
    showInstallHelp();
  }
};

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installButton'); if (btn) btn.style.display = 'none';
  const help = document.getElementById('installHelp'); if (help) help.hidden = true;
});
