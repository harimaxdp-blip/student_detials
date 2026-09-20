import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut, getAuth } from "firebase/auth";
import {
  BookOpen,
  Home,
  FileSpreadsheet,
  ShieldCheck,
  ChevronDown,
  X,
  Menu,
  KeyRound,
  LogOut,
} from "lucide-react";
import { clearLoginSession } from "../App";

export default function StudentNavbar({
  student,
  isClassIncharge,
  openPasswordModal,
}) {
  const auth = getAuth();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      await signOut(auth);
    } catch (error) {
      console.log("Session signout error:", error);
    } finally {
      clearLoginSession();
      navigate("/login", { replace: true });
    }
  };

  const studentName =
    student?.fullName || student?.name || student?.studentName || "Student";
  const studentEmail =
    student?.email || student?.studentEmail || "Registered Student";
  const regNo =
    student?.registerNumber ||
    student?.regNo ||
    student?.registerNo ||
    student?.rollNo ||
    "-";
  const deptName =
    student?.department || student?.course || student?.dept || "-";

  return (
    <>
      <header className="sdb-topbar">
        <div className="sdb-brand">
          <button
            type="button"
            className="sdb-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="sdb-brand-icon">
            <BookOpen size={20} />
          </div>
          <div className="sdb-brand-text">
            <strong>Faculty Portal</strong>
            <span>Student & Incharge Hub</span>
          </div>
        </div>

        <nav className="sdb-nav-tabs">
          <NavLink
            to="/student-dashboard"
            className={({ isActive }) =>
              `sdb-tab-btn ${isActive ? "active" : ""}`
            }
          >
            <Home size={15} />
            <span>Home</span>
          </NavLink>
        </nav>

        <div className="sdb-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`sdb-profile-chip ${profileOpen ? "is-open" : ""}`}
            onClick={() => setProfileOpen((val) => !val)}
            aria-label="Open profile options"
          >
            <div className="sdb-chip-avatar">
              {student?.imageUrl ? (
                <img src={student.imageUrl} alt={studentName} />
              ) : (
                studentName.charAt(0).toUpperCase()
              )}
              <span className="sdb-chip-status-dot" />
            </div>
            <div className="sdb-chip-info">
              <span className="sdb-chip-name">{studentName}</span>
              <span className="sdb-chip-dept">{deptName}</span>
            </div>
            <ChevronDown size={14} className="sdb-chip-chevron" />
          </button>

          {profileOpen && (
            <div className="sdb-profile-menu">
              <div className="sdb-menu-user-card">
                <div className="sdb-menu-user-avatar">
                  {student?.imageUrl ? (
                    <img src={student.imageUrl} alt={studentName} />
                  ) : (
                    studentName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="sdb-menu-user-details">
                  <h4>{studentName}</h4>
                  <p>{studentEmail}</p>
                  <span className="sdb-menu-badge">{regNo}</span>
                </div>
              </div>

              <div className="sdb-menu-divider" />

              {openPasswordModal && (
                <button
                  type="button"
                  className="sdb-menu-item"
                  onClick={() => {
                    setProfileOpen(false);
                    openPasswordModal();
                  }}
                >
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </button>
              )}

              <button
                type="button"
                className="sdb-menu-item logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="sdb-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="sdb-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sdb-drawer-header">
              <div className="sdb-drawer-user">
                <div className="sdb-drawer-avatar">
                  {student?.imageUrl ? (
                    <img src={student.imageUrl} alt={studentName} />
                  ) : (
                    studentName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{studentName}</strong>
                  <span>{regNo}</span>
                </div>
              </div>
              <button
                type="button"
                className="sdb-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="sdb-drawer-nav">
              <NavLink
                to="/student-dashboard"
                className={({ isActive }) =>
                  `sdb-drawer-item ${isActive ? "active" : ""}`
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home size={18} />
                <span>Dashboard Home</span>
              </NavLink>

              <div className="sdb-menu-divider" style={{ margin: "14px 0" }} />

              <button
                type="button"
                className="sdb-drawer-item logout"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}