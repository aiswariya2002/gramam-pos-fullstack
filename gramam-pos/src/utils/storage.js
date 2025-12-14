// src/utils/storage.js
// LocalStorage helper for UI theme + shop profile

const UI_KEY = "gramam_ui_settings_v1";
const SHOP_KEY = "gramam_shop_profile_v1";

// ----------------------------------------------------
// 🔹 UI Settings (theme, mode)
// ----------------------------------------------------
export function loadUI() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY));
    return (
      saved || {
        primary: "#6f4e37", // Coffee brown theme
        mode: "light",
      }
    );
  } catch {
    return { primary: "#6f4e37", mode: "light" };
  }
}

export function saveUI(obj) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn("⚠️ Failed to save UI settings:", err);
  }
}

// ----------------------------------------------------
// 🔹 Shop Profile (name, logo, address, contact)
// ----------------------------------------------------
export function loadShop() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHOP_KEY));
    return (
      saved || {
        name: "Gramam Naturals",
        logo: "/assets/icon.png",
        address: "123, Local Market, Tamil Nadu",
        phone: "+91 90000 00000",
      }
    );
  } catch {
    return {
      name: "Gramam Naturals",
      logo: "/assets/icon.png",
      address: "123, Local Market, Tamil Nadu",
      phone: "+91 90000 00000",
    };
  }
}

export function saveShop(obj) {
  try {
    localStorage.setItem(SHOP_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn("⚠️ Failed to save shop profile:", err);
  }
}
