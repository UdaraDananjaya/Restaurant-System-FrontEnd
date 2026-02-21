// SellerDashboard.jsx
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
import { useCallback, useEffect, useMemo, useState } from "react";
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

// One place for backend URL (images too)
const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

const TABS = [
  { key: "OVERVIEW", label: "Overview" },
  { key: "RESTAURANT", label: "Restaurant" },
  { key: "MENU", label: "Menu" },
  { key: "ORDERS", label: "Orders" },
  { key: "ANALYTICS", label: "Analytics" },
  { key: "FORECAST", label: "Forecast" },
];

const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK")}`;

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
};

const safeImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

const normalizeOrderItems = (o) => {
  let items =
      o?.items || o?.order_items || o?.orderItems || o?.details || o?.cart || [];

  // ✅ HANDLE STRING JSON
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (e) {
      console.warn("Failed to parse order items:", e);
      return [];
    }
  }

  if (!Array.isArray(items)) return [];

  return items.map((it) => ({
    name: it?.name || it?.menuItem?.name || it?.item_name || "Item",
    qty: Number(it?.qty ?? it?.quantity ?? it?.count ?? 1),
    price: Number(
        it?.price ?? it?.unit_price ?? it?.menuItem?.price ?? 0
    ),
  }));
};

const statusColorClass = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "badge pending";
  if (s === "CONFIRMED") return "badge confirmed";
  if (s === "PREPARING") return "badge preparing";
  if (s === "READY") return "badge ready";
  if (s === "COMPLETED") return "badge completed";
  if (s === "CANCELLED") return "badge cancelled";
  return "badge";
};

