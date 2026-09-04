import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import StudentForm from "./components/StudentForm";
import StudentDetails from "./components/StudentDetails";
import Attendance from "./components/Attendance";
import AttendanceDashboard from "./components/AttendanceDashboard";
import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import StaffDashboard from "./components/StaffDashboard";
import StaffRegister from "./components/StaffRegister";
import StaffNavbar from "./components/StaffNavbar";

function ProtectedRoute({ children, allowedRole }) {
  const userRole = localStorage.getItem("userRole");

  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return (
      <Navigate
        to={userRole === "student" ? "/student-dashboard" : "/staff-dashboard"}
        replace
      />
    );
  }

  return children;
}

// Layout that displays the fixed navbar on all staff pages
function StaffLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StaffNavbar />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC AUTH ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-staff" element={<StaffRegister />} />

        {/* STAFF ROUTES (ALL SHARE THE FIXED NAVBAR) */}
        <Route
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/staff-dashboard" element={<StaffDashboard />} />
          <Route path="/" element={<StudentForm />} />
          <Route path="/d" element={<StudentDetails />} />
          <Route path="/a" element={<Attendance />} />
          <Route path="/ad" element={<AttendanceDashboard />} />
        </Route>

        {/* STUDENT DASHBOARD */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/:id"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}