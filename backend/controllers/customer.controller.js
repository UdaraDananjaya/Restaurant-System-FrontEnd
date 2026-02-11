const db = require("../models/data.store");
const recommendationService = require("../services/recommendation.service");

/**
 * Get all restaurants
 */
exports.getRestaurants = (req, res) => {
  res.json(db.restaurants);
};

/**
 * Get restaurant menu (FROM menuItems)
 */
exports.getRestaurantMenu = (req, res) => {
  const restaurantId = Number(req.params.id);

  const menu = db.menuItems.filter(
    (m) => m.restaurantId === restaurantId && m.isAvailable,
  );

  res.json(menu);
};

/**
 * Place order (FIXED ITEM STRUCTURE)
 */
exports.placeOrder = (req, res) => {
  const { restaurantId, items } = req.body;

  const restaurant = db.restaurants.find((r) => r.id === Number(restaurantId));
  if (!restaurant) {
    return res.status(404).json({ message: "Restaurant not found" });
  }

  const enrichedItems = items.map((item) => {
    const menuItem = db.menuItems.find((m) => m.id === Number(item.menuItemId));

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    menuItem.ordersCount += item.qty;

    return {
      name: menuItem.name, // 🔥 FIXED
      portion: item.portion,
      qty: item.qty,
    };
  });

  const order = {
    id: db.orders.length + 1,
    customerId: req.user.id,
    sellerId: restaurant.sellerId,
    restaurantId: restaurant.id,
    items: enrichedItems,
    status: "PENDING",
    createdAt: new Date(),
    total: 0,
  };

  db.orders.push(order);

  res.json({ message: "Order placed successfully", order });
};

/**
 * Customer orders
 */
exports.getOrders = (req, res) => {
  res.json(db.orders.filter((o) => o.customerId === req.user.id));
};

/**
 * Recommendations
 */
exports.getRecommendations = (req, res) => {
  const recommendations = recommendationService(req.user, db.restaurants);
  res.json(recommendations);
};
