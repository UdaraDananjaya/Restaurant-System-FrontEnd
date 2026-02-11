const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

const customerController = require("../controllers/customer.controller");

/* =========================
   CUSTOMER ROUTES
   ========================= */

/**
 * View all available restaurants
 */
router.get(
  "/restaurants",
  verifyToken,
  checkRole(["CUSTOMER"]),
  customerController.getRestaurants,
);

/**
 * View menu of a restaurant
 */
router.get(
  "/restaurants/:id/menu",
  verifyToken,
  checkRole(["CUSTOMER"]),
  customerController.getRestaurantMenu,
);

/**
 * Place an order
 */
router.post(
  "/order",
  verifyToken,
  checkRole(["CUSTOMER"]),
  customerController.placeOrder,
);

/**
 * View order history
 */
router.get(
  "/orders",
  verifyToken,
  checkRole(["CUSTOMER"]),
  customerController.getOrders,
);

/**
 * Personalized restaurant recommendations
 */
router.get(
  "/recommendations",
  verifyToken,
  checkRole(["CUSTOMER"]),
  customerController.getRecommendations,
);

module.exports = router;
