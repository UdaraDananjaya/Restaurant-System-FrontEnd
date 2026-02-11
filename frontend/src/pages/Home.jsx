import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-full">
      <div className="home-overlay" />

      <div className="home-inner">
        <h1 className="brand">DineSmart</h1>

        <h2 className="tagline">
          Smart Restaurant Recommendation & Management System
        </h2>

        <p className="description">
          A modern web-based platform that enhances restaurant discovery,
          streamlines restaurant and order management, and supports data-driven
          decision making through analytics and demand forecasting.
        </p>

        <div className="actions">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>

          <Link to="/register" className="btn btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
