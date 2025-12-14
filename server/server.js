// ✅ server.js — Gramam POS Backend (Default Image Auto-Creation + HTTPS + PWA Ready)

import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import http from "http";
import https from "https";
import os from "os";

// ==============================
// ✅ Local Imports
// ==============================
import pool from "./config/db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/product.js";
import salesRoutes from "./routes/sales.js";
import reportRoutes from "./routes/report.js";
import shopRoutes from "./routes/shop.js";

// ==============================
// ✅ Express Setup
// ==============================
const app = express();
app.locals.db = pool;

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// ✅ Detect Local Wi-Fi IP (for mobile access)
// ==============================
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}
const localIP = getLocalIP();
console.log(`🌐 Local IP Detected: ${localIP}`);

// ==============================
// ✅ Middleware
// ==============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Dynamic CORS to support localhost + LAN (mobile)
app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "https://localhost:5443",
        "http://localhost:5000",
        `https://${localIP}:5443`,
        `http://${localIP}:5000`,
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
      ];
      if (!origin || allowed.some((url) => origin.startsWith(url))) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    secret: "gramam_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// ==============================
// ✅ Static Files (Uploads + PWA Frontend)
// ==============================

// ✅ Serve uploaded images safely (persistent folder)
const uploadsPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

// ✅ Auto-create default.png if missing
const defaultImgPath = path.join(uploadsPath, "default.png");
if (!fs.existsSync(defaultImgPath)) {
  console.log("⚙️ Creating missing default.png automatically...");
  const placeholderBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAPYQAAD2EBqD+naQAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAEiSURBVHic7dExAQAwEAOh+jedhR8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgFPxkAAZSczQAAAABJRU5ErkJggg==";
  fs.writeFileSync(defaultImgPath, Buffer.from(placeholderBase64, "base64"));
  console.log("✅ default.png created at /uploads/default.png");
}

app.use("/uploads", express.static(uploadsPath));
console.log("🖼️ Uploads served from:", uploadsPath);

// ✅ Serve built React PWA (dist folder)
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Explicitly serve service worker + manifest for PWA
app.get(["/sw.js", "/manifest.webmanifest"], (req, res) => {
  res.sendFile(path.join(distPath, req.path));
});

// ==============================
// ✅ API Routes
// ==============================
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/shop", shopRoutes);

// ==============================
// ✅ React Router Fallback (SPA support)
// ==============================
app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ==============================
// ✅ SSL Certificate (Auto Self-Signed)
// ==============================
const HTTP_PORT = 5000;
const HTTPS_PORT = 5443;
const sslDir = path.join(process.cwd(), "certs");

if (!fs.existsSync(sslDir)) fs.mkdirSync(sslDir);

const keyPath = path.join(sslDir, "key.pem");
const certPath = path.join(sslDir, "cert.pem");

let sslOptions;

try {
  let regenerate = false;
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) regenerate = true;

  if (regenerate) {
    console.log("⚙️ Generating self-signed SSL certificate (auto)...");
    const selfsigned = await import("selfsigned");
    const pems = selfsigned.default.generate(
      [
        { name: "commonName", value: localIP },
        { name: "organizationName", value: "Gramam POS" },
      ],
      { days: 365 }
    );
    fs.writeFileSync(keyPath, pems.private, "utf8");
    fs.writeFileSync(certPath, pems.cert, "utf8");
  }

  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} catch (err) {
  console.error("❌ SSL setup failed:", err.message);
}

// ==============================
// ✅ Start Servers (HTTP + HTTPS)
// ==============================
http.createServer(app).listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`🚀 HTTP  server  → http://localhost:${HTTP_PORT}`);
  console.log(`📱 Phone (HTTP) → http://${localIP}:${HTTP_PORT}`);
});

if (sslOptions) {
  https.createServer(sslOptions, app).listen(HTTPS_PORT, "0.0.0.0", () => {
    console.log(`🔒 HTTPS server → https://localhost:${HTTPS_PORT}`);
    console.log(`📱 Phone (HTTPS) → https://${localIP}:${HTTPS_PORT}`);
  });
} else {
  console.warn("⚠️ HTTPS not started — certificate missing");
}
