import { BrowserRouter, Route, Routes } from "react-router-dom";

/* Public pages */
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

/* Dashboards (FIXED PATHS) */
import AdminDashboard from "./pages/admin/AdminDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import SellerDashboard from "./pages/seller/SellerDashboard";

/* Route protection */
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Seller */}
        <Route
          path="/seller"
          element={
            <ProtectedRoute role="SELLER">
              <SellerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Customer */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute role="CUSTOMER">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
