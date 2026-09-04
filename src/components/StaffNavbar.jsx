import { NavLink, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Home,
  ClipboardCheck,
  Users,
  BarChart3,
  UserPlus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import "./StaffNavbar.css";

export default function StaffNavbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userProfile");
    navigate("/login", { replace: true });
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="staff-dash-header">

      {/* BRAND */}
      <div className="staff-brand">
        <div className="staff-icon-badge">
          <ShieldCheck size={22} strokeWidth={2.5} />
        </div>

        <div className="staff-brand-text">
          <h2>Faculty Portal</h2>
          <span>Academic Management & Administration</span>
        </div>
      </div>

      {/* DESKTOP NAV */}
      <nav className="staff-nav-links">

        <NavLink
          to="/staff-dashboard"
          onClick={closeMenu}
          className={({ isActive }) =>
            isActive ? "staff-nav-link active" : "staff-nav-link"
          }
        >
          <Home size={17} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/a"
          onClick={closeMenu}
          className={({ isActive }) =>
            isActive ? "staff-nav-link active" : "staff-nav-link"
          }
        >
          <ClipboardCheck size={17} />
          <span>Attendance</span>
        </NavLink>

        <NavLink
          to="/d"
          onClick={closeMenu}
          className={({ isActive }) =>
            isActive ? "staff-nav-link active" : "staff-nav-link"
          }
        >
          <Users size={17} />
          <span>Records</span>
        </NavLink>

        <NavLink
          to="/ad"
          onClick={closeMenu}
          className={({ isActive }) =>
            isActive ? "staff-nav-link active" : "staff-nav-link"
          }
        >
          <BarChart3 size={17} />
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/"
          onClick={closeMenu}
          className={({ isActive }) =>
            isActive ? "staff-nav-link active" : "staff-nav-link"
          }
        >
          <UserPlus size={17} />
          <span>New Registration</span>
        </NavLink>

      </nav>

      {/* DESKTOP LOGOUT */}
      <button
        type="button"
        className="staff-logout-btn desktop-logout"
        onClick={handleLogout}
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>

      {/* MOBILE HAMBURGER */}
      <button
        type="button"
        className="staff-menu-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={25} /> : <Menu size={25} />}
      </button>

      {/* MOBILE MENU */}
      <div className={`staff-mobile-menu ${menuOpen ? "show" : ""}`}>

        <div className="mobile-menu-inner">

          <NavLink
            to="/staff-dashboard"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            <Home size={20} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/a"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            <ClipboardCheck size={20} />
            <span>Attendance</span>
          </NavLink>

          <NavLink
            to="/d"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            <Users size={20} />
            <span>Records</span>
          </NavLink>

          <NavLink
            to="/ad"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/"
            onClick={closeMenu}
            className={({ isActive }) =>
              isActive
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            <UserPlus size={20} />
            <span>New Registration</span>
          </NavLink>

          <div className="mobile-menu-divider" />

          <button
            type="button"
            className="mobile-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>

        </div>
      </div>

    </header>
  );
}