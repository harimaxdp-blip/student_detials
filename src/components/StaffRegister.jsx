import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import "./StaffRegister.css";

export default function StaffRegister() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    let cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (cleanEmail.endsWith("@gmail")) {
      cleanEmail = cleanEmail + ".com";
    }

    if (cleanPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      // 1. Create staff user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        cleanPassword
      );
      const user = userCredential.user;

      // 2. Save authorized role in Firestore 'staff' collection
      await setDoc(doc(db, "staff", user.uid), {
        uid: user.uid,
        email: cleanEmail,
        role: "staff",
        createdAt: serverTimestamp(),
      });

      setSuccessMsg("Staff account created! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.error("Staff Registration Error:", err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email is already registered.");
      } else if (err.code === "auth/invalid-email") {
        setErrorMsg("Please enter a valid email address.");
      } else {
        setErrorMsg(err.message || "Failed to create account. Check your network.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sr-wrapper">
      <div className="sr-card">
        <Link to="/login" className="sr-back-link">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="sr-header">
          <div className="sr-icon-box">
            <ShieldCheck size={28} />
          </div>
          <h2>Create Faculty Account</h2>
          <p>Register with your official email and password</p>
        </div>

        {errorMsg && (
          <div className="sr-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="sr-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="sr-form">
          {/* Email */}
          <div className="sr-input-group">
            <label>Official Email</label>
            <div className="sr-field">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@institution.edu"
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="sr-input-group">
            <label>Password (Min. 6 characters)</label>
            <div className="sr-field">
              <Lock size={18} className="field-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="sr-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="sr-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin-icon" /> Registering...
              </>
            ) : (
              <>
                Register Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}