function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="error-banner" role="alert" aria-live="polite">
      <div className="error-banner-head">
        <b>⚠️ {error.title}</b>
        {onRetry && (
          <button className="primary-btn" onClick={onRetry}>
            Retry Data Load
          </button>
        )}
      </div>
      <pre className="error-pre">{error.details}</pre>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" role="group" aria-label={label}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({ title, open, onClose, children, footer }) {
  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="ghost-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{footer}</div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
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
    contact: "",
    address: "",
    cuisines: "",
    opening_hours: "",
    imageFile: null,
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // { title, details }
  const [error, setError] = useState(null);

  // Menu Modal State
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingMenu, setSavingMenu] = useState(false);

  const [menuForm, setMenuForm] = useState({
    name: "",
    price: "",
    stock: "",
    imageFile: null,
  });

  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [orderUpdatingId, setOrderUpdatingId] = useState(null);

  /* ================= Auth Helpers ================= */

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("userId");
  }, []);

  const handleAuthError = useCallback(
    (err) => {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        clearAuth();
        navigate("/login");
        return true;
      }
      return false;
    },
    [clearAuth, navigate],
  );

  const formatAxiosError = useCallback((err) => {
    const isNetwork = err?.message === "Network Error";
    const status = err?.response?.status;
    const data = err?.response?.data;

    const msg =
      data?.message ||
      data?.error ||
      err?.message ||
      "Unknown error while calling backend";

    return [
      isNetwork ? "Network Error → backend unreachable / CORS blocked" : null,
      status ? `HTTP ${status}` : null,
      msg ? `Message: ${msg}` : null,
      data ? `Response: ${JSON.stringify(data)}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }, []);

  /* ================= Load Profile ================= */

  const loadProfile = useCallback(async () => {
    setError(null);
    setLoadingProfile(true);

    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setLoadingProfile(false);
      clearAuth();
      navigate("/login");
      return;
    }

    try {
      const res = await api.get("/auth/me", { timeout: 8000 });
      const profile = res.data;

      setUser(profile);

      const role = (profile?.role || "").toUpperCase();
      if (role && role !== "SELLER") {
        if (role === "ADMIN") navigate("/admin");
        else navigate("/customer");
        return;
      }
    } catch (err) {
      console.error("Profile load error:", err);
      if (handleAuthError(err)) return;

      setUser(null);
      setError({
        title: "Failed to load profile (/auth/me)",
        details: formatAxiosError(err),
      });
    } finally {
      setLoadingProfile(false);
    }
  }, [clearAuth, navigate, handleAuthError, formatAxiosError]);

  /* ================= Load Dashboard Data ================= */

  const loadAll = useCallback(async () => {
    setError(null);
    setLoadingData(true);

    try {
      // Forecast is non-critical → loaded separately
      const [r, m, o, a] = await Promise.all([
        api.get("/seller/restaurant"),
        api.get("/seller/menu"),
        api.get("/seller/orders"),
        api.get("/seller/analytics"),
      ]);

      setRestaurant(r.data || null);
      setMenu(m.data || []);
      setOrders(o.data || []);
      setAnalytics(a.data || []);

      // Non-blocking forecast
      try {
        const f = await api.get("/seller/forecast", { timeout: 8000 });
        setForecast(f.data?.forecast || []);
      } catch (e) {
        console.warn("Forecast load failed (non-critical):", e?.message);
        setForecast([]);
      }
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
  }, [handleAuthError, formatAxiosError]);

  /* ================= Init ================= */

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!user) return;
    if (user?.status === "APPROVED") loadAll();
  }, [user, loadAll]);

  useEffect(() => {
    if (!restaurant) return;

    setRestaurantForm({
      name: restaurant?.name || "",
      contact: restaurant?.contact || restaurant?.contact_number || "",
      address: restaurant?.address || "",
      cuisines: Array.isArray(restaurant?.cuisines)
        ? restaurant.cuisines.join(", ")
        : restaurant?.cuisines || "",
      opening_hours: restaurant?.opening_hours || "",
      imageFile: null,
    });
  }, [restaurant]);

  /* ================= Derived Values ================= */

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter(
      (o) => o.created_at && new Date(o.created_at).toDateString() === today,
    );
  }, [orders]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const lowStockItems = useMemo(() => {
    return menu.filter((m) => Number(m.stock) <= 5);
  }, [menu]);

  const barData = useMemo(() => {
    return {
      labels: analytics.map((a) => a.name),
      datasets: [
        {
          label: "Stock Level",
          data: analytics.map((a) => Number(a.stock || 0)),
        },
      ],
    };
  }, [analytics]);

  const lineData = useMemo(() => {
    return {
      labels: forecast.map((f, i) => f.day || `Day ${i + 1}`),
      datasets: [
        {
          label: "Expected Orders",
          data: forecast.map((f) => Number(f.orders ?? f.value ?? 0)),
          tension: 0.35,
        },
      ],
    };
  }, [forecast]);

  /* ================= UI States ================= */

  if (loadingProfile) {
    return <div className="seller-page dark">Loading...</div>;
  }

  if (error && !user) {
    return (
      <div
        className="seller-page dark status-screen"
        style={{ textAlign: "left" }}
      >
        <h2 style={{ marginBottom: 8 }}>⚠️ {error.title}</h2>
        <pre className="error-pre">{error.details}</pre>

        <div className="row gap">
          <button className="primary-btn" onClick={loadProfile}>
            Retry
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
      </div>
    );
  }

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

  /* ================= Actions ================= */

  const openAddMenu = () => {
    setEditingItem(null);
    setMenuForm({ name: "", price: "", stock: "", imageFile: null });
    setShowMenuModal(true);
  };

  const openEditMenu = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item?.name || "",
      price: String(item?.price ?? ""),
      stock: String(item?.stock ?? ""),
      imageFile: null,
    });
    setShowMenuModal(true);
  };

  const submitMenu = async () => {
    if (!menuForm.name || !menuForm.price || !menuForm.stock) {
      alert("Please fill all fields");
      return;
    }

    setSavingMenu(true);
    try {
      const formData = new FormData();
      formData.append("name", menuForm.name.trim());
      formData.append("price", String(menuForm.price));
      formData.append("stock", String(menuForm.stock));
      if (menuForm.imageFile) formData.append("image", menuForm.imageFile);

      if (editingItem) {
        await api.put(`/seller/menu/${editingItem.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/seller/menu", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowMenuModal(false);
      await loadAll();
    } catch (err) {
      console.error("Menu submit error:", err);
      if (!handleAuthError(err)) {
        alert(err?.response?.data?.message || "Failed to save menu item");
      }
    } finally {
      setSavingMenu(false);
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      await api.delete(`/seller/menu/${id}`);
      await loadAll();
    } catch (err) {
      console.error("Delete error:", err);
      if (!handleAuthError(err)) alert("Failed to delete item");
    }
  };

  const saveRestaurantProfile = async () => {
    setSavingRestaurant(true);
    try {
      const fd = new FormData();
      fd.append("name", restaurantForm.name.trim());
      fd.append("contact", restaurantForm.contact.trim());
      fd.append("address", restaurantForm.address.trim());
      fd.append("cuisines", restaurantForm.cuisines.trim());
      fd.append("opening_hours", restaurantForm.opening_hours.trim());
      if (restaurantForm.imageFile)
        fd.append("image", restaurantForm.imageFile);

      await api.put("/seller/restaurant", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("✅ Restaurant profile saved");
      await loadAll();
    } catch (err) {
      console.error("Restaurant save error:", err);
      if (!handleAuthError(err)) {
        alert(err?.response?.data?.message || "Failed to update");
      }
    } finally {
      setSavingRestaurant(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setOrderUpdatingId(orderId);
    try {
      await api.put(`/seller/orders/${orderId}/status`, { status });
      await loadAll();
    } catch (err) {
      console.error("Order status update error:", err);
      if (!handleAuthError(err)) {
        alert(err?.response?.data?.message || "Failed to update order");
      }
    } finally {
      setOrderUpdatingId(null);
    }
  };

  /* ================= Render ================= */

  return (
    <div className="seller-page dark">
      <header className="seller-header">
        <div>
          <h1 className="seller-title">
            {restaurant?.name || "Seller Dashboard"}
          </h1>
          <p className="muted">
            Logged in as: <b>{user?.name || user?.email}</b>
          </p>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" onClick={loadAll} title="Refresh data">
            Refresh
          </button>
          <button
            className="ghost-btn"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <ErrorBanner error={error} onRetry={loadAll} />

      {loadingData && (
        <div className="muted" style={{ marginBottom: 10 }}>
          Loading dashboard data...
        </div>
      )}

      <nav className="tabs" aria-label="Seller dashboard tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ================= OVERVIEW ================= */}
      {tab === "OVERVIEW" && (
        <section className="seller-content">
          <div className="summary-grid">
            <StatCard label="Today’s Orders" value={todayOrders.length} />
            <StatCard label="Total Revenue" value={money(totalRevenue)} />
            <StatCard label="Menu Items" value={menu.length} />
            <StatCard label="Low Stock" value={lowStockItems.length} />
          </div>

          <div className="two-col">
            <div className="panel">
              <div className="panel-head">
                <h3>Recent Orders</h3>
              </div>

              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="mini-row">
                  <div>
                    <b>#{o.id}</b> • {formatDateTime(o.created_at)}
                    <div className="muted">
                      {o?.customer?.name || o?.customer?.email || "Customer"}
                    </div>
                  </div>
                  <div className="right" >
                    <span style={{ margin: 10 }} className={statusColorClass(o.status)}>
                      {o.status}
                    </span>
                    <div className="muted">{money(o.total_amount)}</div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && <p className="muted">No orders yet.</p>}
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3>Low Stock Items</h3>
              </div>

              {lowStockItems.slice(0, 8).map((m) => (
                <div key={m.id} className="mini-row">
                  <div>
                    <b>{m.name}</b>
                    <div className="muted">{money(m.price)}</div>
                  </div>
                  <div className="right">
                    <span className="badge warning">Stock: {m.stock}</span>
                  </div>
                </div>
              ))}

              {lowStockItems.length === 0 && (
                <p className="muted">All good 👍</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= RESTAURANT ================= */}
      {tab === "RESTAURANT" && (
        <section className="seller-content">
          <div className="panel wide">
            <div className="panel-head">
              <h2>Restaurant Profile</h2>
              {restaurant?.image && (
                <div className="profile-thumb">
                  <img
                    src={safeImageUrl(restaurant.image)}
                    alt="Restaurant"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div className="form-grid">
              <div>
                <label>Name</label>
                <input
                  value={restaurantForm.name}
                  onChange={(e) =>
                    setRestaurantForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Contact</label>
                <input
                  value={restaurantForm.contact}
                  onChange={(e) =>
                    setRestaurantForm((s) => ({
                      ...s,
                      contact: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="full">
                <label>Address</label>
                <input
                  value={restaurantForm.address}
                  onChange={(e) =>
                    setRestaurantForm((s) => ({
                      ...s,
                      address: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="full">
                <label>Cuisines (comma separated)</label>
                <input
                  value={restaurantForm.cuisines}
                  onChange={(e) =>
                    setRestaurantForm((s) => ({
                      ...s,
                      cuisines: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="full">
                <label>Opening Hours</label>
                <input
                  value={restaurantForm.opening_hours}
                  onChange={(e) =>
                    setRestaurantForm((s) => ({
                      ...s,
                      opening_hours: e.target.value,
                    }))
                  }
                  placeholder="e.g., Mon-Sun 9:00 AM - 10:00 PM"
                />
              </div>

              <div className="full">
                <label>Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setRestaurantForm((s) => ({
                      ...s,
                      imageFile: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>
            </div>

            <button
              className="primary-btn"
              onClick={saveRestaurantProfile}
              disabled={savingRestaurant}
            >
              {savingRestaurant ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>
      )}

      {/* ================= MENU ================= */}
      {tab === "MENU" && (
        <section className="seller-content">
          <div className="row between">
            <h2>Menu Items</h2>
            <button className="primary-btn" onClick={openAddMenu}>
              + Add Menu Item
            </button>
          </div>

          <div className="menu-grid">
            {menu.map((m) => (
              <article key={m.id} className="menu-card">
                {m.image ? (
                  <img
                    src={safeImageUrl(m.image)}
                    alt={m.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="img-placeholder">No Image</div>
                )}

                <div className="menu-card-body">
                  <h4 title={m.name}>{m.name}</h4>
                  <p className="muted">{money(m.price)}</p>
                  <p className={Number(m.stock) <= 5 ? "low-stock" : ""}>
                    Stock: {m.stock}
                  </p>

                  <div className="row gap">
                    <button
                      className="ghost-btn"
                      onClick={() => openEditMenu(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => deleteMenuItem(m.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {menu.length === 0 && (
              <div className="panel wide">
                <p className="muted">No menu items yet. Add your first item.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= ORDERS ================= */}
      {tab === "ORDERS" && (
        <section className="seller-content">
          <div className="row between">
            <h2>Orders</h2>
            <button className="ghost-btn" onClick={loadAll}>
              Refresh
            </button>
          </div>

          {orders.length === 0 && <p className="muted">No orders yet.</p>}

          <div className="orders-list">
            {orders.map((o) => {
              const items = normalizeOrderItems(o);
              const customerName = o?.customer?.name || "Customer";
              const customerEmail = o?.customer?.email || "";

              return (
                <article key={o.id} className="order-card">
                  <div className="order-top">
                    <div>
                      <div className="order-title">
                        <b>Order #{o.id}</b>
                        <span className={statusColorClass(o.status)}>
                          {o.status}
                        </span>
                      </div>
                      <div className="muted">
                        {formatDateTime(o.created_at)} • {customerName}
                        {customerEmail ? ` (${customerEmail})` : ""}
                      </div>
                    </div>

                    <div className="order-right">
                      <div style={{margin:30}} className="order-total">{money(o.total_amount)}</div>

                      <select
                        className="status-select"
                        value={o.status}
                        disabled={orderUpdatingId === o.id}
                        onChange={(e) =>
                          updateOrderStatus(o.id, e.target.value)
                        }
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY">READY</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>
                  </div>

                  <div className="order-items">
                    <div className="order-items-head">Items</div>

                    {items.length === 0 ? (
                      <div className="muted">
                        No item details available for this order.
                      </div>
                    ) : (
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th style={{ width: 90 }}>Qty</th>
                            <th style={{ width: 140 }}>Unit</th>
                            <th style={{ width: 160 }}>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.name}</td>
                              <td>{it.qty}</td>
                              <td>{money(it.price)}</td>
                              <td>{money(it.price * it.qty)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= ANALYTICS ================= */}
      {tab === "ANALYTICS" && (
        <section className="seller-content">
          <div className="panel wide">
            <div className="panel-head">
              <h2>Stock Analytics</h2>
            </div>
            <Bar data={barData} />
          </div>
        </section>
      )}

      {/* ================= FORECAST ================= */}
      {tab === "FORECAST" && (
        <section className="seller-content">
          <div className="panel wide">
            <div className="panel-head">
              <h2>Demand Forecast</h2>
            </div>

            {forecast.length === 0 ? (
              <p className="muted">
                No forecast available. Add more orders or ensure ML service is
                running.
              </p>
            ) : (
              <Line data={lineData} />
            )}
          </div>
        </section>
      )}

      {/* ================= MENU MODAL ================= */}
      <Modal
        title={editingItem ? "Edit Menu Item" : "Add Menu Item"}
        open={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        footer={
          <>
            <button
              className="primary-btn"
              onClick={submitMenu}
              disabled={savingMenu}
            >
              {savingMenu ? "Saving..." : "Save"}
            </button>
            <button
              className="ghost-btn"
              onClick={() => setShowMenuModal(false)}
            >
              Cancel
            </button>
          </>
        }
      >
        <label>Item Name</label>
        <input
          value={menuForm.name}
          onChange={(e) => setMenuForm((s) => ({ ...s, name: e.target.value }))}
        />

        <label>Price</label>
        <input
          type="number"
          value={menuForm.price}
          onChange={(e) =>
            setMenuForm((s) => ({ ...s, price: e.target.value }))
          }
        />

        <label>Stock</label>
        <input
          type="number"
          value={menuForm.stock}
          onChange={(e) =>
            setMenuForm((s) => ({ ...s, stock: e.target.value }))
          }
        />

        <label>Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setMenuForm((s) => ({
              ...s,
              imageFile: e.target.files?.[0] || null,
            }))
          }
        />
      </Modal>
    </div>
  );
}
