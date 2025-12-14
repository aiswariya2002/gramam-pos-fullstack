import { findUserByUsername, verifyPassword } from "../models/User.js";

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await findUserByUsername(username);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const match = await verifyPassword(password, user.password);

    if (!match)
      return res.status(401).json({ success: false, message: "Wrong password" });

    delete user.password;

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};
