import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  // "staff" | "student"
  const [role, setRole] = useState("staff");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    setIdentifier("");
    setPassword("");
    setErrorMsg("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const idClean = identifier.trim().toLowerCase();
    const pwdClean = password.trim();

    if (!idClean || !pwdClean) {
      setErrorMsg("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);

      if (role === "staff") {
        // Staff Login via Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(
          auth,
          idClean,
          pwdClean
        );
        const user = userCredential.user;

        try {
          const staffDoc = await getDoc(doc(db, "staff", user.uid));
          if (staffDoc.exists() && staffDoc.data().role === "staff") {
            localStorage.setItem("userRole", "staff");
            localStorage.setItem("userProfile", JSON.stringify(staffDoc.data()));
          } else {
            localStorage.setItem("userRole", "staff");
          }
        } catch {
          localStorage.setItem("userRole", "staff");
        }

        navigate("/staff-dashboard");
      } else {
        // Student Login via Firestore query by student email
        const studentsRef = collection(db, "students");
        let q = query(studentsRef, where("studentEmail", "==", idClean));
        let querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          q = query(studentsRef, where("email", "==", idClean));
          querySnapshot = await getDocs(q);
        }

        // Case-insensitive fallback check
        if (querySnapshot.empty) {
          const allSnapshot = await getDocs(studentsRef);
          const matchedDoc = allSnapshot.docs.find((d) => {
            const data = d.data();
            const studentMail = String(data.studentEmail || data.email || "").trim().toLowerCase();
            return studentMail === idClean;
          });

          if (matchedDoc) {
            querySnapshot = { empty: false, docs: [matchedDoc] };
          }
        }

        if (querySnapshot.empty) {
          setErrorMsg("No student found with this email address. Please check and try again.");
          setLoading(false);
          return;
        }

        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;

        const expectedPassword = String(studentData.password || "12345678");

        if (pwdClean !== expectedPassword) {
          setErrorMsg("Incorrect password. Default password is: 12345678");
          setLoading(false);
          return;
        }

        localStorage.setItem("userRole", "student");
        localStorage.setItem(
          "studentUser",
          JSON.stringify({ id: studentId, ...studentData })
        );

        navigate("/student-dashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErrorMsg("Invalid staff email or password.");
      } else {
        setErrorMsg(err.message || "Unable to log in. Please check your network.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="portal-icon">
            {role === "staff" ? (
              <ShieldCheck size={32} />
            ) : (
              <GraduationCap size={32} />
            )}
          </div>
          <h1>{role === "staff" ? "Faculty & Staff Portal" : "Student Portal"}</h1>
          <p>
            {role === "staff"
              ? "Access attendance logs, class schedules, and records"
              : "Check your real-time attendance, records, and profile"}
          </p>
        </div>

        <div className="role-switch">
          <button
            type="button"
            className={role === "staff" ? "role-btn active" : "role-btn"}
            onClick={() => handleRoleSwitch("staff")}
          >
            <ShieldCheck size={16} /> Faculty / Staff
          </button>
          <button
            type="button"
            className={role === "student" ? "role-btn active" : "role-btn"}
            onClick={() => handleRoleSwitch("student")}
          >
            <GraduationCap size={16} /> Student
          </button>
        </div>

        {errorMsg && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>
              {role === "staff" ? "Staff Email Address" : "Student Registered Email"}
            </label>
            <div className="input-field">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  role === "staff"
                    ? "faculty@institution.edu"
                    : "student@example.com"
                }
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              {role === "staff" ? "Password" : "Password (Default: 12345678)"}
            </label>
            <div className="input-field">
              <Lock size={18} className="field-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === "staff" ? "Enter your password" : "Enter 12345678"}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" /> Authenticating...
              </>
            ) : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          {role === "student" ? (
            <span>
              Default password for all students is <strong>12345678</strong>. Use your registered email address to log in.
            </span>
          ) : (
            <span>Authorized staff and administration access only.</span>
          )}
        </div>
      </div>
    </div>
  );
}