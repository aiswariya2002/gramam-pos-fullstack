// src/pages/Sales.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box, Paper, Typography, IconButton, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, Drawer, Divider,
  List, ListItem, ListItemText, ListItemSecondaryAction, Badge,
  BottomNavigation, BottomNavigationAction, Chip, Stack, Avatar,
  Modal, useTheme, FormControlLabel, Checkbox
} from "@mui/material";
import { motion } from "framer-motion";
import { fetchProductsShared } from "./Products";

import { FiPlus, FiSearch } from "react-icons/fi";
import QrCodeIcon from "@mui/icons-material/QrCode";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CloseIcon from "@mui/icons-material/Close";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import PrintIcon from "@mui/icons-material/Print";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import CameraFrontIcon from "@mui/icons-material/FlipCameraAndroid";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import FlashOffIcon from "@mui/icons-material/FlashOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { BrowserMultiFormatReader } from "@zxing/library";

// Offline utils
import {
  saveProducts, getProducts,
  saveBill
} from "../utils/offlineDB";
import { syncOfflineBills } from "../utils/offlineSync";
import { API_BASE } from "../utils/apiBase";

// -----------------------------------------------------
// CONSTANTS
// -----------------------------------------------------
const GST_PERCENT = 18;
const CART_KEY = "gramam_cart_v1";
const SHOP_CACHE_KEY = "shop_info"; // for offline shop info cache

// Default fallbacks
const FALLBACK_LOGO = "/assets/logo.png";
const FALLBACK_UPI = "/assets/upi.png";
const FALLBACK_ITEM_IMG = "/assets/icon.png";

function uid(prefix = "inv") {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}

const cardMotion = { rest: { scale: 1 }, hover: { scale: 1.03 } };

// ⭐ New compact card size (desktop)
const CARD_W = 90;     // px
const CARD_H = 150;    // px
const IMG_H  = 60;     // px

