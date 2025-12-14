import { getAllProducts, saveProducts } from "../utils/offlineDB";
import { API_BASE } from "../utils/apiBase"; // ✅ use centralized API base

export async function loadProductsOfflineSafe() {
  try {
    const res = await fetch(`${API_BASE}/api/product`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await res.json();

    // ✅ ensure it's valid structure
    if (data?.success && Array.isArray(data.products)) {
      await saveProducts(data.products);
      return data.products;
    } else if (Array.isArray(data)) {
      // In case backend just sends an array
      await saveProducts(data);
      return data;
    }

    console.warn("⚠️ No valid product data from API");
    return [];
  } catch (err) {
    console.log("📦 Offline mode → loading products from IndexedDB");
    const offlineData = await getAllProducts();
    return offlineData || [];
  }
}
