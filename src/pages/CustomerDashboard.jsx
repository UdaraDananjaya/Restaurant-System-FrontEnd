import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./CustomerDashboard.css";

const padOrderId = (id) => `O${String(id).padStart(6, "0")}`;

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("BROWSE");
  const [user, setUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [restaurants, setRestaurants] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState("ALL");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recs, setRecs] = useState([]);

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    age: "",
    gender: "",
    dietary_preferences: "",
    favorite_cuisine: "",
  });

  // ✅ NEW: replaces JSON textarea
  const [historyItems, setHistoryItems] = useState([
    { item: "", price: "", date: "" },
  ]);

  const [profileError, setProfileError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const token = useMemo(() => localStorage.getItem("token"), []);

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

  const normalizeOrderItems = (items) => {
    if (Array.isArray(items)) return items;
    if (!items) return [];

    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed?.items)) return parsed.items;
      } catch {
        return [];
      }
    }

    if (Array.isArray(items?.items)) return items.items;

    return [];
  };

  const loadProfile = async () => {
    setLoadingProfile(true);
    setError(null);

    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setLoadingProfile(false);
      clearAuth();
      navigate("/login");
      return;
    }

    try {
      const res = await api.get("/auth/me", { timeout: 8000 });
      const me = res.data;
      setUser(me);

      const role = (me?.role || "").toUpperCase();
      if (role !== "CUSTOMER") {
        if (role === "ADMIN") navigate("/admin");
        else if (role === "SELLER") navigate("/seller");
      }
    } catch (err) {
      console.error(err);
      if (handleAuthError(err)) return;
      setError("Failed to load profile. Check backend /api/auth/me");
      setUser(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadRestaurants = async (cuisine = null) => {
    setBusy(true);
    setError(null);
    try {
      const q =
        cuisine && cuisine !== "ALL"
          ? `?cuisine=${encodeURIComponent(cuisine)}`
          : "";
      const res = await api.get(`/customer/restaurants${q}`);
      setRestaurants(res.data || []);
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) setError("Failed to load restaurants");
    } finally {
      setBusy(false);
    }
  };

  const loadMenu = async (restaurantId) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.get(`/customer/restaurants/${restaurantId}/menu`);
      setMenu(res.data || []);
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) setError("Failed to load menu");
    } finally {
      setBusy(false);
    }
  };

  const loadOrders = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.get("/customer/orders");
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) setError("Failed to load orders");
    } finally {
      setBusy(false);
    }
  };

  const loadRecommendations = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.get("/customer/recommendations?limit=6");
      setRecs(res.data?.recommended || []);
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) setError("Failed to load recommendations");
    } finally {
      setBusy(false);
    }
  };

  const loadCustomerProfile = async () => {
    setBusy(true);
    setProfileError(null);
    try {
      const res = await api.get("/customer/profile");
      const p = res.data;

      setProfile(p);

      setProfileForm({
        age: p?.age ?? "",
        gender: p?.gender ?? "",
        dietary_preferences: Array.isArray(p?.dietary_preferences)
          ? p.dietary_preferences.join(", ")
          : "",
        favorite_cuisine: p?.favorite_cuisine ?? "",
      });

      // ✅ Convert backend order_history into editable rows
      const h = Array.isArray(p?.order_history) ? p.order_history : [];
      if (h.length) {
        setHistoryItems(
          h.map((x) => ({
            item: x.item || "",
            price: x.price ?? "",
            date: x.date || "",
          })),
        );
      } else {
        setHistoryItems([{ item: "", price: "", date: "" }]);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 404) {
        setProfile(null);
        setProfileForm({
          age: "",
          gender: "",
          dietary_preferences: "",
          favorite_cuisine: "",
        });
        setHistoryItems([{ item: "", price: "", date: "" }]);
      } else if (!handleAuthError(err)) {
        setProfileError("Failed to load profile");
      }
    } finally {
      setBusy(false);
    }
  };

  /* =================== CART =================== */

  const cartRestaurantId = cart.length ? cart[0].restaurantId : null;
  const cartTotal = cart.reduce(
    (sum, x) => sum + Number(x.price) * Number(x.qty),
    0,
  );

  const addToCart = (item) => {
    if (!selectedRestaurant) return;

    if (cartRestaurantId && cartRestaurantId !== selectedRestaurant.id) {
      const ok = window.confirm(
        "Your cart contains items from another restaurant. Clear it and start a new order?",
      );
      if (!ok) return;
      setCart([]);
    }

    setCart((prev) => {
      const existing = prev.find((p) => p.menuItemId === item.id);
      if (existing) {
        return prev.map((p) =>
          p.menuItemId === item.id ? { ...p, qty: Math.min(99, p.qty + 1) } : p,
        );
      }
      return [
        ...prev,
        {
          restaurantId: selectedRestaurant.id,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          portion: "regular",
        },
      ];
    });
  };

  const updateCartQty = (menuItemId, qty) => {
    const q = Math.max(1, Math.min(99, Number(qty) || 1));
    setCart((prev) =>
      prev.map((p) => (p.menuItemId === menuItemId ? { ...p, qty: q } : p)),
    );
  };

  const removeFromCart = (menuItemId) => {
    setCart((prev) => prev.filter((p) => p.menuItemId !== menuItemId));
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    setBusy(true);
    setError(null);
    try {
      const restaurantId = cart[0].restaurantId;
      const items = cart.map((x) => ({
        menuItemId: x.menuItemId,
        portion: x.portion,
        qty: x.qty,
      }));

      await api.post("/customer/order", { restaurantId, items });
      setCart([]);
      setTab("ORDERS");
      await loadOrders();
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err))
        setError(err?.response?.data?.message || "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  /* =================== PROFILE SAVE =================== */

  const addHistoryRow = () =>
    setHistoryItems((prev) => [...prev, { item: "", price: "", date: "" }]);

  const removeHistoryRow = (idx) => {
    setHistoryItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ item: "", price: "", date: "" }];
    });
  };

  const updateHistoryField = (idx, key, value) => {
    setHistoryItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    );
  };

  const saveProfile = async () => {
    setBusy(true);
    setProfileError(null);
    try {
      const dietaryArr = profileForm.dietary_preferences
        ? profileForm.dietary_preferences
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

      // ✅ convert history rows to backend JSON array
      const order_history = historyItems
        .map((x) => ({
          item: String(x.item || "").trim(),
          price: x.price === "" ? null : Number(x.price),
          date: String(x.date || "").trim(),
        }))
        .filter((x) => x.item && x.price && x.date);

      const payload = {
        age: profileForm.age === "" ? null : Number(profileForm.age),
        gender: profileForm.gender || null,
        dietary_preferences: dietaryArr,
        favorite_cuisine: profileForm.favorite_cuisine || null,
        order_history,
      };

      if (!profile) await api.post("/customer/profile", payload);
      else await api.put("/customer/profile", payload);

      await loadCustomerProfile();
      alert("✅ Profile saved");
    } catch (err) {
      console.error(err);
      if (!handleAuthError(err)) {
        setProfileError(
          err?.response?.data?.message || "Failed to save profile",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  /* =================== INIT =================== */

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    loadRestaurants();
    loadOrders();
    loadRecommendations();
    loadCustomerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadRestaurants(selectedCuisine);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCuisine]);

  if (loadingProfile) return <div className="customer-page">Loading…</div>;

  if (!token) {
    return (
      <div className="customer-page">
        <div className="card">
          <h2>Session expired</h2>
          <p className="muted">Please login again.</p>
          <button className="primary" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    );
  }

  const allCuisines = Array.from(
    new Set(
      (restaurants || [])
        .flatMap((r) => (Array.isArray(r.cuisines) ? r.cuisines : []))
        .map((c) => String(c).trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div>
          <h2>Customer Dashboard</h2>
          <p className="muted">
            Welcome, <b>{user?.name}</b> • {user?.email}
          </p>
        </div>

        <div className="header-actions">
          <button
            className="secondary"
            onClick={() => {
              clearAuth();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="tabs">
        {[
          ["BROWSE", "Browse"],
          ["RECOMMENDATIONS", "For You"],
          ["CART", `Cart (${cart.length})`],
          ["ORDERS", "Orders"],
          ["PROFILE", "Profile"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "tab active" : "tab"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {(error || busy) && (
        <div className="status-row">
          {busy ? <span className="pill">Loading…</span> : null}
          {error ? <span className="pill error">{error}</span> : null}
        </div>
      )}

      {/* =================== BROWSE =================== */}
      {tab === "BROWSE" && (
        <div className="grid">
          <section className="card">
            <div className="card-head">
              <h3>Restaurants</h3>
              <div className="row">
                <span className="muted">Cuisine</span>
                <select
                  value={selectedCuisine}
                  onChange={(e) => setSelectedCuisine(e.target.value)}
                >
                  <option value="ALL">All</option>
                  {allCuisines.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="list">
              {(restaurants || []).map((r) => (
                <button
                  key={r.id}
                  className={
                    selectedRestaurant?.id === r.id
                      ? "list-item active"
                      : "list-item"
                  }
                  onClick={async () => {
                    setSelectedRestaurant(r);
                    await loadMenu(r.id);
                  }}
                >
                  <div className="list-title">{r.name}</div>
                  <div className="list-sub">
                    {Array.isArray(r.cuisines) && r.cuisines.length
                      ? r.cuisines.join(" • ")
                      : "No cuisines"}
                  </div>
                </button>
              ))}
              {!restaurants?.length && (
                <p className="muted">No restaurants found.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>Menu</h3>
              <p className="muted">
                {selectedRestaurant
                  ? `Menu for ${selectedRestaurant.name}`
                  : "Select a restaurant to view menu"}
              </p>
            </div>

            {!selectedRestaurant ? (
              <p className="muted">Pick a restaurant from the left side.</p>
            ) : (
              <div className="menu-grid">
                {(menu || []).map((m) => (
                  <div key={m.id} className="menu-item">
                    <div className="menu-main">
                      <div>
                        <div className="menu-name">{m.name}</div>
                        <div className="menu-meta muted">
                          LKR {Number(m.price).toFixed(0)} • Stock: {m.stock}
                        </div>
                      </div>
                      <button
                        className="primary"
                        disabled={Number(m.stock) <= 0}
                        onClick={() => addToCart(m)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
                {!menu?.length && (
                  <p className="muted">No menu items available.</p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =================== RECOMMENDATIONS =================== */}
      {tab === "RECOMMENDATIONS" && (
        <section className="card">
          <div className="card-head">
            <h3>Recommended for you</h3>
            <button className="secondary" onClick={loadRecommendations}>
              Refresh
            </button>
          </div>

          <div className="recs">
            {(recs || []).map((r) => (
              <div key={r.id} className="rec-card">
                <div className="rec-title">{r.name}</div>
                <div className="muted">
                  {Array.isArray(r.cuisines) && r.cuisines.length
                    ? r.cuisines.join(" • ")
                    : "No cuisines"}
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    setSelectedRestaurant(r);
                    setTab("BROWSE");
                    await loadMenu(r.id);
                  }}
                >
                  View Menu
                </button>
              </div>
            ))}
            {!recs?.length && <p className="muted">No recommendations yet.</p>}
          </div>
        </section>
      )}

      {/* =================== CART =================== */}
      {tab === "CART" && (
        <section className="card">
          <div className="card-head">
            <h3>Your Cart</h3>
            <div className="row">
              <button
                className="secondary"
                onClick={() => setCart([])}
                disabled={!cart.length}
              >
                Clear
              </button>
              <button
                className="primary"
                onClick={placeOrder}
                disabled={!cart.length || busy}
              >
                Place Order
              </button>
            </div>
          </div>

          {!cart.length ? (
            <p className="muted">Cart is empty. Add items from a menu.</p>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((c) => (
                  <div key={c.menuItemId} className="cart-row">
                    <div>
                      <div className="cart-title">{c.name}</div>
                      <div className="muted">
                        LKR {Number(c.price).toFixed(0)}
                      </div>
                    </div>

                    <div className="row">
                      <input
                        className="qty"
                        type="number"
                        min={1}
                        max={99}
                        value={c.qty}
                        onChange={(e) =>
                          updateCartQty(c.menuItemId, e.target.value)
                        }
                      />
                      <button
                        className="danger"
                        onClick={() => removeFromCart(c.menuItemId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="total">
                <span>Total</span>
                <b>LKR {Number(cartTotal).toFixed(0)}</b>
              </div>
            </>
          )}
        </section>
      )}

      {/* =================== ORDERS =================== */}
      {tab === "ORDERS" && (
        <section className="card">
          <div className="card-head">
            <h3>Order History</h3>
            <button className="secondary" onClick={loadOrders}>
              Refresh
            </button>
          </div>

          <div className="orders">
            {(orders || []).map((o) => (
              <div key={o.id} className="order-card">
                <div className="order-top">
                  <div>
                    <div className="order-id">{padOrderId(o.id)}</div>
                    <div className="muted">
                      {o?.restaurant?.name ? `${o.restaurant.name} • ` : ""}
                      {o.created_at
                        ? new Date(o.created_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                  <span
                    className={`status ${String(o.status || "").toLowerCase()}`}
                  >
                    {o.status}
                  </span>
                </div>

                <div className="order-items">
                  {normalizeOrderItems(o.items).map((it, idx) => (
                    <div key={`${o.id}-${idx}`} className="order-item">
                      <span>{it.name}</span>
                      <span className="muted">
                        {it.qty} × LKR {Number(it.price).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="total">
                  <span>Total</span>
                  <b>LKR {Number(o.total_amount || 0).toFixed(0)}</b>
                </div>
              </div>
            ))}
            {!orders?.length && <p className="muted">No orders yet.</p>}
          </div>
        </section>
      )}

      {/* =================== PROFILE =================== */}
      {tab === "PROFILE" && (
        <section className="card">
          <div className="card-head">
            <h3>My Profile</h3>
            <button className="secondary" onClick={loadCustomerProfile}>
              Reload
            </button>
          </div>

          {profileError ? (
            <div className="pill error">{profileError}</div>
          ) : null}

          <div className="form-grid">
            <label>
              Age
              <input
                type="number"
                value={profileForm.age}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, age: e.target.value }))
                }
              />
            </label>

            <label>
              Gender
              <select
                value={profileForm.gender}
                onChange={(e) =>
                  setProfileForm((p) => ({ ...p, gender: e.target.value }))
                }
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Dietary Preferences (comma separated)
              <input
                value={profileForm.dietary_preferences}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    dietary_preferences: e.target.value,
                  }))
                }
                placeholder="Halal, Non-Veg"
              />
            </label>

            <label>
              Favorite Cuisine
              <input
                value={profileForm.favorite_cuisine}
                onChange={(e) =>
                  setProfileForm((p) => ({
                    ...p,
                    favorite_cuisine: e.target.value,
                  }))
                }
                placeholder="Sri Lankan"
              />
            </label>
          </div>

          {/* ✅ NEW NICE ORDER HISTORY UI */}
          <div className="history-card">
            <div className="history-head">
              <h4>Order Preferences (History)</h4>
              <button className="secondary" onClick={addHistoryRow}>
                + Add Item
              </button>
            </div>

            <div className="history-list">
              {historyItems.map((row, idx) => (
                <div key={idx} className="history-row">
                  <input
                    placeholder="Item name (e.g., Red Curry Beef)"
                    value={row.item}
                    onChange={(e) =>
                      updateHistoryField(idx, "item", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="Price (LKR)"
                    value={row.price}
                    onChange={(e) =>
                      updateHistoryField(idx, "price", e.target.value)
                    }
                  />
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e) =>
                      updateHistoryField(idx, "date", e.target.value)
                    }
                  />
                  <button
                    className="danger"
                    onClick={() => removeHistoryRow(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <p className="muted small">
              Add your past orders here (used for personalized recommendations).
              Only complete rows (item + price + date) will be saved.
            </p>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <button className="primary" onClick={saveProfile} disabled={busy}>
              Save Profile
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
