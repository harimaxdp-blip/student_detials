import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  Users,
  ClipboardCheck,
  BarChart3,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [attendanceRecordsCount, setAttendanceRecordsCount] = useState(0);

  useEffect(() => {
    // Listen to real-time student count
    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      setTotalStudents(snapshot.size);
    });

    // Listen to real-time attendance sessions
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snapshot) => {
      setAttendanceRecordsCount(snapshot.size);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, []);

  return (
    <div className="staff-dash-container">
      <main className="staff-dash-main">
        {/* Metric Summary Strip */}
        <section className="staff-summary-grid">
          <div className="staff-metric-card">
            <div className="metric-icon-box blue">
              <Users size={22} />
            </div>
            <div>
              <h3>{totalStudents}</h3>
              <p>Registered Students</p>
            </div>
          </div>

          <div className="staff-metric-card">
            <div className="metric-icon-box green">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h3>{attendanceRecordsCount}</h3>
              <p>Attendance Logs Recorded</p>
            </div>
          </div>
        </section>

        {/* Action Modules */}
        <h3 className="section-heading">Quick Actions</h3>
        <section className="staff-actions-grid">
          {/* Daily Attendance */}
          <Link to="/a" className="action-card highlight">
            <div className="action-header">
              <div className="action-icon">
                <ClipboardCheck size={24} />
              </div>
              <ArrowRight size={18} className="arrow-icon" />
            </div>
            <h4>Take Daily Attendance</h4>
            <p>Mark daily session attendance for CS & AIDS departments or log holidays.</p>
          </Link>

          {/* Student Records */}
          <Link to="/d" className="action-card">
            <div className="action-header">
              <div className="action-icon">
                <Users size={24} />
              </div>
              <ArrowRight size={18} className="arrow-icon" />
            </div>
            <h4>Student Records</h4>
            <p>View complete profiles, edit details, toggle hybrid mode, and inspect attendance scores.</p>
          </Link>

          {/* Attendance Dashboard & Analytics */}
          <Link to="/ad" className="action-card">
            <div className="action-header">
              <div className="action-icon">
                <BarChart3 size={24} />
              </div>
              <ArrowRight size={18} className="arrow-icon" />
            </div>
            <h4>Attendance Analytics</h4>
            <p>View aggregated cloud reports, percentage distributions, and shortage alerts.</p>
          </Link>

          {/* New Registration Form */}
          <Link to="/" className="action-card">
            <div className="action-header">
              <div className="action-icon">
                <UserPlus size={24} />
              </div>
              <ArrowRight size={18} className="arrow-icon" />
            </div>
            <h4>New Registration</h4>
            <p>Enroll incoming students into their respective degree batches and departments.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}