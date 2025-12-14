import express from "express";
import db from "../config/db.js";
import upload from "../config/uploadConfig.js";
import fs from "fs";
import path from "path";

const router = express.Router();

/**
 * ✅ Normalize file URL so it never gets double-prefix like
 * https://host/uploads/https://host/uploads/file.jpg
 */
const buildFileUrl = (req, filenameOrUrl) => {
  if (!filenameOrUrl) return null;
  if (filenameOrUrl.startsWith("http")) return filenameOrUrl; // already full URL
  return `${req.protocol}://${req.get("host")}/uploads/${filenameOrUrl}`;
};

/**
 * ✅ Return full URL for uploaded file
 */
const getFileUrl = (req, file) =>
  file ? `${req.protocol}://${req.get("host")}/uploads/${file.filename}` : null;

// 🟢 Fetch current shop info
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM shop WHERE id=1");

    if (rows[0]) {
      // normalize URL just in case old data missing prefix
      const shop = {
        ...rows[0],
        logo: buildFileUrl(req, rows[0].logo),
        upi_qr: buildFileUrl(req, rows[0].upi_qr),
      };
      res.json({ success: true, shop });
    } else {
      res.json({ success: true, shop: null });
    }
  } catch (err) {
    console.error("❌ Shop fetch failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🟢 Create / Update shop info + logo + QR
router.post(
  "/",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "upi_qr", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, license, oldLogo, oldQR } = req.body;
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });

      // ✅ Detect if new files uploaded
      const newLogoUrl = req.files?.logo?.[0] ? getFileUrl(req, req.files.logo[0]) : null;
      const newQRUrl = req.files?.upi_qr?.[0] ? getFileUrl(req, req.files.upi_qr[0]) : null;

      // ✅ Decide which URLs to keep
      const logoUrl = newLogoUrl || buildFileUrl(req, oldLogo) || null;
      const qrUrl = newQRUrl || buildFileUrl(req, oldQR) || null;

      // ✅ Delete old files if replaced
      const removeFile = (url) => {
        if (!url || url.startsWith("http") === false) return;
        const filePath = path.join(process.cwd(), "uploads", path.basename(url));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Deleted old file:", filePath);
        }
      };
      if (newLogoUrl && oldLogo && oldLogo !== newLogoUrl) removeFile(oldLogo);
      if (newQRUrl && oldQR && oldQR !== newQRUrl) removeFile(oldQR);

      // ✅ Save / Update record
      await db.query(
        `INSERT INTO shop (id, name, license, logo, upi_qr)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           license = VALUES(license),
           logo = VALUES(logo),
           upi_qr = VALUES(upi_qr)`,
        [name, license || null, logoUrl, qrUrl]
      );

      // ✅ Fetch latest saved row
      const [rows] = await db.query("SELECT * FROM shop WHERE id=1");
      const shop = {
        ...rows[0],
        logo: buildFileUrl(req, rows[0].logo),
        upi_qr: buildFileUrl(req, rows[0].upi_qr),
      };

      res.json({ success: true, shop });
    } catch (err) {
      console.error("❌ Shop save failed:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
