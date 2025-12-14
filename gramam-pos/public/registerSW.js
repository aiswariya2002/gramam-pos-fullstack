// registerSW.js
// Handles PWA Service Worker registration safely

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // 🔹 Register the service worker from root
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("✅ Service Worker registered:", registration.scope);

      // 🔹 Handle new updates automatically
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.onstatechange = () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log("🔄 New content available; reloading...");
                // Optionally prompt user instead of forcing reload:
                window.location.reload();
              } else {
                console.log("✅ Content cached for offline use.");
              }
            }
          };
        }
      };

      // 🔹 Optional: periodic update check every 30 min
      setInterval(() => registration.update(), 30 * 60 * 1000);

    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
      console.warn("💡 Check HTTPS, certificate, and /sw.js path.");
    }
  });
} else {
  console.warn("⚠️ Service Workers not supported in this browser.");
}
