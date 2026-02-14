import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [approvingId, setApprovingId] = useState(null);

  const adminName = localStorage.getItem("name");

  /* ================= LOAD DATA ================= */

  const normalizeStatus = (status, role) => {
    if (role === "SELLER" && (!status || status.trim() === "")) {
      return "PENDING";
    }
    return status;
  };

  const loadAll = async () => {
    try {
      const [u] = await Promise.all([api.get("/admin/users")]);

      //    const [u, r, o, f, uc, a, rev] = await Promise.all([
      //   api.get("/admin/users"),
      //   api.get("/admin/restaurants"),
      //   api.get("/admin/orders"),
      //   api.get("/admin/fast-moving-restaurants"),
      //   api.get("/admin/user-distribution"),
      //   api.get("/admin/analytics"),
      //   api.get("/admin/revenue-trend"),
      // ]);

      const normalizedUsers = (u.data || []).map((user) => ({
        ...user,
        status: normalizeStatus(user.status, user.role),
      }));

      setUsers(normalizedUsers);
      console.log("USERS FROM API:", normalizedUsers);

      // setUsers(u || []);
      setRestaurants(r.data || []);
      setOrders(o.data || []);
      setFastMoving(f.data || []);
      setUserChart(uc.data || null);
      setStats(a.data || {});
      setRevenueTrend(rev.data || []);
    } catch (err) {
      console.error("Admin dashboard load error", err);
      alert("Failed to load admin dashboard data");
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

      const response = await fetch(
        `http://localhost:5000/api/admin/${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("CSV export failed", err);
      alert("Failed to export CSV");
    }
  };

  if (loading) {
    return <p style={{ color: "white" }}>Loading admin dashboard...</p>;
  }

  /* ================= DERIVED ================= */

  const sellers = users.filter((u) => u.role === "SELLER");
  const customers = users.filter((u) => u.role === "CUSTOMER");
  const pendingSellers = sellers.filter((s) => s.status === "PENDING");

  const renderStatusBadge = (status) => (
    <span className={`status-badge ${status?.toLowerCase()}`}>{status}</span>
  );

  return (
    <div className={`admin-container ${darkMode ? "dark" : "light"}`}>
      {/* ================= HEADER ================= */}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>

        <div className="admin-right">
          <button
            className="mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>

          <div className="profile-box">
            <div
              className="profile-avatar"
              onClick={() => setShowProfile(!showProfile)}
            >
              {adminName?.charAt(0)}
            </div>

            {showProfile && (
              <div className="profile-dropdown">
                <p>
                  <strong>{adminName}</strong>
                </p>
                <button
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

      {successMsg && <div className="success-box">✅ {successMsg}</div>}

      {/* ================= KPI SUMMARY ================= */}
      <div className="summary-grid">
        <div className="card">
          <span>Total Users</span>
          <strong>
            <CountUp end={stats.totalUsers || 0} duration={1.5} />
          </strong>
        </div>

        <div className="card">
          <span>Sellers</span>
          <strong>
            <CountUp end={sellers.length} duration={1.5} />
          </strong>
        </div>

        <div className="card">
          <span>Customers</span>
          <strong>
            <CountUp end={customers.length} duration={1.5} />
          </strong>
        </div>

        <div className="card">
          <span>Restaurants</span>
          <strong>
            <CountUp end={stats.totalRestaurants || 0} duration={1.5} />
          </strong>
        </div>

        <div className="card">
          <span>Orders</span>
          <strong>
            <CountUp end={stats.totalOrders || 0} duration={1.5} />
          </strong>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="tabs">
        {[
          { key: "PENDING", label: "Pending Sellers" },
          { key: "USERS", label: "Users" },
          { key: "RESTAURANTS", label: "Restaurants" },
          { key: "ORDERS", label: "Orders" },
          { key: "ANALYTICS", label: "Analytics" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= TAB CONTENT ================= */}
      <div className="tab-content">
        {/* PENDING SELLERS */}
        {activeTab === "PENDING" && (
          <>
            <h2>Pending Seller Requests</h2>

            {pendingSellers.length === 0 && <p>No pending sellers.</p>}

            {pendingSellers.map((s) => (
              <div key={s.id} className="row">
                <span>
                  {s.email} {renderStatusBadge(s.status)}
                </span>

                <div>
                  <button
                    disabled={approvingId === s.id}
                    onClick={async () => {
                      setApprovingId(s.id);
                      await api.put(`/admin/users/${s.id}/approve`);
                      setSuccessMsg("Seller approved successfully");
                      setApprovingId(null);
                      loadAll();
                    }}
                  >
                    {approvingId === s.id ? "Approving..." : "Approve"}
                  </button>

                  <button
                    style={{ marginLeft: "10px", background: "#dc2626" }}
                    onClick={async () => {
                      await api.put(`/admin/users/${s.id}/reject`);
                      setSuccessMsg("Seller rejected successfully");
                      loadAll();
                    }}
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
            <h2>All Users</h2>

            <div className="export-buttons">
              <button onClick={() => downloadCSV("export/users", "users.csv")}>
                Export Users CSV
              </button>
              <button
                onClick={() => downloadCSV("export/logs", "admin_logs.csv")}
              >
                Export Logs CSV
              </button>
            </div>

            {users.map((u) => (
              <div key={u.id} className="row">
                <span>
                  {u.email} — {u.role} {renderStatusBadge(u.status)}
                </span>
              </div>
            ))}
          </>
        )}

        {/* ORDERS */}
        {activeTab === "ORDERS" && (
          <>
            <h2>All Orders</h2>

            <button
              onClick={() => downloadCSV("export/orders", "orders.csv")}
              style={{ marginBottom: "15px" }}
            >
              Export Orders CSV
            </button>

            <table>
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
                    <td>{o.customerEmail}</td>
                    <td>{o.sellerEmail}</td>
                    <td>{o.restaurantName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ANALYTICS */}
        {activeTab === "ANALYTICS" && (
          <div className="analytics-grid">
            <div className="chart-box">
              <h2>User Distribution</h2>
              {userChart && <Pie data={userChart} />}
            </div>

            <div className="chart-box bar-chart">
              <h2>Fast-Moving Restaurants</h2>
              <Bar
                data={{
                  labels: fastMoving.map((f) => f.restaurant),
                  datasets: [
                    {
                      label: "Orders",
                      data: fastMoving.map((f) => f.orders),
                      backgroundColor: "#2563eb",
                    },
                  ],
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= REVENUE TREND ================= */}
      <div className="chart-box">
        <h2>Monthly Revenue Trend</h2>
        <Line
          data={{
            labels: revenueTrend.map((r) => r.month),
            datasets: [
              {
                label: "Revenue",
                data: revenueTrend.map((r) => r.revenue),
                borderColor: "#16a34a",
                backgroundColor: "rgba(22,163,74,0.2)",
                tension: 0.4,
              },
            ],
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
