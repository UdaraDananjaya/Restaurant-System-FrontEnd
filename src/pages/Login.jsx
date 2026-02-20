import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        email,
        password,
      });

      console.log("Login response:", res.data);

      // ✅ MATCHES UPDATED BACKEND RESPONSE
      const { token, role, name, status, id } = res.data;

      // Store auth data
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("name", name);
      if (status) localStorage.setItem("status", status);
      if (id) localStorage.setItem("userId", String(id));

      // Role-based redirect
      if (role === "ADMIN") navigate("/admin");
      else if (role === "SELLER") navigate("/seller");
      else if (role === "CUSTOMER") navigate("/customer");
      else navigate("/");
    } catch (err) {
      console.error("Login error:", err.response?.data);

      alert(
        err.response?.data?.message ||
          "Invalid credentials or account not approved yet",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login</h2>
        <p className="subtitle">Sign in to access your DineSmart account</p>

        {/* Email */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>

        <div className="links">
          <Link to="/register">Create an account</Link>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
