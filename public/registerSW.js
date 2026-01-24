// Service Worker Registration Script
// Modified to prevent registration in Capacitor

if ('serviceWorker' in navigator) {
  // Check if running in Capacitor
  const isCapacitor = typeof window !== 'undefined' && 
                      (window.Capacitor || window.Android || window.webkit?.messageHandlers);
  
  if (isCapacitor) {
    console.log('Running in Capacitor - service worker disabled');
    // Unregister any existing service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister().then(function() {
          console.log('Unregistered service worker');
        });
      }
    });
  } else {
    // Only register service worker in web browser
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(function(registration) {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch(function(error) {
          console.warn('Service Worker registration failed:', error);
        });
    });
  }
}

