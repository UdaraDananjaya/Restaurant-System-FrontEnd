const pool = require("../config/db");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

/* ================= REQUEST RESET ================= */

exports.requestReset = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await pool.execute("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.json({ message: "If account exists, reset link sent." });
    }

    const user = users[0];

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.execute(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, expires],
    );

    // Normally send email — for now return token (DEV MODE)
    res.json({
      message: "Reset token generated",
      resetToken: rawToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reset request failed" });
  }
};

/* ================= RESET PASSWORD ================= */

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [rows] = await pool.execute(
      "SELECT * FROM password_resets WHERE token_hash = ? AND expires_at > NOW()",
      [tokenHash],
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const resetEntry = rows[0];

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      resetEntry.user_id,
    ]);

    await pool.execute("DELETE FROM password_resets WHERE id = ?", [
      resetEntry.id,
    ]);

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Password reset failed" });
  }
};
