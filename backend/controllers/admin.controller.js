const pool = require("../config/db");
const logAdminAction = require("../utils/adminLogger");
const { Parser } = require("json2csv");

/* ================= USERS ================= */

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, status, created_at FROM users",
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* ================= APPROVE SELLER ================= */

exports.approveSeller = async (req, res) => {
  try {
    const sellerId = req.params.id;

    const [result] = await pool.execute(
      "UPDATE users SET status='APPROVED' WHERE id=? AND role='SELLER'",
      [sellerId],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    await logAdminAction(req.user.id, "Approved Seller", sellerId);

    res.json({ message: "Seller approved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approval failed" });
  }
};

/* ================= REJECT SELLER ================= */

exports.rejectSeller = async (req, res) => {
  try {
    const sellerId = req.params.id;

    const [result] = await pool.execute(
      "UPDATE users SET status='REJECTED' WHERE id=? AND role='SELLER'",
      [sellerId],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Seller not found" });

    await logAdminAction(req.user.id, "Rejected Seller", sellerId);

    res.json({ message: "Seller rejected successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reject failed" });
  }
};

/* ================= SUSPEND USER ================= */

exports.suspendUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const [result] = await pool.execute(
      "UPDATE users SET status='SUSPENDED' WHERE id=?",
      [userId],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found" });

    await logAdminAction(req.user.id, "Suspended User", userId);

    res.json({ message: "User suspended successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Suspend failed" });
  }
};

/* ================= REACTIVATE USER ================= */

exports.reactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const [result] = await pool.execute(
      "UPDATE users SET status='APPROVED' WHERE id=?",
      [userId],
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "User not found" });

    await logAdminAction(req.user.id, "Reactivated User", userId);

    res.json({ message: "User reactivated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Reactivate failed" });
  }
};

/* ================= ANALYTICS ================= */

exports.analytics = async (req, res) => {
  try {
    const [[users]] = await pool.execute("SELECT COUNT(*) AS count FROM users");
    const [[restaurants]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM restaurants",
    );
    const [[orders]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM orders",
    );

    res.json({
      totalUsers: users.count,
      totalRestaurants: restaurants.count,
      totalOrders: orders.count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
};

/* ================= ALL ORDERS ================= */

exports.getAllOrders = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        o.id,
        o.status,
        o.total_amount,
        o.created_at,
        u.email AS customerEmail,
        r.name AS restaurantName,
        s.email AS sellerEmail
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users s ON r.seller_id = s.id
      ORDER BY o.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

/* ================= ADMIN LOGS ================= */

exports.getLogs = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        l.id,
        l.action,
        l.created_at,
        a.email AS adminEmail,
        u.email AS targetUserEmail
      FROM admin_logs l
      LEFT JOIN users a ON l.admin_id = a.id
      LEFT JOIN users u ON l.target_user_id = u.id
      ORDER BY l.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};

/* ================= CSV EXPORTS ================= */

/* Export Users CSV */
exports.exportUsersCSV = async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, role, status, created_at FROM users",
    );

    const parser = new Parser();
    const csv = parser.parse(users);

    res.header("Content-Type", "text/csv");
    res.attachment("users.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Users CSV export failed" });
  }
};

/* Export Orders CSV */
exports.exportOrdersCSV = async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT 
        o.id,
        o.status,
        o.total_amount,
        o.created_at,
        u.email AS customerEmail,
        r.name AS restaurantName,
        s.email AS sellerEmail
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN users s ON r.seller_id = s.id
    `);

    const parser = new Parser();
    const csv = parser.parse(orders);

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Orders CSV export failed" });
  }
};

/* Export Logs CSV */
exports.exportLogsCSV = async (req, res) => {
  try {
    const [logs] = await pool.execute(`
      SELECT 
        l.id,
        l.action,
        l.created_at,
        a.email AS adminEmail,
        u.email AS targetUserEmail
      FROM admin_logs l
      LEFT JOIN users a ON l.admin_id = a.id
      LEFT JOIN users u ON l.target_user_id = u.id
    `);

    const parser = new Parser();
    const csv = parser.parse(logs);

    res.header("Content-Type", "text/csv");
    res.attachment("admin_logs.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Logs CSV export failed" });
  }
};

/* ================= MONTHLY REVENUE TREND ================= */

exports.monthlyRevenue = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(total_amount) AS revenue
      FROM orders
      WHERE status = 'COMPLETED'
      GROUP BY month
      ORDER BY month ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Revenue trend failed" });
  }
};
