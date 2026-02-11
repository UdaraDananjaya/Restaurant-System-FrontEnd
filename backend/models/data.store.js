/**
 * In-memory data store (Prototype / Academic Use)
 * -----------------------------------------------
 * Simulates persistent storage for the system.
 * Suitable for first-class academic demonstration.
 */

/* ================= USERS ================= */
const users = [
  {
    id: 1,
    name: "Admin",
    email: "admin@dinesmart.com",
    password: "Admin123",
    role: "ADMIN",
    status: "APPROVED",
  },
  {
    id: 2,
    name: "The Koththu Lab",
    email: "seller@dinesmart.com",
    password: "seller123",
    role: "SELLER",
    status: "APPROVED",
  },
  {
    id: 3,
    name: "Manumi Vinulya",
    email: "customer@dinesmart.com",
    password: "customer123",
    role: "CUSTOMER",
    status: "APPROVED",
  },
  {
    id: 4,
    name: "Pending Seller",
    email: "pending@dinesmart.com",
    password: "seller123",
    role: "SELLER",
    status: "PENDING",
  },
];

/* ================= RESTAURANTS ================= */
const restaurants = [
  {
    id: 1,
    name: "The Koththu Lab",
    sellerId: 2,
    status: "ACTIVE",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
  },
];

/* ================= MENU ITEMS (PORTION PRICING) ================= */
const menuItems = [
  {
    id: 1,
    restaurantId: 1,
    name: "Chicken Koththu",
    prices: {
      regular: 1200,
      large: 1500,
    },
    stock: 25,
    image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092",
    ordersCount: 35,
    isAvailable: true,
  },
  {
    id: 2,
    restaurantId: 1,
    name: "Cheese Koththu",
    prices: {
      regular: 1400,
      large: 1700,
    },
    stock: 18,
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
    ordersCount: 22,
    isAvailable: true,
  },
];

/* ================= ORDERS ================= */
const orders = [
  {
    id: 1,
    customerId: 3,
    restaurantId: 1,
    items: [
      {
        menuItemId: 1,
        portion: "regular",
        quantity: 2,
      },
    ],
    totalAmount: 2400,
    status: "COMPLETED",
    createdAt: new Date(),
  },
  {
    id: 2,
    customerId: 3,
    restaurantId: 1,
    items: [
      {
        menuItemId: 2,
        portion: "large",
        quantity: 1,
      },
    ],
    totalAmount: 1700,
    status: "COMPLETED",
    createdAt: new Date(),
  },
];

module.exports = {
  users,
  restaurants,
  menuItems,
  orders,
};
