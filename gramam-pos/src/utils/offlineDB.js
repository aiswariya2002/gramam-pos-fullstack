// -----------------------------------------
// OFFLINE DB (FINAL STABLE VERSION)
// -----------------------------------------

const DB_NAME = "gramam-db-v4";
const DB_VERSION = 4;

const STORE_PRODUCTS = "products";
const STORE_BILLS = "bills";
const STORE_USERS = "users";

// -----------------------------------------
// OPEN / UPGRADE DB
// -----------------------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // PRODUCTS
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
      }

      // BILLS
      if (!db.objectStoreNames.contains(STORE_BILLS)) {
        const bills = db.createObjectStore(STORE_BILLS, { keyPath: "invoiceId" });
        bills.createIndex("synced", "synced", { unique: false });
      } else {
        const bills = e.target.transaction.objectStore(STORE_BILLS);
        if (!bills.indexNames.contains("synced")) {
          bills.createIndex("synced", "synced", { unique: false });
        }
      }

      // USERS
      if (!db.objectStoreNames.contains(STORE_USERS)) {
        db.createObjectStore(STORE_USERS, { keyPath: "username" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// -----------------------------------------
// PRODUCTS
// -----------------------------------------
export async function saveProducts(arr = []) {
  const db = await openDB();
  const tx = db.transaction(STORE_PRODUCTS, "readwrite");
  const store = tx.objectStore(STORE_PRODUCTS);

  store.clear();
  arr.forEach((p) => store.put(p));

  return new Promise((r) => (tx.oncomplete = () => r(true)));
}

export async function getAllProducts() {
  const db = await openDB();
  const tx = db.transaction(STORE_PRODUCTS, "readonly");
  const store = tx.objectStore(STORE_PRODUCTS);

  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export const getProducts = getAllProducts;

// -----------------------------------------
// SAVE BILL (offline queue)
// -----------------------------------------
export async function saveBill(bill) {
  if (!bill || !bill.invoiceId) throw new Error("Missing invoiceId");

  const db = await openDB();
  const tx = db.transaction(STORE_BILLS, "readwrite");
  const store = tx.objectStore(STORE_BILLS);

  store.put({
    ...bill,
    synced: false,
    createdAt: new Date().toISOString(),
  });

  return new Promise((r) => (tx.oncomplete = () => r(true)));
}

// -----------------------------------------
// GET UNSYNCED BILLS (FINAL FIX)
// -----------------------------------------
export async function getQueuedBills() {
  const db = await openDB();
  const tx = db.transaction(STORE_BILLS, "readonly");
  const store = tx.objectStore(STORE_BILLS);
  const out = [];

  const push = (b) => {
    if (b && (b.synced === false || b.synced === 0)) out.push(b);
  };

  const hasIndex = store.indexNames.contains("synced");

  return new Promise((resolve) => {
    // USE INDEX IF EXISTS
    if (hasIndex) {
      try {
        const idx = store.index("synced");

        // ⭐ Boolean key must use only(false)
        const req = idx.openCursor(IDBKeyRange.only(false));

        req.onsuccess = (e) => {
          const cur = e.target.result;
          if (cur) {
            push(cur.value);
            cur.continue();
          } else {
            resolve(out);
          }
        };

        req.onerror = () => {
          // fallback to full scan
          const all = store.getAll();
          all.onsuccess = () => {
            (all.result || []).forEach(push);
            resolve(out);
          };
          all.onerror = () => resolve(out);
        };

        return;
      } catch (err) {
        console.warn("Index open error:", err.message);
      }
    }

    // NO INDEX → full scan
    const all = store.getAll();
    all.onsuccess = () => {
      (all.result || []).forEach(push);
      resolve(out);
    };
    all.onerror = () => resolve(out);
  });
}

// -----------------------------------------
// REMOVE BILL AFTER SYNC
// -----------------------------------------
export async function removeQueued(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_BILLS, "readwrite");
  tx.objectStore(STORE_BILLS).delete(id);
  return new Promise((r) => (tx.oncomplete = () => r(true)));
}

// -----------------------------------------
// USERS
// -----------------------------------------
export async function saveUserOffline(user) {
  if (!user?.username) return false;

  const db = await openDB();
  const tx = db.transaction(STORE_USERS, "readwrite");
  tx.objectStore(STORE_USERS).put(user);
  return new Promise((r) => (tx.oncomplete = () => r(true)));
}

export async function getUserOffline(username) {
  const db = await openDB();
  const tx = db.transaction(STORE_USERS, "readonly");

  return new Promise((resolve) => {
    const req = tx.objectStore(STORE_USERS).get(username);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function getAllOfflineUsers() {
  const db = await openDB();
  const tx = db.transaction(STORE_USERS, "readonly");

  return new Promise((resolve) => {
    const req = tx.objectStore(STORE_USERS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export { openDB };
