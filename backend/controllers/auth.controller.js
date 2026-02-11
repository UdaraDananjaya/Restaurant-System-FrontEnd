const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================================================= */
/* ================= LOGIN ========================= */
/* ================================================= */

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    /* 🔎 1. Check user exists */
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    /* 🔐 2. Check password first */
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* 🚦 3. Check account status */
    if (user.status === "PENDING") {
      return res.status(403).json({
        message: "Your account is waiting for admin approval.",
      });
    }

    if (user.status === "REJECTED") {
      return res.status(403).json({
        message: "Your registration was rejected by admin.",
      });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        message: "Your account has been suspended. Contact admin.",
      });
    }

    /* ✅ Only APPROVED users reach here */

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      id: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

/* ================================================= */
/* ================= REGISTER ====================== */
/* ================================================= */

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    /* 🧾 1. Validate input */
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    /* 🔎 2. Check if email already exists */
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    /* 🔐 3. Hash password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* 🚦 4. Set default status */
    const status = role === "SELLER" ? "PENDING" : "APPROVED";

    /* 💾 5. Insert user */
    await pool.execute(
      `INSERT INTO users (name, email, password, role, status)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, status],
    );

    /* 🎯 6. Send response */
    res.status(201).json({
      message:
        role === "SELLER"
          ? "Seller registered successfully. Awaiting admin approval."
          : "Customer registered successfully.",
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};
