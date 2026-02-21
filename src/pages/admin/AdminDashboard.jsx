import { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import api from "../../api/api";
import "./AdminDashboard.css";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
);

// ✅ Use env if available (Vite), else fallback to localhost
const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

const TABS = [
  { key: "PENDING", label: "Pending Sellers" },
  { key: "USERS", label: "Users" },
  { key: "RESTAURANTS", label: "Restaurants" },
  { key: "ORDERS", label: "Orders" },
  { key: "ANALYTICS", label: "Analytics" },
  { key: "LOGS", label: "Logs" },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [darkMode, setDarkMode] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [fastMoving, setFastMoving] = useState([]);
  const [userChart, setUserChart] = useState(null);
  const [stats, setStats] = useState({});
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [statusChangingId, setStatusChangingId] = useState(null);

  const [userSearch, setUserSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");

  const adminName = localStorage.getItem("name") || "Admin";

  /* ================= Helpers ================= */

  const normalizeStatus = (status, role) => {
    const s = (status || "").toString().trim().toUpperCase();
    if (role === "SELLER" && !s) return "PENDING";
    if (!s) return "APPROVED";
    return s;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    window.setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    window.setTimeout(() => setErrorMsg(""), 4000);
  };

  const safeGet = async (path, fallback) => {
    try {
      const res = await api.get(path);
      return res?.data ?? fallback;
    } catch (e) {
      console.warn(
        `⚠️ Endpoint failed: ${path}`,
        e?.response?.status || e?.message,
      );
      return fallback;
    }
  };

  const computeLocalStats = (uList, rList, oList) => {
    const sellers = uList.filter((u) => u.role === "SELLER");
    const customers = uList.filter((u) => u.role === "CUSTOMER");
    return {
      totalUsers: uList.length,
      totalRestaurants: rList.length,
      totalOrders: oList.length,
      totalSellers: sellers.length,
      totalCustomers: customers.length,
    };
  };

  const renderStatusBadge = (status) => (
    <span className={`ad-badge ${String(status || "").toLowerCase()}`}>
      {status}
    </span>
  );

  /* ================= LOAD DATA ================= */

  const loadAll = async () => {
    setLoading(true);
    try {
      const u = await safeGet("/admin/users", []);
      const normalizedUsers = (u || []).map((user) => ({
        ...user,
        status: normalizeStatus(user.status, user.role),
      }));
      setUsers(normalizedUsers);

      const r = await safeGet("/admin/restaurants", []);
      const o = await safeGet("/admin/orders", []);
      const f = await safeGet("/admin/fast-moving-restaurants", []);
      const uc = await safeGet("/admin/user-distribution", null);
      const a = await safeGet("/admin/analytics", null);
      const rev = await safeGet("/admin/revenue-trend", []);
      const l = await safeGet("/admin/logs", []);

      setRestaurants(Array.isArray(r) ? r : []);
      setOrders(Array.isArray(o) ? o : []);
      setFastMoving(Array.isArray(f) ? f : []);

      const validChart =
        uc &&
        typeof uc === "object" &&
        Array.isArray(uc.labels) &&
        Array.isArray(uc.datasets)
          ? uc
          : null;
      setUserChart(validChart);

      setRevenueTrend(Array.isArray(rev) ? rev : []);
      setLogs(Array.isArray(l) ? l : []);

      const fallbackStats = computeLocalStats(
        normalizedUsers,
        Array.isArray(r) ? r : [],
        Array.isArray(o) ? o : [],
      );

      setStats(
        a && typeof a === "object" ? { ...fallbackStats, ...a } : fallbackStats,
      );
    } catch (err) {
      console.error("Admin dashboard load error", err);
      showError("Failed to load admin dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ================= EXPORT FUNCTION ================= */

  const downloadCSV = async (endpoint, filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/admin/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Export failed (${response.status})`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess("CSV exported successfully");
    } catch (err) {
      console.error("CSV export failed", err);
      showError("Failed to export CSV (check backend endpoint)");
    }
  };

  /* ================= Actions ================= */

  const approveSeller = async (id) => {
    try {
      setApprovingId(id);
      await api.put(`/admin/users/${id}/approve`);
      showSuccess("Seller approved successfully");
      await loadAll();
    } catch (e) {
      console.error(e);
      showError("Approve failed");
    } finally {
      setApprovingId(null);
    }
  };

  const rejectSeller = async (id) => {
    if (!window.confirm("Reject this seller request?")) return;
    try {
      await api.put(`/admin/users/${id}/reject`);
      showSuccess("Seller rejected successfully");
      await loadAll();
    } catch (e) {
      console.error(e);
      showError("Reject failed");
    }
  };

  const suspendUser = async (id) => {
    if (!window.confirm("Suspend this user account?")) return;
    try {
      setStatusChangingId(id);
      await api.put(`/admin/users/${id}/suspend`);
      showSuccess("User suspended successfully");
      await loadAll();
    } catch (e) {
      console.error(e);
      showError("Suspend failed (check backend endpoint)");
    } finally {
      setStatusChangingId(null);
    }
  };

  const reactivateUser = async (id) => {
    if (!window.confirm("Reactivate this user account?")) return;
    try {
      setStatusChangingId(id);
      await api.put(`/admin/users/${id}/reactivate`);
      showSuccess("User reactivated successfully");
      await loadAll();
    } catch (e) {
      console.error(e);
      showError("Reactivate failed (check backend endpoint)");
    } finally {
      setStatusChangingId(null);
    }
  };

  /* ================= DERIVED ================= */

  const sellers = useMemo(
    () => users.filter((u) => u.role === "SELLER"),
    [users],
  );
  const customers = useMemo(
    () => users.filter((u) => u.role === "CUSTOMER"),
    [users],
  );
  const pendingSellers = useMemo(
    () => sellers.filter((s) => s.status === "PENDING"),
    [sellers],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.email || ""} ${u.name || ""} ${u.role || ""} ${u.status || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [users, userSearch]);

  const filteredRestaurants = useMemo(() => {
    const q = restaurantSearch.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) =>
      `${r.name || ""} ${r.restaurantName || ""} ${r.sellerEmail || ""} ${r.address || ""} ${r.contact_number || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [restaurants, restaurantSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      `${l.action || ""} ${l.admin_email || ""} ${l.target || ""} ${l.createdAt || ""} ${l.created_at || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [logs, logSearch]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  };

  if (loading) {
    return (
      <div className={`ad-shell ${darkMode ? "dark" : "light"}`}>
        <div className="ad-wrap">
          <div className="ad-loading">Loading admin dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-shell ${darkMode ? "dark" : "light"}`}>
      <div className="ad-wrap">
        {/* ================= HEADER ================= */}
        <div className="ad-top">
          <div className="ad-title">
            <h1>Admin Dashboard</h1>
            <p className="ad-subtitle">
              Manage users, restaurants, orders & analytics
            </p>
          </div>

          <div className="ad-actions">
            <button
              className="ad-btn ad-btn-primary"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "☀ Light" : "🌙 Dark"}
            </button>

            <div className="ad-profile">
              <button
                className="ad-avatar"
                onClick={() => setShowProfile((v) => !v)}
                title="Profile"
              >
                {adminName?.charAt(0)?.toUpperCase()}
              </button>

              {showProfile && (
                <div className="ad-profile-menu">
                  <div className="ad-profile-meta">
                    <strong>{adminName}</strong>
                    <span className="ad-profile-role">Administrator</span>
                  </div>
                  <button
                    className="ad-btn ad-btn-danger w-full"
                    onClick={() => {
                      localStorage.clear();
                      window.location.href = "/";
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {successMsg && <div className="ad-alert success">✅ {successMsg}</div>}
        {errorMsg && <div className="ad-alert error">❌ {errorMsg}</div>}

        {/* ================= KPI SUMMARY ================= */}
        <div className="ad-kpis">
          <div className="ad-kpi">
            <span>Total Users</span>
            <strong>
              <CountUp
                end={stats.totalUsers || users.length || 0}
                duration={1.1}
              />
            </strong>
          </div>
          <div className="ad-kpi">
            <span>Sellers</span>
            <strong>
              <CountUp end={sellers.length} duration={1.1} />
            </strong>
          </div>
          <div className="ad-kpi">
            <span>Customers</span>
            <strong>
              <CountUp end={customers.length} duration={1.1} />
            </strong>
          </div>
          <div className="ad-kpi">
            <span>Restaurants</span>
            <strong>
              <CountUp
                end={stats.totalRestaurants || restaurants.length || 0}
                duration={1.1}
              />
            </strong>
          </div>
          <div className="ad-kpi">
            <span>Orders</span>
            <strong>
              <CountUp
                end={stats.totalOrders || orders.length || 0}
                duration={1.1}
              />
            </strong>
          </div>
        </div>

        {/* ================= TABS BAR (PROPER LINE) ================= */}
        <div className="ad-tabsbar">
          <div className="ad-tabs" role="tablist" aria-label="Admin tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`ad-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
                role="tab"
                aria-selected={activeTab === t.key}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Right side quick actions (optional but looks pro) */}
          <div className="ad-tabs-right">
            <button className="ad-btn ad-btn-ghost" onClick={loadAll}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ================= PANEL ================= */}
        <div className="ad-panel">
          {/* PENDING */}
          {activeTab === "PENDING" && (
            <>
              <div className="ad-panel-head">
                <h2>Pending Seller Requests</h2>
                <span className="ad-chip">{pendingSellers.length} pending</span>
              </div>

              {pendingSellers.length === 0 && (
                <div className="ad-empty">No pending sellers.</div>
              )}

              {pendingSellers.map((s) => (
                <div key={s.id} className="ad-row">
                  <div className="ad-row-main">
                    <div className="ad-row-title">{s.email}</div>
                    <div className="ad-row-meta">
                      {renderStatusBadge(s.status)}
                    </div>
                  </div>

                  <div className="ad-row-actions">
                    <button
                      className="ad-btn ad-btn-success"
                      disabled={approvingId === s.id}
                      onClick={() => approveSeller(s.id)}
                    >
                      {approvingId === s.id ? "Approving…" : "Approve"}
                    </button>
                    <button
                      className="ad-btn ad-btn-danger"
                      onClick={() => rejectSeller(s.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* USERS */}
          {activeTab === "USERS" && (
            <>
              <div className="ad-panel-head">
                <h2>All Users</h2>
                <div className="ad-inline-actions">
                  <button
                    className="ad-btn ad-btn-ghost"
                    onClick={() => downloadCSV("export/users", "users.csv")}
                  >
                    Export Users CSV
                  </button>
                  <button
                    className="ad-btn ad-btn-ghost"
                    onClick={() => downloadCSV("export/logs", "admin_logs.csv")}
                  >
                    Export Logs CSV
                  </button>
                </div>
              </div>

              <div className="ad-filters">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by email, name, role, status…"
                />
              </div>

              {filteredUsers.length === 0 && (
                <div className="ad-empty">No users found.</div>
              )}

              {filteredUsers.map((u) => (
                <div key={u.id} className="ad-row">
                  <div className="ad-row-main">
                    <div className="ad-row-title">
                      {u.email} <span className="ad-muted">— {u.role}</span>
                    </div>
                    <div className="ad-row-meta">
                      {renderStatusBadge(u.status)}
                    </div>
                  </div>

                  <div className="ad-row-actions">
                    {(u.status === "APPROVED" || u.status === "PENDING") && (
                      <button
                        disabled={statusChangingId === u.id}
                        className="ad-btn ad-btn-warn"
                        onClick={() => suspendUser(u.id)}
                      >
                        {statusChangingId === u.id ? "Updating…" : "Suspend"}
                      </button>
                    )}

                    {u.status === "SUSPENDED" && (
                      <button
                        disabled={statusChangingId === u.id}
                        className="ad-btn ad-btn-success"
                        onClick={() => reactivateUser(u.id)}
                      >
                        {statusChangingId === u.id ? "Updating…" : "Reactivate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* RESTAURANTS */}
          {activeTab === "RESTAURANTS" && (
            <>
              <div className="ad-panel-head">
                <h2>Restaurant Listings</h2>
                <button
                  className="ad-btn ad-btn-ghost"
                  onClick={() =>
                    downloadCSV("export/restaurants", "restaurants.csv")
                  }
                >
                  Export Restaurants CSV
                </button>
              </div>

              <div className="ad-filters">
                <input
                  value={restaurantSearch}
                  onChange={(e) => setRestaurantSearch(e.target.value)}
                  placeholder="Search restaurants by name, seller email, address…"
                />
              </div>

              {filteredRestaurants.length === 0 ? (
                <div className="ad-empty">No restaurants loaded.</div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Restaurant</th>
                        <th>Seller</th>
                        <th>Contact</th>
                        <th>Address</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRestaurants.map((r) => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.name || r.restaurantName}</td>
                          <td>{r.sellerEmail || r.seller_id}</td>
                          <td>{r.contact_number || "-"}</td>
                          <td>{r.address || "-"}</td>
                          <td>{renderStatusBadge(r.status || "ACTIVE")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ORDERS */}
          {activeTab === "ORDERS" && (
            <>
              <div className="ad-panel-head">
                <h2>All Orders</h2>
                <button
                  className="ad-btn ad-btn-ghost"
                  onClick={() => downloadCSV("export/orders", "orders.csv")}
                >
                  Export Orders CSV
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="ad-empty">No orders loaded.</div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Customer</th>
                        <th>Seller</th>
                        <th>Restaurant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td>{o.id}</td>
                          <td>{renderStatusBadge(o.status)}</td>
                          <td>{o.customerEmail || "-"}</td>
                          <td>{o.sellerEmail || "-"}</td>
                          <td>{o.restaurantName || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ANALYTICS */}
          {activeTab === "ANALYTICS" && (
            <>
              <div className="ad-panel-head">
                <h2>Analytics</h2>
                <span className="ad-muted">Charts & trends</span>
              </div>

              <div className="ad-analytics-grid">
                <div className="ad-chart-card">
                  <div className="ad-chart-title">User Distribution</div>
                  <div className="ad-chart-area">
                    {userChart ? (
                      <Pie data={userChart} options={chartOptions} />
                    ) : (
                      <div className="ad-empty">No user distribution data.</div>
                    )}
                  </div>
                </div>

                <div className="ad-chart-card">
                  <div className="ad-chart-title">Fast-Moving Restaurants</div>
                  <div className="ad-chart-area">
                    {fastMoving.length > 0 ? (
                      <Bar
                        options={chartOptions}
                        data={{
                          labels: fastMoving.map((f) => f.restaurant),
                          datasets: [
                            {
                              label: "Orders",
                              data: fastMoving.map((f) => f.orders),
                            },
                          ],
                        }}
                      />
                    ) : (
                      <div className="ad-empty">
                        No fast-moving restaurant data.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ad-chart-card ad-chart-wide">
                <div className="ad-chart-title">Monthly Revenue Trend</div>
                <div className="ad-chart-area">
                  {revenueTrend.length > 0 ? (
                    <Line
                      options={chartOptions}
                      data={{
                        labels: revenueTrend.map((r) => r.month),
                        datasets: [
                          {
                            label: "Revenue",
                            data: revenueTrend.map((r) => r.revenue),
                            tension: 0.35,
                          },
                        ],
                      }}
                    />
                  ) : (
                    <div className="ad-empty">
                      No revenue trend data. (Backend endpoint{" "}
                      <code>/admin/revenue-trend</code> not available.)
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* LOGS */}
          {activeTab === "LOGS" && (
            <>
              <div className="ad-panel-head">
                <h2>Administrative Logs</h2>
                <button
                  className="ad-btn ad-btn-ghost"
                  onClick={() => downloadCSV("export/logs", "admin_logs.csv")}
                >
                  Export Logs CSV
                </button>
              </div>

              <div className="ad-filters">
                <input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Search logs by action, admin email, target…"
                />
              </div>

              {filteredLogs.length === 0 ? (
                <div className="ad-empty">No logs loaded.</div>
              ) : (
                <div className="ad-table-wrap">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Admin</th>
                        <th>Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((l, idx) => (
                        <tr key={l.id || idx}>
                          <td>{l.createdAt || l.created_at || "-"}</td>
                          <td>{l.action || "-"}</td>
                          <td>{l.admin_email || l.adminEmail || "-"}</td>
                          <td>{l.target || l.target_email || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
