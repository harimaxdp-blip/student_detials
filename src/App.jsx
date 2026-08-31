import { BrowserRouter, Routes, Route } from "react-router-dom";
import StudentForm from "./components/StudentForm";
import StudentDetails from "./components/StudentDetails";
import Attendance from "./components/Attendance";
import AttendanceDashboard from "./components/AttendanceDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<StudentForm />}
        />

        <Route
          path="/d"
          element={<StudentDetails />}
        />

        <Route
          path="/a"
          element={<Attendance />}
        />

        <Route
          path="/ad"
          element={<AttendanceDashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;