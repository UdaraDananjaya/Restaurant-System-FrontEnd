module.exports = (orders) => {
  if (!orders.length) return 0;
  return Math.round(orders.length / 7);
};
