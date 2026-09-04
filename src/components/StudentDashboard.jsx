import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  GraduationCap,
  LogOut,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  UserRoundX,
  Home,
  User,
  Phone,
  Mail,
  BookOpen,
} from "lucide-react";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const rawData = localStorage.getItem("studentUser");
  const student = rawData ? JSON.parse(rawData) : null;

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if session is missing
  useEffect(() => {
    if (!student) {
      navigate("/login", { replace: true });
    }
  }, [student, navigate]);

  // Listen to attendance updates
  useEffect(() => {
    if (!student?.id) return;

    const attendanceRef = collection(db, "attendance");
    const unsub = onSnapshot(
      attendanceRef,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setAttendanceRecords(list);
        setLoading(false);
      },
      (error) => {
        console.error("Attendance listener error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [student?.id]);

  if (!student) return null;

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("studentUser");
    navigate("/login", { replace: true });
  };

  // Compute live student attendance
  const isHybrid =
    student.studyMode === "hybrid" || student.isHybrid === true;

  const classRecords = attendanceRecords.filter((rec) => {
    const type = String(rec.t || "").toLowerCase();
    return type === "c" || type === "class";
  });

  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;

  classRecords.forEach((rec) => {
    const status = rec.s?.[student.id];
    if (status) {
      workingDays++;
      if (status === "p") {
        presentDays++;
      } else if (status === "a") {
        absentDays++;
      } else if (status === "l") {
        lateDays++;
        presentDays++;
      }
    }
  });

  const percentage =
    workingDays > 0 ? Number(((presentDays / workingDays) * 100).toFixed(1)) : 0;
  const isLow = percentage < 75;

  return (
    <div className="sd-wrapper">
      {/* Top Navigation */}
      <header className="sd-nav">
        <div className="sd-brand">
          <div className="sd-avatar">
            <GraduationCap size={22} />
          </div>
          <div>
            <h2>{student.fullName || student.name || "Student"}</h2>
            <span>{student.course || "Student Portal"}</span>
          </div>
        </div>

        <button type="button" className="sd-logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="sd-content">
        {/* Attendance Banner */}
        <section className="sd-banner">
          <div className="sd-banner-info">
            <span className="sd-label">Current Academic Standing</span>
            <h3>Cumulative Cloud Attendance</h3>
            <p>
              {isHybrid
                ? "You are enrolled under Hybrid Mode (Study from home)."
                : "Tracking all verified in-person sessions."}
            </p>
          </div>

          <div
            className={`sd-percent-circle ${
              isLow ? "status-low" : "status-good"
            }`}
          >
            <strong>{percentage}%</strong>
            <span>
              {isLow ? (
                <>
                  <AlertTriangle size={13} /> Below 75%
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} /> Good
                </>
              )}
            </span>
          </div>
        </section>

        {/* Quick Stats Grid */}
        <div className="sd-stats-grid">
          <div className="sd-stat-card">
            <div className="sd-stat-icon gray">
              <Calendar size={20} />
            </div>
            <div>
              <strong>{workingDays}</strong>
              <span>Working Days</span>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <strong>{presentDays}</strong>
              <span>Present Days</span>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon red">
              <UserRoundX size={20} />
            </div>
            <div>
              <strong>{absentDays}</strong>
              <span>Absent Days</span>
            </div>
          </div>

          <div className="sd-stat-card">
            <div className="sd-stat-icon yellow">
              <Clock3 size={20} />
            </div>
            <div>
              <strong>{lateDays}</strong>
              <span>Late Sessions</span>
            </div>
          </div>
        </div>

        {/* Profile Details Card */}
        <section className="sd-profile-card">
          <h4>
            <User size={18} /> Student Information
          </h4>

          <div className="sd-info-grid">
            <div>
              <label>Full Name</label>
              <strong>{student.fullName || "—"}</strong>
            </div>

            <div>
              <label>Register Number</label>
              <strong>{student.registerNumber || student.regNo || "—"}</strong>
            </div>

            <div>
              <label>Department / Course</label>
              <strong>{student.course || "—"}</strong>
            </div>

            <div>
              <label>Study Mode</label>
              <strong>
                {isHybrid ? (
                  <span className="sd-hybrid-tag">
                    <Home size={13} /> Hybrid (Home)
                  </span>
                ) : (
                  "Regular (In-Person)"
                )}
              </strong>
            </div>

            <div>
              <label>Registered Email</label>
              <strong>{student.studentEmail || student.email || "—"}</strong>
            </div>

            <div>
              <label>Contact Mobile</label>
              <strong>{student.studentMobile || "—"}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}