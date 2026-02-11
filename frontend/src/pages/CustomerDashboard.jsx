import { useEffect, useState } from "react";
import api from "../api/api";

const CustomerDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    api.get("/customer/restaurants").then((res) => setRestaurants(res.data));
  }, []);

  return (
    <div>
      <h2>Customer Dashboard</h2>

      <ul>
        {restaurants.map((r) => (
          <li key={r.id}>
            {r.name} – {r.category}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CustomerDashboard;
