import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import api from "../../api/api";
import "./SellerDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

const SellerDashboard = () => {
  const [tab, setTab] = useState("OVERVIEW");
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [forecast, setForecast] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [menuForm, setMenuForm] = useState({
    name: "",
    price: "",
    stock: "",
    imageFile: null,
  });

  /* ================= LOAD DATA ================= */

  const loadAll = async () => {
    const r = await api.get("/seller/restaurant");
    const m = await api.get("/seller/menu");
    const o = await api.get("/seller/orders");
    const a = await api.get("/seller/analytics");
    const f = await api.get("/seller/forecast");

    setRestaurant(r.data);
    setMenu(m.data);
    setOrders(o.data);
    setAnalytics(a.data);
    setForecast(f.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ================= DERIVED ================= */

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
  );

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const lowStockItems = menu.filter((m) => m.stock <= 5);

  /* ================= MENU ================= */

  const openAdd = () => {
    setEditingItem(null);
    setMenuForm({
      name: "",
      price: "",
      stock: "",
      imageFile: null,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      price: item.price,
      stock: item.stock,
      imageFile: null,
    });
    setShowModal(true);
  };

  const submitMenu = async () => {
    const formData = new FormData();
    formData.append("name", menuForm.name);
    formData.append("price", menuForm.price);
    formData.append("stock", menuForm.stock);
    if (menuForm.imageFile) formData.append("image", menuForm.imageFile);

    if (editingItem) {
      await api.put(`/seller/menu/${editingItem.id}`, formData);
    } else {
      await api.post("/seller/menu", formData);
    }

    setShowModal(false);
    loadAll();
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete this menu item?")) return;
    await api.delete(`/seller/menu/${id}`);
    loadAll();
  };

  /* ================= RENDER ================= */

  return (
    <div className="seller-page">
      <h1>Seller Dashboard</h1>

      <div className="tabs">
        {["OVERVIEW", "MENU", "ORDERS", "ANALYTICS", "FORECAST"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === "OVERVIEW" && (
        <div className="seller-content">
          <h2>{restaurant?.name}</h2>

          <div className="summary-grid">
            <div className="card">
              <span>Today’s Orders</span>
              <strong>{todayOrders.length}</strong>
            </div>
            <div className="card">
              <span>Total Revenue</span>
              <strong>Rs. {totalRevenue}</strong>
            </div>
            <div className="card">
              <span>Menu Items</span>
              <strong>{menu.length}</strong>
            </div>
            <div className="card">
              <span>Low Stock Items</span>
              <strong>{lowStockItems.length}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ================= MENU ================= */}
      {tab === "MENU" && (
        <div className="seller-content">
          <div className="menu-header">
            <h2>Menu Items</h2>
            <button className="primary-btn" onClick={openAdd}>
              + Add Menu Item
            </button>
          </div>

          <div className="menu-grid">
            {menu.map((m) => (
              <div key={m.id} className="menu-card">
                {m.image && (
                  <img src={`http://localhost:5000${m.image}`} alt={m.name} />
                )}
                <h4>{m.name}</h4>
                <p>Price: Rs. {m.price}</p>
                <p className={m.stock <= 5 ? "low-stock" : ""}>
                  Stock: {m.stock}
                </p>

                <button className="primary-btn" onClick={() => openEdit(m)}>
                  Edit
                </button>
                <button
                  className="primary-btn"
                  style={{ background: "#dc2626" }}
                  onClick={() => deleteMenuItem(m.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ORDERS ================= */}
      {tab === "ORDERS" && (
        <div className="seller-content">
          <h2>Orders</h2>

          {orders.map((o) => (
            <div key={o.id} className="order-box">
              <strong>Order #{o.id}</strong>

              <select
                className="status-select"
                value={o.status}
                onChange={async (e) => {
                  await api.put(`/seller/orders/${o.id}/status`, {
                    status: e.target.value,
                  });
                  loadAll();
                }}
              >
                <option value="PLACED">PLACED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* ================= ANALYTICS ================= */}
      {tab === "ANALYTICS" && (
        <div className="seller-content">
          <Bar
            data={{
              labels: analytics.map((a) => a.name),
              datasets: [
                {
                  label: "Stock Level",
                  data: analytics.map((a) => a.stock),
                  backgroundColor: "#2563eb",
                },
              ],
            }}
          />
        </div>
      )}

      {/* ================= FORECAST ================= */}
      {tab === "FORECAST" && (
        <div className="seller-content">
          <Line
            data={{
              labels: forecast.map((f) => f.day),
              datasets: [
                {
                  label: "Expected Orders",
                  data: forecast.map((f) => f.orders),
                  borderColor: "#16a34a",
                  backgroundColor: "rgba(22,163,74,0.2)",
                },
              ],
            }}
          />
        </div>
      )}

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h3>

            <input
              placeholder="Item Name"
              value={menuForm.name}
              onChange={(e) =>
                setMenuForm({ ...menuForm, name: e.target.value })
              }
            />

            <input
              placeholder="Price"
              type="number"
              value={menuForm.price}
              onChange={(e) =>
                setMenuForm({ ...menuForm, price: e.target.value })
              }
            />

            <input
              placeholder="Stock"
              type="number"
              value={menuForm.stock}
              onChange={(e) =>
                setMenuForm({ ...menuForm, stock: e.target.value })
              }
            />

            <input
              type="file"
              onChange={(e) =>
                setMenuForm({
                  ...menuForm,
                  imageFile: e.target.files[0],
                })
              }
            />

            <div className="modal-actions">
              <button className="primary-btn" onClick={submitMenu}>
                Save
              </button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