// -----------------------------------------------------
// SAFE URL HELPERS
// -----------------------------------------------------
function toAbsoluteUploadUrl(file) {
  if (!file) return null;
  const val = String(file).trim();
  if (/^https?:\/\//i.test(val)) return val;
  if (val.startsWith("/uploads/")) return `${API_BASE}${val}`;
  if (val.startsWith("uploads/")) return `${API_BASE}/${val}`;
  return `${API_BASE}/uploads/${val}`;
}

function productImageUrl(p) {
  const img = p?.image;
  const out = toAbsoluteUploadUrl(img);
  return out || FALLBACK_ITEM_IMG;
}

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------
export default function Sales() {
  const theme = useTheme();

  // --------------- Refs (Scanner) ----------------
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const lastScanTextRef = useRef("");
  const lastScanTimeRef = useRef(0);

  // --------------- Scanner States ----------------
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [stream, setStream] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [greenFlash, setGreenFlash] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);

  // --------------- Data States -------------------
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [invoice, setInvoice] = useState(null);

  // ✅ Drawer state
  const [cartOpen, setCartOpen] = useState(false);

  // --------------- Shop Info ---------------------
  const [shop, setShop] = useState(() => {
    try {
      const cached = localStorage.getItem(SHOP_CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // --------------- Bill Counter ------------------
  const [billNo, setBillNo] = useState(() =>
    Number(localStorage.getItem("bill_no_counter") || 1)
  );

  // -----------------------------------------------------
  // LOAD SHOP INFO (API then cache → offline fallback)
  // -----------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/shop`, { method: "GET" });
        const text = await res.text();
        if (text.startsWith("<!DOCTYPE")) throw new Error("HTML from API");
        const data = JSON.parse(text);

        if (data?.success && data.shop) {
          const s = {
            name: data.shop.name || "My Shop",
            license: data.shop.license || "",
            logo: toAbsoluteUploadUrl(data.shop.logo) || FALLBACK_LOGO,
            upi_qr: toAbsoluteUploadUrl(data.shop.upi_qr) || FALLBACK_UPI
          };
          if (!alive) return;
          setShop(s);
          localStorage.setItem(SHOP_CACHE_KEY, JSON.stringify(s));
        } else {
          throw new Error("Shop not found");
        }
      } catch {
        // offline fallback from cache; already set via useState initializer
      }
    })();
    return () => { alive = false; };
  }, []);

  // -----------------------------------------------------
  // LOAD PRODUCTS (shared logic + offline cache)
  // -----------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchProductsShared(API_BASE);
        if (active) {
          setProducts(data);
          await saveProducts(data);
        }
      } catch (err) {
        console.error("⚠️ Product load failed:", err?.message || err);
        try {
          const cached = await getProducts();
          if (active) setProducts(cached || []);
        } catch {
          if (active) setProducts([]);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  // -----------------------------------------------------
  // CART PERSIST (localStorage)
  // -----------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // -----------------------------------------------------
  // ONLINE: trigger sync once available
  // -----------------------------------------------------
  useEffect(() => {
    const handleOnline = async () => {
      await new Promise((r) => setTimeout(r, 500));
      try {
        await syncOfflineBills();
      } catch (e) {
        console.warn("Sync error:", e);
      }
    };
    if (navigator.onLine) handleOnline();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // -----------------------------------------------------
  // CAMERA / SCANNER
  // -----------------------------------------------------
  const loadCameras = async () => {
    try {
      const r = new BrowserMultiFormatReader();
      const list = await r.listVideoInputDevices();
      setDevices(list || []);
      if (list?.length && !selectedDeviceId) {
        setSelectedDeviceId(list[0].deviceId);
      }
    } catch (e) {
      console.warn("Camera list error", e);
    }
  };

  const getConstraints = (deviceIdOverride) => {
    const deviceId = deviceIdOverride ?? selectedDeviceId;
    return deviceId
      ? { video: { deviceId: { exact: deviceId }, focusMode: "continuous" } }
      : { video: { facingMode: "environment", focusMode: "continuous" } };
  };

  const startScanner = async () => {
    setScanning(true);
    lastScanTextRef.current = "";
    lastScanTimeRef.current = 0;
    try {
      readerRef.current?.reset();
      readerRef.current = new BrowserMultiFormatReader();

      const s = await navigator.mediaDevices.getUserMedia(getConstraints());
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;

      const track = s.getVideoTracks()[0];
      const caps = track.getCapabilities?.() || {};
      if (caps.torch && flashOn) {
        await track.applyConstraints({ advanced: [{ torch: true }] });
      }

      await readerRef.current.decodeFromVideoDevice(
        selectedDeviceId || null,
        videoRef.current,
        (result) => {
          if (!result) return;
          const now = Date.now();
          const text = String(result.getText() || "").trim();
          if (
            text &&
            (text !== lastScanTextRef.current ||
              now - lastScanTimeRef.current > 900)
          ) {
            lastScanTextRef.current = text;
            lastScanTimeRef.current = now;
            handleScanResult(text);
          }
        }
      );
    } catch (e) {
      console.error("Scanner error:", e);
      alert("Camera error");
      stopScanner();
    }
  };

  const stopScanner = () => {
    try { readerRef.current?.reset(); } catch {}
    try { stream?.getVideoTracks?.().forEach((t) => t.stop()); } catch {}
    setStream(null);
    setScanning(false);
    setScannerOpen(false);
  };

  const toggleFlash = async () => {
    if (!stream) return alert("Start scanner first");
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities?.() || {};
    if (!caps.torch) return alert("Flash not supported");
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn((v) => !v);
    } catch {}
  };

  const flipCamera = async () => {
    if (!devices.length) return;
    const idx = Math.max(
      0,
      devices.findIndex((d) => d.deviceId === selectedDeviceId)
    );
    const next = devices[(idx + 1) % devices.length];
    setSelectedDeviceId(next.deviceId);

    if (scannerOpen) {
      try {
        stream?.getVideoTracks?.().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia(
          getConstraints(next.deviceId)
        );
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;

        try {
          readerRef.current?.reset();
        } catch {}
        await readerRef.current.decodeFromVideoDevice(
          next.deviceId,
          videoRef.current,
          (result) => {
            if (!result) return;
            const now = Date.now();
            const text = String(result.getText() || "").trim();
            if (
              text &&
              (text !== lastScanTextRef.current ||
                now - lastScanTimeRef.current > 900)
            ) {
              lastScanTextRef.current = text;
              lastScanTimeRef.current = now;
              handleScanResult(text);
            }
          }
        );
      } catch (e) {
        console.warn("Flip error", e);
        stopScanner();
        setTimeout(() => startScanner(), 150);
      }
    }
  };

  const handleScanResult = (text) => {
    if (!text) return;
    setLastScanned(text);
    try {
      navigator.vibrate?.(60);
    } catch {}
    setGreenFlash(true);
    setTimeout(() => setGreenFlash(false), 300);
    addByBarcode(String(text).trim());
  };

  // -----------------------------------------------------
  // CART OPS
  // -----------------------------------------------------
  const addByBarcode = (code) => {
    const prod = products.find((p) => String(p.barcode) === String(code));
    if (!prod) return alert(`Product not found (${code})`);
    addToCart(prod.id, 1);
  };

  const addToCart = (id, qty = 1) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (p.stock < qty) return alert("Not enough stock");

    // reduce stock locally
    setProducts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: x.stock - qty } : x))
    );

    // add/increase in cart
    setCart((prev) => {
      const found = prev.find((i) => i.productId === id);
      if (found)
        return prev.map((i) =>
          i.productId === id ? { ...i, qty: i.qty + qty } : i
        );
      return [
        ...prev,
        { productId: id, name: p.name, price: p.price, qty },
      ];
    });

    // best effort stock update to server
    (async () => {
      try {
        await fetch(`${API_BASE}/api/product/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, stock: p.stock - qty }),
        });
      } catch {}
    })();
  };

  const changeQty = (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    const item = cart.find((c) => c.productId === id);
    if (!item) return;
    const diff = qty - item.qty;

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: p.stock - diff } : p))
    );
    setCart((prev) =>
      prev.map((c) => (c.productId === id ? { ...c, qty } : c))
    );
  };

  const removeFromCart = (id) => {
    const item = cart.find((c) => c.productId === id);
    if (!item) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: p.stock + item.qty } : p))
    );
    setCart((prev) => prev.filter((c) => c.productId !== id));
  };

  // -----------------------------------------------------
  // BILLING (finalize with discount support)
  // -----------------------------------------------------
  // These are original running totals (no discount)
  const subtotalRaw = cart.reduce((s, x) => s + x.price * x.qty, 0);

  const finalizeSale = async (mode, discountInfo) => {
    if (!cart.length) return alert("Cart empty");

    const enabled = !!discountInfo?.enabled;
    const percent = enabled ? Math.min(100, Math.max(0, Number(discountInfo.percent || 0))) : 0;
    const discountAmount = enabled ? (subtotalRaw * percent) / 100 : 0;

    const taxableBase = Math.max(0, subtotalRaw - discountAmount);
    const gst = (taxableBase * GST_PERCENT) / 100;
    const total = taxableBase + gst;

    const inv = {
      invoiceId: uid("inv"),
      billNo,
      timestamp: new Date().toISOString(),
      paymentMode: mode,
      items: cart.map((c) => ({
        productId: c.productId,
        name: c.name,
        price: c.price,
        qty: c.qty,
        lineTotal: c.qty * c.price,
      })),
      subtotal: subtotalRaw,
      discount: discountAmount,          // ✅ now saving discount
      discountPercent: percent,          // ✅ for reference
      gst,
      total,
    };

    try {
      await saveBill(inv); // local queue (even if online)
      if (navigator.onLine) {
        await syncOfflineBills();
      }
    } catch (err) {
      console.error("🔥 finalizeSale failed:", err);
      alert("❌ Failed to save bill locally.");
    }

    const next = billNo + 1;
    setBillNo(next);
    localStorage.setItem("bill_no_counter", next);

    setInvoice(inv);
    setCart([]);
    localStorage.removeItem(CART_KEY);
  };

  const printInvoice = (inv) => {
    if (!inv) return alert("No invoice");

    const rows = inv.items
      .map(
        (it) => `
          <tr>
            <td>${it.name} (${it.qty})</td>
            <td style="text-align:right">₹${it.lineTotal.toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const shopLogo = shop.logo || FALLBACK_LOGO;
    const shopName = shop.name || "My Shop";
    const shopLic = shop.license ? `License: ${shop.license}` : "";

    const discountRow = inv.discount > 0
      ? `<tr><td>Discount${inv.discountPercent ? ` (${inv.discountPercent}%)` : ""}</td><td class="right">-₹${inv.discount.toFixed(2)}</td></tr>`
      : "";

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; width: 300px; margin: 0 auto; color: #000; }
            hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; font-size: 13px; }
            .center { text-align: center; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="${shopLogo}"
                 alt="Logo"
                 style="width:80px;height:auto;display:block;margin:6px auto 2px;"
                 onerror="this.style.display='none'"/>
            <h3 style="margin:2px 0;">${shopName}</h3>
            ${shopLic ? `<small>${shopLic}</small><br/>` : ""}
            <small>${new Date(inv.timestamp).toLocaleString()}</small>
          </div>
          <hr/>
          <table>${rows}</table>
          <hr/>
          <table>
            <tr><td>Subtotal</td><td class="right">₹${inv.subtotal.toFixed(2)}</td></tr>
            ${discountRow}
            <tr><td>GST (${GST_PERCENT}%)</td><td class="right">₹${inv.gst.toFixed(2)}</td></tr>
            <tr><td><b>Total</b></td><td class="right"><b>₹${inv.total.toFixed(2)}</b></td></tr>
          </table>
          <hr/>
          <div class="center"><p>Thank you for shopping!</p></div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  // -----------------------------------------------------
  // DERIVED
  // -----------------------------------------------------
  const categories = [
    "All",
    ...new Set(products.map((p) => p.category || "Uncategorized")),
  ];

  const filteredProducts = products.filter(
    (p) =>
      p.status !== "deleted" &&
      (p.name || "").toLowerCase().includes((searchText || "").toLowerCase()) &&
      (selectedCategory === "All" || p.category === selectedCategory)
  );

  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------
  return (
    <Box sx={{ pt: 10, px: 2, pb: 12,
      background: theme.palette.mode === "dark"
        ? "radial-gradient(1200px 600px at -10% -20%, rgba(33,150,243,.12), transparent 50%), linear-gradient(180deg,#0f1115,#121418)"
        : "radial-gradient(1200px 600px at -10% -20%, rgba(33,150,243,.08), transparent 50%), linear-gradient(180deg,#f5f7fb,#ffffff)"
    }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        {/* HEADER */}
       <Paper elevation={0} sx={{
  p: 2,
  borderRadius: 3,
  mb: 2,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark"
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.08)",
  boxShadow: `0 6px 20px ${theme.palette.primary.main}22`,
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 2,
}}>
  <Box>
    <Typography variant="h6" sx={{ fontWeight: 900 }}>
      Sales & Billing
    </Typography>

    <Typography
      variant="caption"
      sx={{
        fontWeight: 900,
        color: theme.palette.primary.main,
        letterSpacing: 0.5,
      }}
    >
      Scan → Add → Checkout
    </Typography>
  </Box>

  <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Search products..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{ startAdornment: <FiSearch style={{ marginRight: 8 }} /> }}
            sx={{ width: { xs: "100%", sm: 300 }, maxWidth: 420, flexGrow: { xs: 1, sm: 0 } }}
          />

          <Button
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 700 }}
            startIcon={<QrCodeIcon />}
            onClick={() => { loadCameras(); setScannerOpen(true); }}
          >
            Scanner
          </Button>

          <Button variant="outlined" onClick={() => syncOfflineBills()}>
            Sync Now
          </Button>

          <IconButton
            onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
            title={viewMode === "grid" ? "Switch to List" : "Switch to Grid"}
          >
            {viewMode === "grid" ? <ViewListIcon /> : <ViewModuleIcon />}
          </IconButton>

          <IconButton onClick={() => setCartOpen(true)}>
            <Badge color="secondary" badgeContent={cart.length}>
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Paper>

        {/* FILTER BAR */}
        <Paper elevation={0} sx={{
          p: 2, mb: 2, borderRadius: 3,
          border: "1px solid",
          borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          boxShadow: `0 6px 20px ${theme.palette.primary.main}11`
        }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Stack direction="row" spacing={1} sx={{ overflowX: "auto" }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  color={selectedCategory === c ? "primary" : "default"}
                  variant={selectedCategory === c ? "filled" : "outlined"}
                  onClick={() => setSelectedCategory(c)}
                />
              ))}
            </Stack>

            <Box sx={{ flex: 1 }} />

            <TextField
              size="small"
              value={manualCode}
              placeholder="Enter barcode"
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  addByBarcode(manualCode.trim());
                  setManualCode("");
                }
              }}
            />
            <Button
              variant="contained"
              onClick={() => {
                if (manualCode.trim()) {
                  addByBarcode(manualCode.trim());
                  setManualCode("");
                }
              }}
            >
              Add
            </Button>
          </Box>
        </Paper>

        {/* PRODUCTS */}
        {viewMode === "grid" ? (
          <Box
            sx={{
              display: "grid",
              justifyContent: { xs: "center", md: "flex-start" },
              gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`,
              gap: "6px",
              pb: 2,
            }}
          >
            {filteredProducts.map((p) => {
              const img = productImageUrl(p);
              const lowStock = p.stock <= 20 && p.stock > 0;
              return (
                <motion.div key={p.id} variants={cardMotion} initial="rest" whileHover="hover">
                  <Paper
                    elevation={1}
                    sx={{
                      width: `${CARD_W}px`,
                      height: `${CARD_H}px`,
                      borderRadius: 2,
                      p: 0.8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textAlign: "center",
                      background: theme.palette.mode === "dark"
                        ? "linear-gradient(180deg,#17191d,#1f2227)"
                        : "linear-gradient(180deg,#ffffff,#f6f8fb)",
                      border: "1px solid",
                      borderColor: theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                      boxShadow: `0 4px 12px ${theme.palette.primary.main}26`,
                      transition: "transform .18s ease, box-shadow .18s ease",
                    }}
                  >
                    {/* Image box (fixed) */}
                    <Box
                      sx={{
                        width: "100%",
                        height: `${IMG_H}px`,
                        borderRadius: 1.5,
                        overflow: "hidden",
                        bgcolor: theme.palette.mode === "dark" ? "#222" : "#eef2f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={img}
                        alt={p.name}
                        onError={(e) => {
                          if (!e.currentTarget.dataset._fallback) {
                            e.currentTarget.dataset._fallback = "1";
                            e.currentTarget.src = FALLBACK_ITEM_IMG;
                          }
                        }}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </Box>

                    {/* Name */}
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 11,
                        mt: 0.3,
                        width: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </Typography>

                    {/* Price */}
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      ₹{Number(p.price || 0).toFixed(2)}
                    </Typography>

                    {/* Stock */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 10,
                        color: lowStock ? "#ffb300" : "#43a047",
                        fontWeight: 700,
                      }}
                    >
                      {p.stock > 0 ? `Stock: ${p.stock}` : "Out of stock"}
                    </Typography>

                    {/* Add button */}
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p.id, 1)}
                      sx={{
                        mt: 0.3,
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 1.5,
                        boxShadow: `0 6px 12px ${theme.palette.primary.main}55`,
                      }}
                      startIcon={<FiPlus />}
                    >
                      {p.stock <= 0 ? "NA" : "Add"}
                    </Button>
                  </Paper>
                </motion.div>
              );
            })}
          </Box>
        ) : (
          <Paper sx={{ p: 1 }}>
            <List disablePadding>
              {filteredProducts.map((p) => {
                const img = productImageUrl(p);
                const lowStock = p.stock <= 20 && p.stock > 0;
                return (
                  <ListItem key={p.id} divider sx={{ py: 1 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1.5,
                        overflow: "hidden",
                        bgcolor: "#fafafa",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 1.5,
                      }}
                    >
                      <img
                        src={img}
                        alt={p.name}
                        onError={(e) => {
                          if (!e.currentTarget.dataset._fallback) {
                            e.currentTarget.dataset._fallback = "1";
                            e.currentTarget.src = FALLBACK_ITEM_IMG;
                          }
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          mixBlendMode: "multiply",
                        }}
                      />
                    </Box>

                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>}
                      secondary={
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} alignItems="center">
                          <Typography variant="body2">
                            ₹{Number(p.price || 0).toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={lowStock ? "error" : "text.secondary"}
                          >
                            {p.stock > 0 ? `Stock: ${p.stock}` : "Out of stock"}
                          </Typography>
                        </Stack>
                      }
                    />

                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={p.stock <= 0}
                        onClick={() => addToCart(p.id, 1)}
                        startIcon={<FiPlus />}
                      >
                        Add
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
              {!filteredProducts.length && (
                <Typography sx={{ p: 2, textAlign: "center" }} color="text.secondary">
                  No products found
                </Typography>
              )}
            </List>
          </Paper>
        )}
      </Box>

      {/* CART DRAWER */}
      <CartDrawer
        openState={[cartOpen, setCartOpen]}
        cart={cart}
        changeQty={changeQty}
        removeFromCart={removeFromCart}
        subtotalRaw={subtotalRaw}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        onFinalize={(info) => finalizeSale(paymentMode, info)}
        onFinalizeUPI={(info) => finalizeSale("UPI", info)}
        upiQr={shop.upi_qr || FALLBACK_UPI}
      />

      {/* SCANNER DRAWER */}
      <Drawer anchor="bottom" open={scannerOpen} onClose={stopScanner}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6">Scanner</Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              {lastScanned && (
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  icon={<CheckCircleIcon />}
                  label={`Scanned: ${lastScanned}`}
                />
              )}
              <IconButton onClick={flipCamera} title="Flip Camera">
                <CameraFrontIcon />
              </IconButton>
              <IconButton onClick={toggleFlash} title="Toggle Flash" disabled={!stream}>
                {flashOn ? <FlashOnIcon /> : <FlashOffIcon />}
              </IconButton>
              <Button onClick={stopScanner} size="small">
                Close
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              height: 300,
              overflow: "hidden",
              borderRadius: 2,
              bgcolor: "black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              outline: greenFlash
                ? `3px solid ${theme.palette.success.main}`
                : "3px solid transparent",
              transition: "outline-color 120ms ease",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* green scan line animation */}
            {greenFlash && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  bgcolor: "success.main",
                  animation: "scanline 300ms ease",
                  "@keyframes scanline": {
                    from: { transform: "translateY(0)" },
                    to: { transform: "translateY(298px)" },
                  },
                }}
              />
            )}
          </Box>

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            onClick={startScanner}
            disabled={scanning}
          >
            {scanning ? "Scanning…" : "Start Scanner"}
          </Button>
        </Box>
      </Drawer>

      {/* INVOICE MODAL */}
      <Modal open={Boolean(invoice)} onClose={() => setInvoice(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: { xs: 320, sm: 420 },
            bgcolor: "background.paper",
            p: 2,
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Avatar src={shop.logo || FALLBACK_LOGO} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">{shop.name || "My Shop"}</Typography>
              {!!shop.license && (
                <Typography variant="caption" display="block">
                  License: {shop.license}
                </Typography>
              )}
              <Typography variant="caption" display="block">
                Bill No: {invoice?.billNo} •{" "}
                {invoice && new Date(invoice.timestamp).toLocaleString()}
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <IconButton onClick={() => printInvoice(invoice)}>
              <PrintIcon />
            </IconButton>
          </Box>

          <Divider sx={{ my: 1 }} />

          {invoice?.items?.map((it, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography>
                {it.name} ({it.qty})
              </Typography>
              <Typography>₹{it.lineTotal.toFixed(2)}</Typography>
            </Box>
          ))}

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography>Subtotal</Typography>
            <Typography>₹{invoice?.subtotal.toFixed(2)}</Typography>
          </Box>

          {invoice?.discount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography>
                Discount{invoice.discountPercent ? ` (${invoice.discountPercent}%)` : ""}
              </Typography>
              <Typography>-₹{invoice.discount.toFixed(2)}</Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography>GST</Typography>
            <Typography>₹{invoice?.gst.toFixed(2)}</Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
            <Typography fontWeight={700}>Total</Typography>
            <Typography fontWeight={700}>₹{invoice?.total.toFixed(2)}</Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button fullWidth onClick={() => setInvoice(null)}>
              Close
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                printInvoice(invoice);
                setInvoice(null);
              }}
            >
              Print
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* MOBILE NAV */}
      <Box
        sx={{
          position: "fixed",
          bottom: 12,
          left: 16,
          right: 16,
          display: { xs: "block", sm: "none" },
        }}
      >
        <Paper elevation={5} sx={{ borderRadius: 3 }}>
          <BottomNavigation showLabels>
            <BottomNavigationAction label="Products" icon={<StorefrontIcon />} />
            <BottomNavigationAction
              label="Scanner"
              icon={<QrCodeIcon />}
              onClick={() => {
                loadCameras();
                setScannerOpen(true);
              }}
            />
            <BottomNavigationAction
              label="Cart"
              icon={<ShoppingCartIcon />}
              onClick={() => setCartOpen(true)}
            />
          </BottomNavigation>
        </Paper>
      </Box>
    </Box>
  );
}

/* ------------------------------
   CART DRAWER (with discount)
------------------------------ */
function CartDrawer({
  openState,
  cart,
  changeQty,
  removeFromCart,
  subtotalRaw,
  paymentMode,
  setPaymentMode,
  onFinalize,
  onFinalizeUPI,
  upiQr,
}) {
  const [open, setOpen] = openState;

  // Discount state (locks once enabled)
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountLocked, setDiscountLocked] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  // compute discounted totals (GST after discount)
  const percent = discountEnabled ? Math.min(100, Math.max(0, Number(discountPercent || 0))) : 0;
  const discountAmount = discountEnabled ? (subtotalRaw * percent) / 100 : 0;
  const taxable = Math.max(0, subtotalRaw - discountAmount);
  const gst = (taxable * GST_PERCENT) / 100;
  const total = taxable + gst;

  const finalize = (mode) => {
    onFinalize({
      enabled: discountEnabled,
      percent,
      amount: discountAmount,
    });
    // reset drawer/discount locks for next bill
    setDiscountEnabled(false);
    setDiscountLocked(false);
    setDiscountPercent(0);
    setOpen(false);
  };

  const finalizeUPI = () => {
    onFinalizeUPI({
      enabled: discountEnabled,
      percent,
      amount: discountAmount,
    });
    setDiscountEnabled(false);
    setDiscountLocked(false);
    setDiscountPercent(0);
    setOpen(false);
  };

  return (
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
      <Box sx={{ width: { xs: 330, sm: 420 }, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Cart</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ my: 1 }} />

        {cart.length === 0 && (
          <Typography color="text.secondary">Cart empty</Typography>
        )}

        <List>
          {cart.map((c) => (
            <ListItem key={c.productId} divider>
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>}
                secondary={`Qty: ${c.qty} • ₹${(c.price).toFixed(2)} each • Line: ₹${(c.qty * c.price).toFixed(2)}`}
              />

              <ListItemSecondaryAction>
                <IconButton size="small" onClick={() => changeQty(c.productId, c.qty - 1)}>
                  <RemoveIcon />
                </IconButton>

                <IconButton size="small" onClick={() => changeQty(c.productId, c.qty + 1)}>
                  <AddIcon />
                </IconButton>

                <IconButton size="small" color="error" onClick={() => removeFromCart(c.productId)}>
                  <CloseIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {cart.length > 0 && (
          <>
            {/* Totals + Discount */}
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <b>₹{subtotalRaw.toFixed(2)}</b>
              </Typography>

              <Box sx={{ mt: 1.5, p: 1, borderRadius: 2, border: "1px dashed rgba(0,0,0,0.2)" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={discountEnabled}
                      disabled={discountLocked}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setDiscountEnabled(true);
                          setDiscountLocked(true); // lock after enabling
                          if (!discountPercent) setDiscountPercent(5);
                        } else {
                          // once enabled and locked, don't allow uncheck
                          // ignore uncheck interaction
                        }
                      }}
                    />
                  }
                  label="Apply Discount (%)"
                />

                {discountEnabled && (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Percent"
                      value={discountPercent}
                      onChange={(e) => {
                        const v = Number(e.target.value || 0);
                        setDiscountPercent(Math.max(0, Math.min(100, v)));
                      }}
                      sx={{ width: 120 }}
                      inputProps={{ min: 0, max: 100 }}
                    />
                    <Chip
                      variant="outlined"
                      label={`-₹${discountAmount.toFixed(2)}`}
                      color="success"
                    />
                  </Stack>
                )}
              </Box>

              {discountEnabled && (
                <Typography sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                  <span>Discount{percent ? ` (${percent}%)` : ""}</span>
                  <b>-₹{discountAmount.toFixed(2)}</b>
                </Typography>
              )}

              <Typography sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <span>GST ({GST_PERCENT}%)</span>
                <b>₹{gst.toFixed(2)}</b>
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Typography
                sx={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}
              >
                <span>Total</span>
                <b>₹{total.toFixed(2)}</b>
              </Typography>
            </Box>

            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel>Payment</InputLabel>
              <Select label="Payment" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
              </Select>
            </FormControl>

            {paymentMode === "UPI" && (
              <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}>
                <img
                  src={upiQr || FALLBACK_UPI}
                  alt="UPI QR"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    if (!e.currentTarget.dataset._fallback) {
                      e.currentTarget.dataset._fallback = "1";
                      e.currentTarget.src = FALLBACK_UPI;
                    }
                  }}
                />
                <Box>
                  <Typography variant="body2">Scan to Pay</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={finalizeUPI}
                  >
                    Paid → Generate Bill
                  </Button>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
              <Button fullWidth variant="contained" onClick={() => finalize(paymentMode)}>
                Generate Bill
              </Button>
            </Box>

            <Button
              color="error"
              sx={{ mt: 1 }}
              onClick={() => {
                if (!window.confirm("Clear cart?")) return;
                window.localStorage.removeItem(CART_KEY);
                window.location.reload();
              }}
            >
              Clear Cart
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}
