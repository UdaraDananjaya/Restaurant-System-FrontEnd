const pool = require("../config/db");

/* ================= RESTAURANT ================= */

exports.getRestaurant = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM restaurants WHERE seller_id = ?",
      [req.user.id],
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch restaurant" });
  }
};

/* ================= MENU ================= */

exports.getMenu = async (req, res) => {
  try {
    const [restaurant] = await pool.execute(
      "SELECT id FROM restaurants WHERE seller_id = ?",
      [req.user.id],
    );

    if (restaurant.length === 0) return res.json([]);

    const [menu] = await pool.execute(
      "SELECT * FROM menu_items WHERE restaurant_id = ?",
      [restaurant[0].id],
    );

    res.json(menu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch menu" });
  }
};

exports.addMenuItem = async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    const [restaurant] = await pool.execute(
      "SELECT id FROM restaurants WHERE seller_id = ?",
      [req.user.id],
    );

    if (restaurant.length === 0) {
      return res.status(400).json({ message: "Restaurant not found" });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.execute(
      `INSERT INTO menu_items 
       (restaurant_id, name, price, stock, image, is_available)
       VALUES (?, ?, ?, ?, ?, true)`,
      [restaurant[0].id, name, Number(price), Number(stock), imagePath],
    );

    res.json({ message: "✅ Menu item added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add menu item" });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { name, price, stock, isAvailable } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.execute(
      `UPDATE menu_items SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        stock = COALESCE(?, stock),
        is_available = COALESCE(?, is_available),
        image = COALESCE(?, image)
       WHERE id = ?`,
      [name, price, stock, isAvailable, imagePath, req.params.id],
    );

    res.json({ message: "✅ Menu item updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update menu item" });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    await pool.execute("DELETE FROM menu_items WHERE id = ?", [req.params.id]);

    res.json({ message: "✅ Menu item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete menu item" });
  }
};

/* ================= ORDERS ================= */

exports.getOrders = async (req, res) => {
  try {
    const [restaurant] = await pool.execute(
      "SELECT id FROM restaurants WHERE seller_id = ?",
      [req.user.id],
    );

    if (restaurant.length === 0) return res.json([]);

    const [orders] = await pool.execute(
      "SELECT * FROM orders WHERE restaurant_id = ?",
      [restaurant[0].id],
    );

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [
      req.body.status,
      req.params.id,
    ]);

    res.json({ message: "✅ Order status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update order" });
  }
};

/* ================= ANALYTICS ================= */

exports.getAnalytics = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT name, stock 
       FROM menu_items 
       WHERE restaurant_id = (
         SELECT id FROM restaurants WHERE seller_id = ?
       )`,
      [req.user.id],
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
};

exports.getForecast = (req, res) => {
  // Placeholder (can replace with ML later)
  res.json([
    { day: "Mon", orders: 10 },
    { day: "Tue", orders: 14 },
    { day: "Wed", orders: 18 },
    { day: "Thu", orders: 22 },
    { day: "Fri", orders: 28 },
    { day: "Sat", orders: 35 },
    { day: "Sun", orders: 30 },
  ]);
};
