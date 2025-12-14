// server/routes/sales.js
import express from "express";
import db from "../config/db.js";

const router = express.Router();

/* ============================================================
   ✅ CREATE SALE (from Sales.jsx or offline sync)
   ============================================================ */
router.post("/", async (req, res) => {
  try {
    const sale = req.body;

    // 🧩 Basic validation
    if (!sale || !sale.invoiceId) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid sale data received" });
    }

    // 🧾 Log full sale details for debugging
    console.log("📩 Incoming sale from client:");
    console.log(JSON.stringify(sale, null, 2));

    // 🧠 Ensure `items` field is safe JSON
    let productsJSON = "[]";
    try {
      productsJSON = JSON.stringify(sale.items || []);
    } catch (e) {
      console.warn("⚠️ Failed to stringify sale.items:", e.message);
    }

    // 🕒 Ensure valid timestamp
  const timestamp =
  sale.timestamp && !isNaN(Date.parse(sale.timestamp))
    ? new Date(sale.timestamp).toISOString().slice(0, 19).replace("T", " ")
    : new Date().toISOString().slice(0, 19).replace("T", " ");

    // 🗃️ Attempt to insert into MySQL
    const [result] = await db.execute(
      `INSERT INTO sales 
       (billNo, invoiceId, timestamp, products, subtotal, discount, gst, total, paymentMode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.billNo || 0,
        sale.invoiceId,
        timestamp,
        productsJSON,
        Number(sale.subtotal) || 0,
        Number(sale.discount) || 0,
        Number(sale.gst) || 0,
        Number(sale.total) || 0,
        sale.paymentMode || "Cash",
      ]
    );

    console.log("✅ MySQL insert success → ID:", result.insertId);
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("🔥 SALE INSERT ERROR:", err);

    // send detailed response to client
    res.status(500).json({
      success: false,
      message: "Failed to insert sale record",
      error: err.message || "Unknown server error",
    });
  }
});

/* ============================================================
   ✅ GET ALL SALES (optional ?date=YYYY-MM-DD)
   ============================================================ */
router.get("/", async (req, res) => {
  const { date } = req.query;

  try {
    let query = `
      SELECT id, billNo, invoiceId, timestamp, subtotal, gst, total, paymentMode
      FROM sales
    `;
    const params = [];

    if (date) {
      query += ` WHERE DATE(timestamp) = ?`;
      params.push(date);
    }

    query += ` ORDER BY timestamp DESC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("🔥 GET SALES ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to load sales data",
      error: err.message,
    });
  }
});

/* ============================================================
   ✅ DAILY SUMMARY
   ============================================================ */
router.get("/summary/daily", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE(timestamp) AS sale_date,
        COUNT(*) AS total_bills,
        SUM(total) AS total_sales,
        SUM(CASE WHEN paymentMode='Cash' THEN total ELSE 0 END) AS cash_total,
        SUM(CASE WHEN paymentMode='UPI' THEN total ELSE 0 END) AS upi_total
      FROM sales
      GROUP BY DATE(timestamp)
      ORDER BY sale_date DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) {
    console.error("🔥 DAILY SUMMARY ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   ✅ MONTHLY SUMMARY
   ============================================================ */
router.get("/summary/monthly", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m') AS month,
        COUNT(*) AS total_bills,
        SUM(total) AS total_sales,
        SUM(CASE WHEN paymentMode='Cash' THEN total ELSE 0 END) AS cash_total,
        SUM(CASE WHEN paymentMode='UPI' THEN total ELSE 0 END) AS upi_total
      FROM sales
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(rows);
  } catch (err) {
    console.error("🔥 MONTHLY SUMMARY ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   ✅ GET SINGLE SALE BY ID
   ============================================================ */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(`SELECT * FROM sales WHERE id = ?`, [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found" });

    const sale = rows[0];
    try {
      sale.products = JSON.parse(sale.products || "[]");
    } catch {
      sale.products = [];
    }
    res.json(sale);
  } catch (err) {
    console.error("🔥 GET SALE ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
