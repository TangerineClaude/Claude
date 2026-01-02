// PWA installation and update handling

let deferredPrompt: any = null;

// Listen for install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  // You can create a custom install button UI here
  const installButton = document.createElement('button');
  installButton.textContent = 'Install App';
  installButton.className = 'fixed bottom-4 right-4 px-4 py-2 bg-terminal-text text-terminal-bg rounded font-bold';
  installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
      deferredPrompt = null;
      installButton.remove();
    }
  });

  // Only show if not already in standalone mode
  if (!window.matchMedia('(display-mode: standalone)').matches) {
    document.body.appendChild(installButton);
  }
}

// Handle service worker updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Service worker updated, could reload or show notification
    console.log('App updated! Refresh to see changes.');
  });

  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'MISSIONS_UPDATED') {
      // Trigger a refetch in React Query
      window.dispatchEvent(new CustomEvent('missions-updated', {
        detail: event.data.missions
      }));
    }
  });
}

// Request notification permission
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Send notification
export function sendNotification(title: string, body: string, url?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'agent-control',
    });

    if (url) {
      notification.addEventListener('click', () => {
        window.open(url, '_blank');
      });
    }
  }
}

// Check if running as installed PWA
export function isInstalledPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}
