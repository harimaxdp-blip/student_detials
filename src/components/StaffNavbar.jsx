import { NavLink, useNavigate } from "react-router-dom";

import {
  ShieldCheck,
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

    // Role
    localStorage.removeItem("userRole");

    // Student
    localStorage.removeItem("studentId");
    localStorage.removeItem("studentEmail");
    localStorage.removeItem("studentMobile");
    localStorage.removeItem("studentUser");

    // Common
    localStorage.removeItem("uid");
    localStorage.removeItem("userProfile");

    // Staff
    localStorage.removeItem("staffId");
    localStorage.removeItem("staffEmail");

    setMenuOpen(false);

    navigate("/login", {
      replace: true,
    });
  };


  // ============================================================
  // CLOSE MOBILE MENU
  // ============================================================

  const closeMenu = () => {
    setMenuOpen(false);
  };


  // ============================================================
  // NAV LINK CLASS
  // ============================================================

  const desktopLinkClass = ({ isActive }) =>
    isActive
      ? "staff-nav-link active"
      : "staff-nav-link";


  const mobileLinkClass = ({ isActive }) =>
    isActive
      ? "mobile-nav-link active"
      : "mobile-nav-link";


  // ============================================================
  // RETURN
  // ============================================================

  return (
    <header className="staff-dash-header">

      {/* ======================================================
          BRAND
      ======================================================= */}

      <div className="staff-brand">

        <div className="staff-icon-badge">
          <ShieldCheck
            size={22}
            strokeWidth={2.5}
          />
        </div>

        <div className="staff-brand-text">

          <h2>
            Faculty Portal
          </h2>

          <span>
            Academic Management & Administration
          </span>

        </div>

      </div>


      {/* ======================================================
          DESKTOP NAVIGATION
      ======================================================= */}

      <nav className="staff-nav-links">

        {/* HOME */}

        <NavLink
          to="/staff-dashboard"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <Home size={17} />
          <span>
            Home
          </span>
        </NavLink>


        {/* ATTENDANCE */}

        <NavLink
          to="/a"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <ClipboardCheck size={17} />
          <span>
            Attendance
          </span>
        </NavLink>


        {/* RECORDS */}

        <NavLink
          to="/d"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <Users size={17} />
          <span>
            Records
          </span>
        </NavLink>


        {/* ANALYTICS */}

        <NavLink
          to="/ad"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <BarChart3 size={17} />
          <span>
            Analytics
          </span>
        </NavLink>


        {/* CLASS INCHARGE */}

        <NavLink
          to="/class-incharge"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <GraduationCap size={17} />

          <span>
            Class Incharge
          </span>

        </NavLink>


        {/* NEW REGISTRATION */}

        <NavLink
          to="/student-registration"
          onClick={closeMenu}
          className={desktopLinkClass}
        >
          <UserPlus size={17} />

          <span>
            New Registration
          </span>

        </NavLink>

      </nav>


      {/* ======================================================
          DESKTOP LOGOUT
      ======================================================= */}

      <button
        type="button"
        className="staff-logout-btn desktop-logout"
        onClick={handleLogout}
      >

        <LogOut size={16} />

        <span>
          Logout
        </span>

      </button>


      {/* ======================================================
          MOBILE MENU BUTTON
      ======================================================= */}

      <button
        type="button"
        className="staff-menu-btn"
        onClick={() =>
          setMenuOpen((prev) => !prev)
        }
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >

        {menuOpen ? (
          <X size={25} />
        ) : (
          <Menu size={25} />
        )}

      </button>


      {/* ======================================================
          MOBILE MENU
      ======================================================= */}

      <div
        className={`staff-mobile-menu ${
          menuOpen ? "show" : ""
        }`}
      >

        <div className="mobile-menu-inner">


          {/* HOME */}

          <NavLink
            to="/staff-dashboard"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <Home size={20} />

            <span>
              Home
            </span>

          </NavLink>


          {/* ATTENDANCE */}

          <NavLink
            to="/a"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <ClipboardCheck size={20} />

            <span>
              Attendance
            </span>

          </NavLink>


          {/* RECORDS */}

          <NavLink
            to="/d"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <Users size={20} />

            <span>
              Records
            </span>

          </NavLink>


          {/* ANALYTICS */}

          <NavLink
            to="/ad"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <BarChart3 size={20} />

            <span>
              Analytics
            </span>

          </NavLink>


          {/* CLASS INCHARGE */}

          <NavLink
            to="/class-incharge"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <GraduationCap size={20} />

            <span>
              Class Incharge
            </span>

          </NavLink>


          {/* NEW REGISTRATION */}

          <NavLink
            to="/student-registration"
            onClick={closeMenu}
            className={mobileLinkClass}
          >

            <UserPlus size={20} />

            <span>
              New Registration
            </span>

          </NavLink>


          {/* DIVIDER */}

          <div className="mobile-menu-divider" />


          {/* LOGOUT */}

          <button
            type="button"
            className="mobile-logout-btn"
            onClick={handleLogout}
          >

            <LogOut size={20} />

            <span>
              Logout
            </span>

          </button>

        </div>

      </div>

    </header>
  );
}