const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const seedAdmin = async () => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE role = 'ADMIN'",
    );

    if (rows.length > 0) {
      console.log("ℹ️ Admin already exists – skipping seed");
      return;
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    await pool.execute(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)",
      [
        "System Admin",
        "admin@restaurant.com",
        hashedPassword,
        "ADMIN",
        "APPROVED",
      ],
    );

    console.log("🔥 Admin seeded successfully");
  } catch (err) {
    console.error("Admin seed error:", err);
  }
};

module.exports = seedAdmin;
