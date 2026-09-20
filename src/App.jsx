import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import ClassIncharge from "./components/ClassIncharge";
import StudentForm from "./components/StudentForm";
import StudentDetails from "./components/StudentDetails";
import Attendance from "./components/Attendance";
import AttendanceDashboard from "./components/AttendanceDashboard";
import Login from "./components/Login";
import StudentDashboard from "./components/StudentDashboard";
import StaffDashboard from "./components/StaffDashboard";
import StaffRegister from "./components/StaffRegister";
import StaffNavbar from "./components/StaffNavbar";


// ============================================================
// CLEAR ALL LOGIN SESSION
// ============================================================

export const clearLoginSession = () => {
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
};


// ============================================================
// GET CURRENT USER ROLE
// ============================================================

const getUserRole = () => {
  return localStorage.getItem("userRole");
};


// ============================================================
// ROOT REDIRECT
// ============================================================

function RootRedirect() {
  const userRole = getUserRole();

  // No login
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // Staff
  if (userRole === "staff") {
    return (
      <Navigate
        to="/staff-dashboard"
        replace
      />
    );
  }

  // Student
  if (userRole === "student") {
    return (
      <Navigate
        to="/student-dashboard"
        replace
      />
    );
  }

  // Invalid login
  return <Navigate to="/login" replace />;
}


// ============================================================
// PROTECTED ROUTE
// ============================================================

function ProtectedRoute({
  children,
  allowedRole,
}) {
  const userRole = getUserRole();

  // ----------------------------------------------------------
  // NO LOGIN
  // ----------------------------------------------------------

  if (!userRole) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // ----------------------------------------------------------
  // INVALID ROLE
  // ----------------------------------------------------------

  if (
    userRole !== "staff" &&
    userRole !== "student"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // ----------------------------------------------------------
  // STAFF ONLY ROUTE
  // ----------------------------------------------------------

  if (
    allowedRole === "staff" &&
    userRole !== "staff"
  ) {
    if (userRole === "student") {
      return (
        <Navigate
          to="/student-dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // ----------------------------------------------------------
  // STUDENT ONLY ROUTE
  // ----------------------------------------------------------

  if (
    allowedRole === "student" &&
    userRole !== "student"
  ) {
    if (userRole === "staff") {
      return (
        <Navigate
          to="/staff-dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  // ----------------------------------------------------------
  // ACCESS ALLOWED
  // ----------------------------------------------------------

  return children;
}


// ============================================================
// STAFF LAYOUT
// ============================================================

function StaffLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* STAFF NAVBAR */}

      <StaffNavbar />


      {/* PAGE CONTENT */}

      <main
        style={{
          flex: 1,
          width: "100%",
        }}
      >
        <Outlet />
      </main>

    </div>
  );
}


// ============================================================
// APP
// ============================================================

export default function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ====================================================
            ROOT
            ==================================================== */}

        <Route
          path="/"
          element={<RootRedirect />}
        />


        {/* ====================================================
            LOGIN
            ==================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ====================================================
            STAFF REGISTRATION
            ==================================================== */}

        <Route
          path="/register-staff"
          element={<StaffRegister />}
        />


        {/* ====================================================
            STAFF PROTECTED ROUTES
            ==================================================== */}

        <Route
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffLayout />
            </ProtectedRoute>
          }
        >

          {/* ==================================================
              STAFF DASHBOARD
              ================================================== */}

          <Route
            path="/staff-dashboard"
            element={<StaffDashboard />}
          />


          {/* ==================================================
              NEW STUDENT REGISTRATION
              ================================================== */}

          <Route
            path="/student-registration"
            element={<StudentForm />}
          />


          {/* ==================================================
              STUDENT RECORDS
              ================================================== */}

          <Route
            path="/d"
            element={<StudentDetails />}
          />


          {/* ==================================================
              ATTENDANCE
              ================================================== */}

          <Route
            path="/a"
            element={<Attendance />}
          />


          {/* ==================================================
              ATTENDANCE ANALYTICS
              ================================================== */}

          <Route
            path="/ad"
            element={<AttendanceDashboard />}
          />


          {/* ==================================================
              CLASS INCHARGE
              ================================================== */}

          <Route
            path="/class-incharge"
            element={<ClassIncharge />}
          />

        </Route>


        {/* ====================================================
            STUDENT DASHBOARD
            ==================================================== */}

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute
              allowedRole="student"
            >
              <StudentDashboard />
            </ProtectedRoute>
          }
        />


        {/* ====================================================
            STUDENT DASHBOARD WITH ID
            ==================================================== */}

        <Route
          path="/student/:id"
          element={
            <ProtectedRoute
              allowedRole="student"
            >
              <StudentDashboard />
            </ProtectedRoute>
          }
        />


        {/* ====================================================
            UNKNOWN URL
            ==================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}