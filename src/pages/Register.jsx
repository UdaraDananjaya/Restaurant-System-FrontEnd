import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Register.css";

/**
 * Frontend-only Register
 * - Stores user registration data into localStorage for now
 * - Later you can connect backend easily (payload already prepared)
 */

const Register = () => {
  const navigate = useNavigate();

  const dietaryOptions = useMemo(
    () => ["Halal", "Non-Veg", "Veg", "Vegan", "Gluten-Free", "Dairy-Free"],
    [],
  );

  const cuisineOptions = useMemo(
    () => [
      "Sri Lankan",
      "Indian",
      "Chinese",
      "Italian",
      "Thai",
      "Japanese",
      "Fast Food",
      "Middle Eastern",
      "Seafood",
      "Other",
    ],
    [],
  );

  const genderOptions = useMemo(() => ["Male", "Female", "Other"], []);

  const [form, setForm] = useState({
    role: "CUSTOMER",
    name: "",
    email: "",
    password: "",

    // customer
    age: "",
    gender: "",
    genderOtherText: "",
    dietaryPref: [],
    favoriteCuisine: "",
    favoriteCuisineOther: "",

    // seller
    restaurantName: "",
    contactNumber: "",
    restaurantAddress: "",
    restaurantCuisines: [],
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      // If user changed favoriteCuisine away from Other, clear custom text
      if (name === "favoriteCuisine" && value !== "Other") {
        next.favoriteCuisineOther = "";
      }

      // If user changed gender away from Other, clear custom gender text
      if (name === "gender" && value !== "Other") {
        next.genderOtherText = "";
      }

      return next;
    });
  };

  const toggleMulti = (field, value) => {
    setForm((prev) => {
      const exists = prev[field].includes(value);
      return {
        ...prev,
        [field]: exists
          ? prev[field].filter((v) => v !== value)
          : [...prev[field], value],
      };
    });
  };

  const getFinalFavoriteCuisine = () => {
    if (form.favoriteCuisine === "Other") {
      return (form.favoriteCuisineOther || "").trim();
    }
    return form.favoriteCuisine;
  };

  const validate = () => {
    const { role, name, email, password } = form;

    if (!name || !email || !password || !role) {
      return "Please fill all required fields (Name, Email, Password).";
    }

    if (role === "CUSTOMER") {
      const { age, gender, dietaryPref, favoriteCuisine, genderOtherText } =
        form;

      if (!age || Number(age) <= 0) return "Please enter a valid Age.";
      if (!gender) return "Please select Gender.";
      if (gender === "Other" && !(genderOtherText || "").trim())
        return "Please specify your Gender (Other).";
      if (!dietaryPref || dietaryPref.length === 0)
        return "Please select at least one Dietary Preference.";
      if (!favoriteCuisine) return "Please select Favorite Cuisine.";

      // ✅ If Other selected, require text input
      if (favoriteCuisine === "Other") {
        const v = (form.favoriteCuisineOther || "").trim();
        if (!v) return "Please enter your Favorite Cuisine (Other).";
      }
    }

    if (role === "SELLER") {
      const {
        restaurantName,
        contactNumber,
        restaurantAddress,
        restaurantCuisines,
      } = form;

      if (!restaurantName) return "Restaurant Name is required for sellers.";
      if (!contactNumber) return "Contact Number is required for sellers.";
      if (!restaurantAddress) return "Restaurant Address/Area is required.";
      if (!restaurantCuisines || restaurantCuisines.length === 0)
        return "Please select at least one Restaurant Cuisine type.";
    }

    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      setLoading(true);

      // ✅ Backend payload (matches backend auth.controller.js)
      const payload = {
        role: form.role,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,

        // customer
        age: form.role === "CUSTOMER" ? Number(form.age) : undefined,
        gender: form.role === "CUSTOMER" ? form.gender : undefined,
        genderOtherText:
          form.role === "CUSTOMER" && form.gender === "Other"
            ? (form.genderOtherText || "").trim()
            : undefined,
        dietaryPref: form.role === "CUSTOMER" ? form.dietaryPref : undefined,
        favoriteCuisine:
          form.role === "CUSTOMER" ? getFinalFavoriteCuisine() : undefined,

        // seller
        restaurantName:
          form.role === "SELLER" ? form.restaurantName : undefined,
        contactNumber: form.role === "SELLER" ? form.contactNumber : undefined,
        restaurantAddress:
          form.role === "SELLER" ? form.restaurantAddress : undefined,
        restaurantCuisines:
          form.role === "SELLER" ? form.restaurantCuisines : undefined,
      };

      // Remove undefined fields (clean request)
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );

      const res = await api.post("/auth/register", payload);

      alert(
        res?.data?.message ||
          (form.role === "SELLER"
            ? "Seller registered successfully. Awaiting admin approval."
            : "Customer registered successfully."),
      );

      navigate("/login");
    } catch (err) {
      console.error("Register error:", err.response?.data || err);
      alert(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Create an Account</h2>
        <p className="subtitle">Register as a customer or seller</p>

        {/* Role */}
        <div className="form-group">
          <label>Register As</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="CUSTOMER">Customer</option>
            <option value="SELLER">Seller</option>
          </select>
        </div>

        {/* Name */}
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your name"
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="example@email.com"
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
          />
        </div>

        {/* CUSTOMER fields */}
        {form.role === "CUSTOMER" && (
          <>
            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                placeholder="e.g., 25"
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                {genderOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Show text input only when Gender is Other */}
            {form.gender === "Other" && (
              <div className="form-group">
                <label>Please specify Gender *</label>
                <input
                  type="text"
                  name="genderOtherText"
                  value={form.genderOtherText}
                  onChange={handleChange}
                  placeholder="Type your gender"
                />
              </div>
            )}

            <div className="form-group">
              <label>Dietary Preferences * (select at least one)</label>

              <div className="checkbox-grid">
                {dietaryOptions.map((opt) => (
                  <label
                    key={opt}
                    className={`checkbox-item ${
                      form.dietaryPref.includes(opt) ? "checked" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.dietaryPref.includes(opt)}
                      onChange={() => toggleMulti("dietaryPref", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Favorite Cuisine *</label>
              <select
                name="favoriteCuisine"
                value={form.favoriteCuisine}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {cuisineOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Show text input only when Other selected */}
            {form.favoriteCuisine === "Other" && (
              <div className="form-group">
                <label>Please specify Favorite Cuisine *</label>
                <input
                  type="text"
                  name="favoriteCuisineOther"
                  value={form.favoriteCuisineOther}
                  onChange={handleChange}
                  placeholder="e.g., Korean, Mexican, Arabic..."
                />
              </div>
            )}
          </>
        )}

        {/* SELLER fields */}
        {form.role === "SELLER" && (
          <>
            <div className="form-group">
              <label>Restaurant Name *</label>
              <input
                type="text"
                name="restaurantName"
                value={form.restaurantName}
                onChange={handleChange}
                placeholder="Restaurant name"
              />
            </div>

            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="text"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                placeholder="07XXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label>Restaurant Address / Area *</label>
              <input
                type="text"
                name="restaurantAddress"
                value={form.restaurantAddress}
                onChange={handleChange}
                placeholder="e.g., Colombo 03, Kollupitiya"
              />
            </div>

            <div className="form-group">
              <label>Restaurant Cuisine Types * (select at least one)</label>

              <div className="checkbox-grid">
                {cuisineOptions
                  .filter(
                    (c) => c !== "Other",
                  ) /* sellers pick from list only */
                  .map((opt) => (
                    <label
                      key={opt}
                      className={`checkbox-item ${
                        form.restaurantCuisines.includes(opt) ? "checked" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.restaurantCuisines.includes(opt)}
                        onChange={() => toggleMulti("restaurantCuisines", opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
              </div>
            </div>
          </>
        )}

        <button
          className="register-btn"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Register"}
        </button>

        <div className="links">
          <Link to="/login">Already have an account? Login</Link>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
