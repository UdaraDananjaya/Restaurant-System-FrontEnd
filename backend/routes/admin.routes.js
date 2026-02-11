const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

const admin = require("../controllers/admin.controller");

/* ================= USERS ================= */

router.get("/users", verifyToken, checkRole(["ADMIN"]), admin.getUsers);
router.put(
  "/users/:id/approve",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.approveSeller,
);
router.put(
  "/users/:id/suspend",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.suspendUser,
);
router.put(
  "/users/:id/reactivate",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.reactivateUser,
);

/* ================= ANALYTICS ================= */

router.get("/analytics", verifyToken, checkRole(["ADMIN"]), admin.analytics);
router.get("/orders", verifyToken, checkRole(["ADMIN"]), admin.getAllOrders);
router.get("/logs", verifyToken, checkRole(["ADMIN"]), admin.getLogs);

/* ================= CSV EXPORT ================= */

router.get(
  "/export/users",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.exportUsersCSV,
);
router.get(
  "/export/orders",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.exportOrdersCSV,
);
router.get(
  "/export/logs",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.exportLogsCSV,
);

router.get(
  "/revenue-trend",
  verifyToken,
  checkRole(["ADMIN"]),
  admin.monthlyRevenue,
);

module.exports = router;
