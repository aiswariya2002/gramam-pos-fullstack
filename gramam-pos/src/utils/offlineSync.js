// src/utils/offlineSync.js
import { getQueuedBills, removeQueued } from "./offlineDB";
import { API_BASE } from "./apiBase";

/**
 * 🔄 Sync all offline bills from IndexedDB → MySQL server
 * Triggered when:
 *   - App goes online (window 'online' event)
 *   - User clicks “Sync Now”
 *   - Or called manually after saving a sale
 */
export async function syncOfflineBills() {
  console.log("🛰️ Running syncOfflineBills()...");

  // ⏳ Delay ensures IndexedDB is open and stable after network reconnect
  await new Promise((res) => setTimeout(res, 800));

  try {
    // 1️⃣ Fetch all queued bills (not yet synced)
    const queued = await getQueuedBills();

    // 2️⃣ Log detailed info
    console.log(
      "📦 Queued bills fetched from IndexedDB:",
      queued.length,
      queued.map((b) => b.invoiceId)
    );

    // 3️⃣ If nothing to sync → exit early
    if (!queued.length) {
      console.log("✅ No offline bills to sync");
      return;
    }

    // 4️⃣ Loop through each unsynced bill and push to server
    for (const bill of queued) {
      console.log("🔁 Syncing bill:", bill.invoiceId, "→", API_BASE);

      try {
        const res = await fetch(`${API_BASE}/api/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bill),
        });

        const out = await res.json().catch(() => ({}));
        console.log("📥 Server response:", res.status, out);

        // 5️⃣ If success → remove from queue
        if (res.ok && out?.success) {
          await removeQueued(bill.invoiceId);
          console.log("✅ Bill synced and removed:", bill.invoiceId);
        } else {
          console.warn(
            "⚠️ Server rejected bill:",
            bill.invoiceId,
            out?.message || "Unknown reason"
          );
        }
      } catch (err) {
        // 6️⃣ Network or fetch error → stop loop to retry later
        console.error(
          "🌐 Network error syncing bill:",
          bill.invoiceId,
          err.message
        );
        break;
      }
    }

    // 7️⃣ Done
    console.log("🏁 SyncOfflineBills complete.");
  } catch (err) {
    console.error("💥 Sync process failed:", err.message);
  }
}
