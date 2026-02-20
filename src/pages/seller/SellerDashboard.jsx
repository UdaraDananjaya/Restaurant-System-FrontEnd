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
import { useEffect, useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const [tab, setTab] = useState("OVERVIEW");

  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [forecast, setForecast] = useState([]);

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    cuisines: "", // comma separated
    imageFile: null,
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [error, setError] = useState(null); // { title, details }

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [menuForm, setMenuForm] = useState({
    name: "",
    price: "",
    stock: "",
    imageFile: null,
  });

  // NOTE: memo just to avoid re-reading each render
  const token = useMemo(() => localStorage.getItem("token"), []);

  /* ================= HELPERS ================= */

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("userId");
  };

  const handleAuthError = (err) => {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      clearAuth();
      navigate("/login");
      return true;
    }
    return false;
  };

  const formatAxiosError = (err) => {
    const isNetwork = err?.message === "Network Error";
    const status = err?.response?.status;
    const data = err?.response?.data;

    const msg =
      data?.message ||
      data?.error ||
      err?.message ||
      "Unknown error while calling backend";

    const details = [
      isNetwork
        ? "Network Error (Browser blocked request) → likely CORS / OPTIONS preflight blocked / backend not reachable."
        : null,
      status ? `HTTP ${status}` : null,
      msg ? `Message: ${msg}` : null,
      data ? `Response: ${JSON.stringify(data)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return details;
  };

  /* ================= LOAD PROFILE ================= */

  const loadProfile = async () => {
    setError(null);
    setLoadingProfile(true);

    const currentToken = localStorage.getItem("token");

    // If there is no token, don’t even call API
    if (!currentToken) {
      setLoadingProfile(false);
      clearAuth();
      navigate("/login");
      return;
    }

    try {
      // Add a timeout so it never hangs forever
      const res = await api.get("/auth/me", { timeout: 8000 });

      const profile = res.data;
      setUser(profile);

      // ✅ FIX: role check must be case-insensitive
      const role = (profile?.role || "").toUpperCase();

      if (role && role !== "SELLER") {
        if (role === "ADMIN") navigate("/admin");
        else navigate("/customer");
        return;
      }
    } catch (err) {
      console.error("Profile load error:", err);

      // If 401/403 -> login
      if (handleAuthError(err)) return;

      setUser(null);
      setError({
        title: "Failed to load profile (/auth/me)",
        details: formatAxiosError(err),
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  /* ================= LOAD SELLER DATA ================= */

  const loadAll = async () => {
    setError(null);
    setLoadingData(true);

    try {
      const [r, m, o, a, f] = await Promise.all([
        api.get("/seller/restaurant"),
        api.get("/seller/menu"),
        api.get("/seller/orders"),
        api.get("/seller/analytics"),
        api.get("/seller/forecast"),
      ]);

      setRestaurant(r.data || null);
      setMenu(m.data || []);
      setOrders(o.data || []);
      setAnalytics(a.data || []);
      setForecast(f.data || []);
    } catch (err) {
      console.error("Seller dashboard load error:", err);

      if (handleAuthError(err)) return;

      setError({
        title: "Failed to load seller dashboard data",
        details: formatAxiosError(err),
      });
    } finally {
      setLoadingData(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // when profile loaded and user is approved -> load seller data
    if (!user) return;

    if (user?.status === "APPROVED") {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Populate restaurant form when restaurant loaded
  useEffect(() => {
    if (!restaurant) return;
    setRestaurantForm({
      name: restaurant?.name || "",
      contactNumber: restaurant?.contact_number || "",
      address: restaurant?.address || "",
      cuisines: Array.isArray(restaurant?.cuisines)
        ? restaurant.cuisines.join(", ")
        : "",
      imageFile: null,
    });
  }, [restaurant]);

  /* ================= STATUS / LOADING UI ================= */

  if (loadingProfile) {
    return <div className="seller-page dark">Loading profile...</div>;
  }

  // If profile failed, show error screen (so it won’t stay stuck)
  if (error && !user) {
    return (
      <div
        className="seller-page dark status-screen"
        style={{ textAlign: "left" }}
      >
        <h2 style={{ marginBottom: 8 }}>⚠️ {error.title}</h2>

        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "rgba(255,255,255,0.06)",
            padding: 12,
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          {error.details}
        </pre>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button className="primary-btn" onClick={loadProfile}>
            Retry Profile
          </button>
          <button
            className="danger-btn"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>

        <p style={{ marginTop: 10, opacity: 0.8 }}>
          ✅ Check if backend is running on <b>http://localhost:5000</b> and if
          route exists: <b>GET /api/auth/me</b>.
        </p>
      </div>
    );
  }

  // status screens (profile loaded)
  if (user?.status === "PENDING") {
    return (
      <div className="seller-page dark status-screen">
        <h2>⏳ Account Pending Approval</h2>
        <p>Your seller account is waiting for admin approval.</p>
      </div>
    );
  }

  if (user?.status === "REJECTED") {
    return (
      <div className="seller-page dark status-screen">
        <h2>❌ Registration Rejected</h2>
        <p>Your seller registration was rejected by admin.</p>
      </div>
    );
  }

  if (user?.status === "SUSPENDED") {
    return (
      <div className="seller-page dark status-screen">
        <h2>🚫 Account Suspended</h2>
        <p>Your account has been suspended. Please contact admin.</p>
      </div>
    );
  }

  /* ================= DERIVED VALUES ================= */

  const todayOrders = orders.filter(
    (o) =>
      o.created_at &&
      new Date(o.created_at).toDateString() === new Date().toDateString(),
  );

  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o.total_amount || 0),
    0,
  );

  const lowStockItems = menu.filter((m) => Number(m.stock) <= 5);

  /* ================= MENU HANDLERS ================= */

  const openAdd = () => {
    setEditingItem(null);
    setMenuForm({ name: "", price: "", stock: "", imageFile: null });
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
    if (!menuForm.name || !menuForm.price || !menuForm.stock) {
      alert("Please fill all fields");
      return;
    }

    try {
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
    } catch (err) {
      console.error("Menu submit error:", err);
      if (!handleAuthError(err)) alert("Failed to save menu item");
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      await api.delete(`/seller/menu/${id}`);
      loadAll();
    } catch (err) {
      console.error("Delete error:", err);
      if (!handleAuthError(err)) alert("Failed to delete item");
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="seller-page dark">
      <h1>{restaurant?.name || "Seller Dashboard"}</h1>

      {/* If data calls failed but profile is ok, show a small error banner */}
      {error && user && (
        <div
          style={{
            margin: "12px 0",
            padding: 12,
            borderRadius: 10,
            background: "rgba(255, 90, 90, 0.15)",
            border: "1px solid rgba(255, 90, 90, 0.25)",
          }}
        >
          <b>⚠️ {error.title}</b>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 6 }}>
            {error.details}
          </div>
          <button
            className="primary-btn"
            style={{ marginTop: 10 }}
            onClick={loadAll}
          >
            Retry Data Load
          </button>
        </div>
      )}

      {loadingData && (
        <div style={{ opacity: 0.8 }}>Loading dashboard data...</div>
      )}

      <div className="tabs">
        {[
          "OVERVIEW",
          "RESTAURANT",
          "MENU",
          "ORDERS",
          "ANALYTICS",
          "FORECAST",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "OVERVIEW" && (
        <div className="seller-content">
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
              <span>Low Stock</span>
              <strong>{lowStockItems.length}</strong>
            </div>
          </div>
        </div>
      )}

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
                <p className={Number(m.stock) <= 5 ? "low-stock" : ""}>
                  Stock: {m.stock}
                </p>

                <button className="primary-btn" onClick={() => openEdit(m)}>
                  Edit
                </button>

                <button
                  className="danger-btn"
                  onClick={() => deleteMenuItem(m.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  try {
                    await api.put(`/seller/orders/${o.id}/status`, {
                      status: e.target.value,
                    });
                    loadAll();
                  } catch (err) {
                    console.error(err);
                    if (!handleAuthError(err)) alert("Failed to update order");
                  }
                }}
              >
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === "RESTAURANT" && (
        <div className="seller-content">
          <h2>Restaurant Profile</h2>

          <div className="modal" style={{ maxWidth: 720 }}>
            <input
              placeholder="Restaurant Name"
              value={restaurantForm.name}
              onChange={(e) =>
                setRestaurantForm({ ...restaurantForm, name: e.target.value })
              }
            />

            <input
              placeholder="Contact Number"
              value={restaurantForm.contactNumber}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  contactNumber: e.target.value,
                })
              }
            />

            <input
              placeholder="Address"
              value={restaurantForm.address}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  address: e.target.value,
                })
              }
            />

            <input
              placeholder="Cuisines (comma separated)"
              value={restaurantForm.cuisines}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  cuisines: e.target.value,
                })
              }
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  imageFile: e.target.files?.[0] || null,
                })
              }
            />

            <button
              className="primary-btn"
              onClick={async () => {
                try {
                  const fd = new FormData();
                  fd.append("name", restaurantForm.name);
                  fd.append("contactNumber", restaurantForm.contactNumber);
                  fd.append("address", restaurantForm.address);
                  fd.append("cuisines", restaurantForm.cuisines);
                  if (restaurantForm.imageFile)
                    fd.append("image", restaurantForm.imageFile);

                  await api.put("/seller/restaurant", fd);
                  alert("✅ Restaurant updated");
                  loadAll();
                } catch (err) {
                  console.error(err);
                  if (!handleAuthError(err))
                    alert(err?.response?.data?.message || "Failed to update");
                }
              }}
            >
              Save Restaurant
            </button>
          </div>
        </div>
      )}

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
                  tension: 0.4,
                },
              ],
            }}
          />
        </div>
      )}

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
              type="number"
              placeholder="Price"
              value={menuForm.price}
              onChange={(e) =>
                setMenuForm({ ...menuForm, price: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Stock"
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
                  imageFile: e.target.files?.[0] || null,
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
