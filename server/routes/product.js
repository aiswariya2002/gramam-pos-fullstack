import express from "express";
import db from "../config/db.js";
import upload from "../config/uploadConfig.js";

const router = express.Router();

const DEFAULT_IMAGE = "/uploads/default.png";

/* ------------------------------------------------------
   🔹 CATEGORY ROUTE
------------------------------------------------------ */
router.get("/category", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT category 
      FROM product 
      WHERE category IS NOT NULL AND category != '' 
      ORDER BY category ASC
    `);

    const list = rows.map((r, i) => ({
      id: i + 1,
      name: r.category,
    }));

    res.json(list);
  } catch (err) {
    console.error("❌ Category fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to load categories" });
  }
});

/* ------------------------------------------------------
   🔹 GET ALL PRODUCTS
------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM product ORDER BY name ASC");
    const safeRows = rows.map((p) => ({
      ...p,
      image: p.image && p.image.trim() !== "" ? p.image : DEFAULT_IMAGE,
    }));
    res.json(safeRows);
  } catch (err) {
    console.error("❌ Fetch all products error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

/* ------------------------------------------------------
   🔹 GET SINGLE PRODUCT
------------------------------------------------------ */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM product WHERE id=?", [req.params.id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Product not found" });

    const product = rows[0];
    product.image = product.image || DEFAULT_IMAGE;
    res.json(product);
  } catch (err) {
    console.error("❌ Fetch single product error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

/* ------------------------------------------------------
   🔹 ADD PRODUCT
------------------------------------------------------ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    let { name, qty, stock, unit, category, price, barcode } = req.body;

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : DEFAULT_IMAGE;
    stock = Number(stock || 0);
    price = Number(price || 0);
    barcode = barcode?.trim() || "";

    // Auto-generate barcode if missing
    if (!barcode) {
      barcode = "9" + Date.now().toString().slice(-12);
      let exists = true;
      while (exists) {
        const [dup] = await db.query("SELECT id FROM product WHERE barcode=?", [barcode]);
        if (dup.length === 0) exists = false;
        else barcode = "9" + Date.now().toString().slice(-12);
      }
    }

    const [result] = await db.query(
      `INSERT INTO product 
       (name, qty, stock, unit, category, price, image, barcode, status)
       VALUES (?,?,?,?,?,?,?,?, 'active')`,
      [name, qty, stock, unit, category, price, fileUrl, barcode]
    );

    res.json({
      success: true,
      id: result.insertId,
      image: fileUrl,
      barcode,
      status: "active",
    });
  } catch (err) {
    console.error("❌ Insert product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------
   🔹 UPDATE PRODUCT
   🚫 Never delete old image
   ✅ Only change when new one uploaded
------------------------------------------------------ */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    let { name, qty, stock, unit, category, price, barcode, oldImage } = req.body;

    const newImage = req.file
      ? `/uploads/${req.file.filename}`
      : oldImage && oldImage.trim() !== ""
      ? oldImage
      : DEFAULT_IMAGE;

    // 🚫 Don’t delete the previous image from folder
    // Just update DB with new path if needed

    await db.query(
      `UPDATE product 
       SET name=?, qty=?, stock=?, unit=?, category=?, price=?, image=?, barcode=? 
       WHERE id=?`,
      [name, qty, stock, unit, category, price, newImage, barcode, req.params.id]
    );

    res.json({ success: true, image: newImage });
  } catch (err) {
    console.error("❌ Update product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------
   🔹 SOFT DELETE (no file deletion)
------------------------------------------------------ */
router.put("/delete/:id", async (req, res) => {
  try {
    await db.query("UPDATE product SET status='deleted' WHERE id=?", [req.params.id]);
    res.json({ success: true, id: req.params.id, status: "deleted" });
  } catch (err) {
    console.error("❌ Delete product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------
   🔹 RESTORE
------------------------------------------------------ */
router.put("/restore/:id", async (req, res) => {
  try {
    await db.query("UPDATE product SET status='active' WHERE id=?", [req.params.id]);
    res.json({ success: true, id: req.params.id, status: "active" });
  } catch (err) {
    console.error("❌ Restore product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ------------------------------------------------------
   🔹 BARCODE LIST
------------------------------------------------------ */
router.get("/barcodes/auto", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, qty, price, barcode, image
      FROM product
      WHERE status='active' 
        AND barcode IS NOT NULL 
        AND barcode != ''
      ORDER BY id DESC
    `);

    const safeRows = rows.map((p) => ({
      ...p,
      image: p.image && p.image.trim() !== "" ? p.image : DEFAULT_IMAGE,
    }));

    res.json(safeRows);
  } catch (err) {
    console.error("❌ Barcode list fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch barcodes" });
  }
});

export default router;
