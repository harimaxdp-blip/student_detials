import { NavLink, useNavigate, Link } from "react-router-dom";
import {
  Home,
  ClipboardCheck,
  Users,
  BarChart3,
  UserPlus,
  GraduationCap,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import "./StaffNavbar.css";

export default function StaffNavbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    // Clear user session keys
    const sessionKeys = [
      "userRole",
      "studentId",
      "studentEmail",
      "studentMobile",
      "studentUser",
      "uid",
      "userProfile",
      "staffId",
      "staffEmail",
    ];
    sessionKeys.forEach((key) => localStorage.removeItem(key));

    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  const desktopLinkClass = ({ isActive }) =>
    isActive ? "staff-nav-link active" : "staff-nav-link";

  const mobileLinkClass = ({ isActive }) =>
    isActive ? "mobile-nav-link active" : "mobile-nav-link";

  return (
    <header className="staff-dash-header">
      <div className="staff-header-container">
        {/* ======================================================
            BRAND WITH LOGO (PUBLIC FOLDER: /app-logo.png)
        ======================================================= */}
        <Link
          to="/staff-dashboard"
          className="staff-brand"
          onClick={closeMenu}
        >
          <div className="staff-logo-wrapper">
            <img
              src="/app-logo.png"
              alt="Application Logo"
              className="staff-logo-img"
            />
          </div>
          <div className="staff-brand-text">
            <h2>Faculty Portal</h2>
            <span>Academic Management &amp; Administration</span>
          </div>
        </Link>

        {/* ======================================================
            DESKTOP NAVIGATION
        ======================================================= */}
        <nav className="staff-nav-links" aria-label="Main Navigation">
          <NavLink
            to="/staff-dashboard"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <Home size={18} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/a"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <ClipboardCheck size={18} />
            <span>Attendance</span>
          </NavLink>

          <NavLink
            to="/d"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <Users size={18} />
            <span>Records</span>
          </NavLink>

          <NavLink
            to="/ad"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/class-incharge"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <GraduationCap size={18} />
            <span>Class Incharge</span>
          </NavLink>

          <NavLink
            to="/student-registration"
            onClick={closeMenu}
            className={desktopLinkClass}
          >
            <UserPlus size={18} />
            <span>New Registration</span>
          </NavLink>
        </nav>

        {/* ======================================================
            DESKTOP LOGOUT & ACTIONS
        ======================================================= */}
        <div className="staff-nav-actions">
          <button
            type="button"
            className="staff-logout-btn desktop-logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>

          {/* MOBILE TOGGLE BUTTON */}
          <button
            type="button"
            className="staff-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ======================================================
          MOBILE MENU OVERLAY & DRAWER
      ======================================================= */}
      {menuOpen && (
        <div className="staff-mobile-backdrop" onClick={closeMenu} />
      )}

      <div className={`staff-mobile-menu ${menuOpen ? "show" : ""}`}>
        <div className="mobile-menu-inner">
          <NavLink
            to="/staff-dashboard"
            onClick={closeMenu}
            className={mobileLinkClass}
          >
            <Home size={20} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/a"
            onClick={closeMenu}
            className={mobileLinkClass}
          >
            <ClipboardCheck size={20} />
            <span>Attendance</span>
          </NavLink>

          <NavLink
            to="/d"
            onClick={closeMenu}
            className={mobileLinkClass}
          >
            <Users size={20} />
            <span>Records</span>
          </NavLink>

          <NavLink
            to="/ad"
            onClick={closeMenu}
            className={mobileLinkClass}
          >
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>

          <NavLink
            to="/class-incharge"
            onClick={closeMenu}
            className={mobileLinkClass}
          >
            <GraduationCap size={20} />
            <span>Class Incharge</span>
          </NavLink>

          <NavLink
            to="/student-registration"
            onClick={closeMenu}
            className={mobileLinkClass}
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