const pool = require("../config/db");

const logAdminAction = async (adminId, action, targetUserId = null) => {
  try {
    await pool.execute(
      "INSERT INTO admin_logs (admin_id, action, target_user_id) VALUES (?, ?, ?)",
      [adminId, action, targetUserId],
    );
  } catch (err) {
    console.error("Admin log failed:", err.message);
  }
};

module.exports = logAdminAction;
