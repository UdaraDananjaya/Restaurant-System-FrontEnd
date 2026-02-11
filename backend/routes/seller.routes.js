const express = require("express");
const router = express.Router();

/* ================= MIDDLEWARE ================= */
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

/* ================= CONTROLLER ================= */
const sellerController = require("../controllers/seller.controller");

/* ================================================= */
/* ================= RESTAURANT ==================== */
/* ================================================= */

router.get(
  "/restaurant",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.getRestaurant,
);

/* ================================================= */
/* ================= MENU MANAGEMENT =============== */
/* ================================================= */

/* Get Menu */
router.get(
  "/menu",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.getMenu,
);

/* Add Menu Item */
router.post(
  "/menu",
  verifyToken,
  checkRole(["SELLER"]),
  upload.single("image"),
  sellerController.addMenuItem,
);

/* Update Menu Item */
router.put(
  "/menu/:id",
  verifyToken,
  checkRole(["SELLER"]),
  upload.single("image"),
  sellerController.updateMenuItem,
);

/* Delete Menu Item */
router.delete(
  "/menu/:id",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.deleteMenuItem,
);

/* ================================================= */
/* ================= ORDER MANAGEMENT ============== */
/* ================================================= */

/* Get Orders */
router.get(
  "/orders",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.getOrders,
);

/* Update Order Status */
router.put(
  "/orders/:id/status",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.updateOrderStatus,
);

/* ================================================= */
/* ================= ANALYTICS ===================== */
/* ================================================= */

/* Basic Analytics */
router.get(
  "/analytics",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.getAnalytics,
);

/* Forecast (Future ML Integration Ready) */
router.get(
  "/forecast",
  verifyToken,
  checkRole(["SELLER"]),
  sellerController.getForecast,
);

module.exports = router;
