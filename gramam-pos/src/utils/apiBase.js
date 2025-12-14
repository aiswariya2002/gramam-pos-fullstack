// src/utils/apiBase.js

const hostname = window.location.hostname;
const protocol = window.location.protocol; // http: or https:
let API_BASE = "";

if (hostname === "localhost" || hostname === "127.0.0.1") {
  API_BASE = `${protocol}//localhost:5000`; // ✅ local backend port
}

// If phone opens site → use your LAN IP
else if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) {
  if (protocol === "https:") {
    API_BASE = `https://${hostname}:5443`;
  } else {
    API_BASE = `http://${hostname}:5000`;
  }
}

// Production (Render backend)
else {
  API_BASE = "https://gramam-pos-fullstack-1.onrender.com";
}

export async function safeFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      mode: "cors",
    });
    return res;
  } catch (err) {
    console.error("❌ Network error:", err);
    return {
      ok: false,
      status: 0,
      json: async () => ({ success: false, error: "offline" }),
    };
  }
}

export { API_BASE };
