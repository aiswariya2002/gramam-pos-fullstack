// server/routes/report.js
import express from "express";
import db from "../config/db.js";

const router = express.Router();

/* ============================================================
   ✅ 1. SALES SUMMARY (Daily / Monthly / Custom Range)
   ============================================================ */
router.get("/summary", async (req, res) => {
  const { mode, from, to } = req.query;
  let where = "";
  let params = [];

  // ✅ Timezone-safe comparison (MySQL UTC → IST)
  const dateExpr = "DATE(CONVERT_TZ(timestamp, '+00:00', '+05:30'))";
  const todayExpr = "DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30'))";

  if (mode === "range" && from && to) {
    where = `WHERE ${dateExpr} BETWEEN ? AND ?`;
    params = [from, to];
  } else if (mode === "daily") {
    where = `WHERE ${dateExpr} = ${todayExpr}`;
  } else if (mode === "monthly") {
    where = `WHERE MONTH(${dateExpr}) = MONTH(${todayExpr}) 
             AND YEAR(${dateExpr}) = YEAR(${todayExpr})`;
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT 
        COUNT(*) AS total_orders,
        COALESCE(SUM(subtotal), 0) AS subtotal_sum,
        COALESCE(SUM(gst), 0) AS gst_sum,
        COALESCE(SUM(total), 0) AS total_sum,
        COALESCE(SUM(CASE WHEN LOWER(paymentMode)='cash' THEN total ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN LOWER(paymentMode)='upi' THEN total ELSE 0 END), 0) AS upi_total
      FROM sales
      ${where}
      `,
      params
    );

    const summary = rows[0] || {
      total_orders: 0,
      subtotal_sum: 0,
      gst_sum: 0,
      total_sum: 0,
      cash_total: 0,
      upi_total: 0,
    };

    res.json({ success: true, summary });
  } catch (err) {
    console.error("🔥 REPORT SUMMARY ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   ✅ 2. BILLS LIST
   ============================================================ */
router.get("/bills", async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.json({ success: false, bills: [] });

  try {
    let [bills] = await db.query(
      `
      SELECT 
        id, billNo, invoiceId, timestamp, paymentMode,
        COALESCE(subtotal, 0) AS subtotal,
        COALESCE(gst, 0) AS gst,
        COALESCE(total, 0) AS total,
        products
      FROM sales
      WHERE DATE(CONVERT_TZ(timestamp, '+00:00', '+05:30')) BETWEEN ? AND ?
      ORDER BY timestamp DESC
      `,
      [from, to]
    );

    // ✅ Calculate subtotal/gst if missing
    bills = bills.map((b) => {
      try {
        const items = JSON.parse(b.products || "[]");
        if (items.length > 0 && (!b.subtotal || b.subtotal === 0)) {
          const sub = items.reduce(
            (sum, i) => sum + Number(i.price || 0) * Number(i.qty || 0),
            0
          );
          const gst = b.total > 0 ? b.total - sub : sub * 0.18;
          b.subtotal = sub;
          b.gst = gst;
        }
      } catch (err) {
        console.warn("⚠️ GST parse fallback:", err.message);
      }
      return b;
    });

    res.json({ success: true, bills });
  } catch (err) {
    console.error("🔥 REPORT BILLS ERROR:", err.message);
    res.status(500).json({ success: false, bills: [] });
  }
});

export default router;
