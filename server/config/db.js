import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); // Load .env or Render environment variables

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gramam",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

try {
  const conn = await pool.getConnection();
  console.log("✅ MySQL connected successfully (config/db.js)");
  conn.release();
} catch (err) {
  console.error("❌ MySQL connection failed:", err.message);
}

export default pool;
