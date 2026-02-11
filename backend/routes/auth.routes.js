const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/auth.controller");
const passwordController = require("../controllers/password.controller");

/* ================= LOGIN RATE LIMIT ================= */
const loginLimiter = rateLimit({
  // windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ================= RESET RATE LIMIT ================= */
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many reset attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ================= AUTH ROUTES ================= */

router.post("/login", loginLimiter, authController.login);
router.post("/register", authController.register);

/* ================= PASSWORD RESET ================= */

router.post("/request-reset", resetLimiter, passwordController.requestReset);
router.post("/reset-password", resetLimiter, passwordController.resetPassword);

module.exports = router;
