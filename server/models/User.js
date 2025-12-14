// server/models/User.js
import db from "../config/db.js";

/* =====================================================
   🧍 CREATE USER (with all details)
===================================================== */
export async function createUser(
  fullname,
  username,
  password,
  role = "staff",
  phone = null,
  email = null,
  address = null,
  aadhar_no = null,
  bank_name = null,
  account_no = null,
  ifsc_code = null
) {
  try {
    const [result] = await db.query(
      `INSERT INTO users 
       (fullname, username, password, role, sts, phone, email, address, aadhar_no, bank_name, account_no, ifsc_code, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        fullname,
        username,
        password,
        role,
        phone,
        email,
        address,
        aadhar_no,
        bank_name,
        account_no,
        ifsc_code,
      ]
    );
    return result.insertId;
  } catch (err) {
    console.error("DB ERROR (createUser):", err.message);
    throw new Error("Failed to create user");
  }
}

/* =====================================================
   🔍 FIND USER BY USERNAME (active users only)
===================================================== */
export async function findUserByUsername(username) {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND sts = 'active' LIMIT 1",
      [username]
    );
    return rows.length ? rows[0] : null;
  } catch (err) {
    console.error("DB ERROR (findUserByUsername):", err.message);
    throw new Error("Failed to find user");
  }
}

/* =====================================================
   👥 GET ALL USERS (Admin fetch)
===================================================== */
export async function getAllUsers() {
  try {
    const [rows] = await db.query(
      `SELECT id, fullname, username, role, phone, email, address, sts 
       FROM users 
       ORDER BY id DESC`
    );
    return rows;
  } catch (err) {
    console.error("DB ERROR (getAllUsers):", err.message);
    return []; // ⚙️ Prevent crashes if query fails
  }
}
