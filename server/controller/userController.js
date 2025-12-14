import { createUser } from "../models/User.js";

export const registerUser = async (req, res) => {
  const { fullname, username, password, role } = req.body;

  try {
    const id = await createUser(fullname, username, password, role);
    res.json({ success: true, message: "Worker added!", id });
  } catch (err) {
    console.error(err);
    
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    res.status(500).json({ success: false, message: "Registration failed" });
  }
};
