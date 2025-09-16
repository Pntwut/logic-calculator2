let deferredPrompt = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function showInstallHelp() {
  const help = document.getElementById('installHelp');
  help.hidden = false;
  help.textContent = 'ถ้าไม่เห็นปุ่มติดตั้ง ให้กด "เพิ่มไปยังหน้าจอหลัก" ในเบราว์เซอร์ของคุณ';
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
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice.outcome === 'accepted') btn.style.display = 'none';
    else showInstallHelp();
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
