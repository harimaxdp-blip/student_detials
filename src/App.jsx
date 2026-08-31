import { BrowserRouter, Routes, Route } from "react-router-dom";
import StudentForm from "./components/StudentForm";
import StudentDetails from "./components/StudentDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentForm />} />
        <Route path="/d" element={<StudentDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;