// server/routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import db from "../config/db.js"; // ✅ Use global DB pool directly
import { createUser, findUserByUsername, getAllUsers } from "../models/User.js";

const router = express.Router();

/* =====================================================
   🧍 REGISTER (Admin adds worker or staff)
===================================================== */
router.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      username,
      password,
      role = "staff",
      phone,
      email,
      address,
      aadhar_no,
      bank_name,
      account_no,
      ifsc_code,
    } = req.body;

    if (!fullname || !username || !password)
      return res.status(400).json({
        success: false,
        message: "Fullname, username, and password are required.",
      });

    const existing = await findUserByUsername(username);
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Username already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const id = await createUser(
      fullname,
      username,
      hashedPassword,
      role,
      phone,
      email,
      address,
      aadhar_no,
      bank_name,
      account_no,
      ifsc_code
    );

    res.json({ success: true, message: "User registered successfully.", id });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error while registering user.",
    });
  }
});

/* =====================================================
   🔐 LOGIN (Supports old + new password formats)
===================================================== */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });

    const user = await findUserByUsername(username);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    if (user.sts !== "active")
      return res
        .status(403)
        .json({ success: false, message: "Account inactive. Contact admin." });

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch {
      isMatch = false;
    }

    // 🔁 Legacy plain-text password auto-upgrade
    if (!isMatch && password === user.password) {
      console.log(`⚠️ Old plain password detected for: ${username}`);
      try {
        const hashed = await bcrypt.hash(password, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [
          hashed,
          user.id,
        ]);
        console.log(`✅ Password auto-hashed and updated for: ${username}`);
      } catch (updateErr) {
        console.error("Password auto-hash update failed:", updateErr);
      }
      isMatch = true;
    }

    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password." });

    res.json({
      success: true,
      user: {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        phone: user.phone,
        email: user.email,
        address: user.address,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while logging in." });
  }
});

/* =====================================================
   👥 GET ALL USERS (Admin only)
===================================================== */
router.get("/all", async (req, res) => {
  try {
    const users = await getAllUsers();

    const safeUsers = users.map((u) => ({
      id: u.id,
      fullname: u.fullname,
      username: u.username,
      role: u.role,
      phone: u.phone,
      email: u.email,
      address: u.address,
      sts: u.sts,
    }));

    res.json({ success: true, users: safeUsers });
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch user list." });
  }
});

/* =====================================================
   ✏️ UPDATE USER DETAILS
===================================================== */
router.put("/update/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const {
      fullname,
      role,
      phone,
      email,
      address,
      password,
      aadhar_no,
      bank_name,
      account_no,
      ifsc_code,
    } = req.body;

    // Check user existence
    const [existing] = await db.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    if (!existing.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const fields = [];
    const values = [];

    // Dynamically build query
    if (fullname) {
      fields.push("fullname=?");
      values.push(fullname);
    }
    if (role) {
      fields.push("role=?");
      values.push(role);
    }
    if (phone) {
      fields.push("phone=?");
      values.push(phone);
    }
    if (email) {
      fields.push("email=?");
      values.push(email);
    }
    if (address) {
      fields.push("address=?");
      values.push(address);
    }
    if (aadhar_no) {
      fields.push("aadhar_no=?");
      values.push(aadhar_no);
    }
    if (bank_name) {
      fields.push("bank_name=?");
      values.push(bank_name);
    }
    if (account_no) {
      fields.push("account_no=?");
      values.push(account_no);
    }
    if (ifsc_code) {
      fields.push("ifsc_code=?");
      values.push(ifsc_code);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push("password=?");
      values.push(hashedPassword);
    }

    if (fields.length === 0)
      return res.json({
        success: false,
        message: "No fields provided for update.",
      });

    values.push(username);
    const sql = `UPDATE users SET ${fields.join(", ")} WHERE username=?`;
    await db.query(sql, values);

    res.json({ success: true, message: "User updated successfully." });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update user." });
  }
});

/* =====================================================
   ❌ DELETE USER
===================================================== */
router.delete("/delete/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await db.query("DELETE FROM users WHERE username = ?", [
      username,
    ]);

    if (rows.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete user." });
  }
});

export default router;
