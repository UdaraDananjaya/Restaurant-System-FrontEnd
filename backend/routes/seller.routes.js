const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

const seller = require("../controllers/seller.controller");

/* ================= RESTAURANT ================= */
router.get(
  "/restaurant",
  verifyToken,
  checkRole(["SELLER"]),
  seller.getRestaurant,
);

/* ================= MENU ================= */
router.get("/menu", verifyToken, checkRole(["SELLER"]), seller.getMenu);

router.post(
  "/menu",
  verifyToken,
  checkRole(["SELLER"]),
  upload.single("image"),
  seller.addMenuItem,
);

router.put(
  "/menu/:id",
  verifyToken,
  checkRole(["SELLER"]),
  upload.single("image"),
  seller.updateMenuItem,
);

router.delete(
  "/menu/:id",
  verifyToken,
  checkRole(["SELLER"]),
  seller.deleteMenuItem,
);

/* ================= ORDERS ================= */
router.get("/orders", verifyToken, checkRole(["SELLER"]), seller.getOrders);

router.put(
  "/orders/:id/status",
  verifyToken,
  checkRole(["SELLER"]),
  seller.updateOrderStatus,
);

/* ================= ANALYTICS ================= */
router.get(
  "/analytics",
  verifyToken,
  checkRole(["SELLER"]),
  seller.getAnalytics,
);

router.get("/forecast", verifyToken, checkRole(["SELLER"]), seller.getForecast);

module.exports = router;
