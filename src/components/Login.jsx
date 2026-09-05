import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Backpack,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import staffRoleImg from "../assets/22.png";
import studentRoleImg from "../assets/1.png";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  // Screen stages: "select" (Role selection screen) | "form" (Sign-in form)
  const [stage, setStage] = useState("select");

  // Authentication State
  const [role, setRole] = useState("staff");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const submitBtnRef = useRef(null);

  const chooseRole = (newRole) => {
    setRole(newRole);
    setIdentifier("");
    setPassword("");
    setErrorMsg("");
    setStage("form");
  };

  const backToSelect = () => {
    setStage("select");
    setErrorMsg("");
  };

  // ---------- 3D tilt interaction (desktop / mouse only) ----------
  const handleTilt = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / rect.height) * -9;
    const rotateY = ((x - rect.width / 2) / rect.width) * 9;
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;
    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
    card.style.setProperty("--gx", `${glowX}%`);
    card.style.setProperty("--gy", `${glowY}%`);
  };

  const resetTilt = (e) => {
    const card = e.currentTarget;
    card.style.setProperty("--rx", `0deg`);
    card.style.setProperty("--ry", `0deg`);
    card.style.setProperty("--gx", `50%`);
    card.style.setProperty("--gy", `50%`);
  };

  // ---------- Magnetic submit button (desktop / mouse only) ----------
  const handleMagnetic = (e) => {
    const btn = submitBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.25}px)`;
  };

  const resetMagnetic = () => {
    const btn = submitBtnRef.current;
    if (btn) btn.style.transform = "";
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
        // Staff Authentication via Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, idClean, pwdClean);
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
        // Student Authentication via Firestore query
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
          setErrorMsg("No student record found with this email.");
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
      console.error("Login error:", err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErrorMsg("Invalid email or password.");
      } else {
        setErrorMsg(err.message || "Unable to log in. Please check your network connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STAGE 1: ONBOARDING ROLE SELECTION
  // ==========================================
  if (stage === "select") {
    return (
      <div className="portal-wrapper">
        <div className="portal-aurora" aria-hidden="true" />
        <div className="portal-particles" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="particle" style={{ "--i": i }} />
          ))}
        </div>
        <div className="portal-skyline" aria-hidden="true" />

        {/* Top App Branding */}
       

        {/* Hero Title */}

        {/* Role Cards — Student on the left, Staff on the right */}
        <main className="role-cards-container">
          {/* Student Card (LEFT) */}
          <div
            className="role-card role-card--student"
            role="button"
            tabIndex={0}
            onClick={() => chooseRole("student")}
            onKeyDown={(e) => e.key === "Enter" && chooseRole("student")}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
          >
            <div className="role-card-media">
              <img src={studentRoleImg} alt="Student supplies" />
              <div className="role-card-art-fallback">
                <Backpack size={38} />
              </div>
            </div>

            <div className="role-card-content">
              <div className="role-badge">
                <GraduationCap size={22} />
              </div>
              <h3>Student</h3>
              <p>Learn, Attend, Grow.<br />Build your future.</p>

              <button className="role-cta-btn" tabIndex={-1} aria-label="Select Student">
                <ArrowRight size={18} />
              </button> 
            </div>
          </div>

          {/* Staff Card (RIGHT) */}
          <div
            className="role-card role-card--staff"
            role="button"
            tabIndex={0}
            onClick={() => chooseRole("staff")}
            onKeyDown={(e) => e.key === "Enter" && chooseRole("staff")}
            onMouseMove={handleTilt}
            onMouseLeave={resetTilt}
          >
            <div className="role-card-media">
              <img src={staffRoleImg} alt="Staff workspace" />
              <div className="role-card-art-fallback">
                <Briefcase size={38} />
              </div>
            </div>

            <div className="role-card-content">
              <div className="role-badge">
                <ShieldCheck size={22} />
              </div>
              <h3>Staff / Faculty</h3>
              <p>Teach, Track, Manage.<br />Make an Impact.</p>

              <button className="role-cta-btn" tabIndex={-1} aria-label="Select Faculty">
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </main>

        {/* Bottom Tagline & Slider Indicators */}
  
      </div>
    );
  }

  // ==========================================
  // STAGE 2: CREDENTIALS SIGN-IN FORM
  // ==========================================
  return (
    <div className="login-wrapper">
      <div className="portal-aurora portal-aurora--form" aria-hidden="true" />
      <div className="login-card">
        <button className="back-btn" onClick={backToSelect}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="login-header">
          <div className="portal-icon">
            {role === "staff" ? <ShieldCheck size={30} /> : <GraduationCap size={30} />}
          </div>
          <h1>{role === "staff" ? "Faculty & Staff Portal" : "Student Portal"}</h1>
          <p>
            {role === "staff"
              ? "Access attendance logs, class schedules, and records"
              : "Check your real-time attendance, records, and profile"}
          </p>
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
  type="text"
  name="staff-login-id"
  value={identifier}
  onChange={(e) => setIdentifier(e.target.value)}
  placeholder="Enter staff email"
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="none"
  spellCheck="false"
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
                autoComplete="new-password"
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

          <button
            ref={submitBtnRef}
            type="submit"
            className={`submit-btn ${role === "student" ? "submit-btn--student" : ""}`}
            disabled={loading}
            onMouseMove={handleMagnetic}
            onMouseLeave={resetMagnetic}
          >
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
              Default password for all students is <strong>12345678</strong>.
            </span>
          ) : (
            <span>Authorized staff and administration access only.</span>
          )}
        </div>
      </div>
    </div>
  );
}