import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

import {
  GraduationCap,
  ShieldCheck,
  Briefcase,
  Backpack,
  Mail,
  Phone,
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

import staffLoginImg from "../assets/122.png";
import studentLoginImg from "../assets/1111.png";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [stage, setStage] = useState("select");

  const [role, setRole] = useState("staff");

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const submitBtnRef = useRef(null);

  // =========================================================
  // ROLE SELECTION
  // =========================================================

  const chooseRole = (newRole) => {
    setRole(newRole);
    setIdentifier("");
    setPassword("");
    setErrorMsg("");
    setStage("form");
  };

  const backToSelect = () => {
    setStage("select");
    setIdentifier("");
    setPassword("");
    setErrorMsg("");
  };

  // =========================================================
  // 3D TILT
  // =========================================================

  const handleTilt = (e) => {
    const card = e.currentTarget;

    const rect = card.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX =
      ((y - rect.height / 2) / rect.height) * -10;

    const rotateY =
      ((x - rect.width / 2) / rect.width) * 10;

    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
    card.style.setProperty("--gx", `${glowX}%`);
    card.style.setProperty("--gy", `${glowY}%`);
  };

  const resetTilt = (e) => {
    const card = e.currentTarget;

    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--gx", "50%");
    card.style.setProperty("--gy", "50%");
  };

  // =========================================================
  // MAGNETIC BUTTON
  // =========================================================

  const handleMagnetic = (e) => {
    const btn = submitBtnRef.current;

    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    const x =
      e.clientX -
      rect.left -
      rect.width / 2;

    const y =
      e.clientY -
      rect.top -
      rect.height / 2;

    btn.style.transform =
      `translate3d(${x * 0.14}px, ${y * 0.28}px, 14px)`;
  };

  const resetMagnetic = () => {
    const btn = submitBtnRef.current;

    if (btn) {
      btn.style.transform = "";
    }
  };

  // =========================================================
  // NORMALIZE PHONE NUMBER
  // =========================================================

  const normalizePhone = (value) => {
    return String(value || "")
      .replace(/\D/g, "")
      .replace(/^91/, "");
  };

  // =========================================================
  // CHECK IF LOGIN INPUT IS PHONE
  // =========================================================

  const isPhoneNumber = (value) => {
    const digits = normalizePhone(value);

    return (
      digits.length >= 10 &&
      digits.length <= 15
    );
  };

  // =========================================================
  // STUDENT PHONE FIELD CHECK
  // =========================================================

  const getStudentPhone = (data) => {
    return (
      data.studentMobile ||
      data.mobile ||
      data.studentPhone ||
      data.phone ||
      data.phoneNumber ||
      ""
    );
  };

  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMsg("");

    const rawIdentifier =
      identifier.trim();

    const idClean =
      rawIdentifier.toLowerCase();

    const pwdClean =
      password.trim();

    if (!idClean || !pwdClean) {
      setErrorMsg(
        "Please fill in both login information and password."
      );

      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // STAFF LOGIN
      // STAFF USES EMAIL
      // =====================================================

      if (role === "staff") {
        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            idClean,
            pwdClean
          );

        const user =
          userCredential.user;

        let staffProfile = {};

        try {
          const staffDoc =
            await getDoc(
              doc(
                db,
                "staff",
                user.uid
              )
            );

          if (
            staffDoc.exists() &&
            staffDoc.data().role === "staff"
          ) {
            staffProfile =
              staffDoc.data();
          }
        } catch (error) {
          console.error(
            "Staff profile error:",
            error
          );
        }

        // Remove old student session
        localStorage.removeItem(
          "studentUser"
        );

        localStorage.removeItem(
          "studentId"
        );

        localStorage.removeItem(
          "studentEmail"
        );

        localStorage.removeItem(
          "studentMobile"
        );

        // Save staff session
        localStorage.setItem(
          "userRole",
          "staff"
        );

        localStorage.setItem(
          "uid",
          user.uid
        );

        localStorage.setItem(
          "staffEmail",
          user.email || idClean
        );

        localStorage.setItem(
          "userProfile",
          JSON.stringify({
            uid: user.uid,
            email:
              user.email || idClean,
            ...staffProfile,
          })
        );

        console.log(
          "STAFF LOGIN SUCCESS"
        );

        navigate(
          "/staff-dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      // =====================================================
      // STUDENT LOGIN
      // EMAIL OR MOBILE NUMBER
      // =====================================================

      const studentsRef =
        collection(
          db,
          "students"
        );

      let querySnapshot;

      // =====================================================
      // EMAIL LOGIN
      // =====================================================

      if (!isPhoneNumber(idClean)) {
        console.log(
          "Student login using EMAIL"
        );

        // First try studentEmail
        let q = query(
          studentsRef,
          where(
            "studentEmail",
            "==",
            idClean
          )
        );

        querySnapshot =
          await getDocs(q);

        // Try email field
        if (querySnapshot.empty) {
          q = query(
            studentsRef,
            where(
              "email",
              "==",
              idClean
            )
          );

          querySnapshot =
            await getDocs(q);
        }
      }

      // =====================================================
      // MOBILE LOGIN
      // =====================================================

      else {
        console.log(
          "Student login using MOBILE NUMBER"
        );

        const phone =
          normalizePhone(idClean);

        // Try common phone fields
        const phoneFields = [
          "studentMobile",
          "mobile",
          "studentPhone",
          "phone",
          "phoneNumber",
        ];

        querySnapshot = {
          empty: true,
          docs: [],
        };

        for (
          const field of phoneFields
        ) {
          const q = query(
            studentsRef,
            where(
              field,
              "==",
              rawIdentifier
            )
          );

          const result =
            await getDocs(q);

          if (!result.empty) {
            querySnapshot =
              result;

            break;
          }

          // Try normalized 10-digit number
          const q2 = query(
            studentsRef,
            where(
              field,
              "==",
              phone
            )
          );

          const result2 =
            await getDocs(q2);

          if (!result2.empty) {
            querySnapshot =
              result2;

            break;
          }
        }
      }

      // =====================================================
      // CASE-INSENSITIVE / FORMATTED FALLBACK
      // =====================================================

      if (querySnapshot.empty) {
        console.log(
          "Running student fallback search..."
        );

        const allSnapshot =
          await getDocs(
            studentsRef
          );

        const searchPhone =
          normalizePhone(
            rawIdentifier
          );

        const matchedDoc =
          allSnapshot.docs.find(
            (d) => {
              const data =
                d.data();

              // -----------------------------
              // EMAIL MATCH
              // -----------------------------

              const email =
                String(
                  data.studentEmail ||
                    data.email ||
                    ""
                )
                  .trim()
                  .toLowerCase();

              if (
                email === idClean
              ) {
                return true;
              }

              // -----------------------------
              // PHONE MATCH
              // -----------------------------

              const storedPhone =
                normalizePhone(
                  getStudentPhone(
                    data
                  )
                );

              if (
                searchPhone &&
                storedPhone &&
                storedPhone ===
                  searchPhone
              ) {
                return true;
              }

              return false;
            }
          );

        if (matchedDoc) {
          querySnapshot = {
            empty: false,
            docs: [matchedDoc],
          };
        }
      }

      // =====================================================
      // STUDENT NOT FOUND
      // =====================================================

      if (
        !querySnapshot ||
        querySnapshot.empty
      ) {
        setErrorMsg(
          "No student record found with this email or mobile number."
        );

        setLoading(false);

        return;
      }

      // =====================================================
      // GET STUDENT DOCUMENT
      // =====================================================

      const studentDoc =
        querySnapshot.docs[0];

      const studentData =
        studentDoc.data();

      const firestoreStudentId =
        studentDoc.id;

      // =====================================================
      // STUDENT EMAIL
      // =====================================================

      const studentEmail =
        String(
          studentData.studentEmail ||
            studentData.email ||
            ""
        )
          .trim()
          .toLowerCase();

      // =====================================================
      // STUDENT PHONE
      // =====================================================

      const studentPhone =
        String(
          getStudentPhone(
            studentData
          ) || ""
        ).trim();

      // =====================================================
      // PASSWORD
      // =====================================================

      const expectedPassword =
        String(
          studentData.password ||
            "12345678"
        );

      if (
        pwdClean !==
        expectedPassword
      ) {
        setErrorMsg(
          "Incorrect password. Default password is: 12345678"
        );

        setLoading(false);

        return;
      }

      // =====================================================
      // CREATE STUDENT SESSION
      // =====================================================

      const studentSession = {
        ...studentData,

        id: firestoreStudentId,

        studentId:
          firestoreStudentId,

        studentEmail:
          studentEmail,

        email:
          studentEmail,

        studentMobile:
          studentPhone,

        uid: "",
      };

      // =====================================================
      // CLEAR OLD STAFF SESSION
      // =====================================================

      localStorage.removeItem(
        "userProfile"
      );

      localStorage.removeItem(
        "staffId"
      );

      localStorage.removeItem(
        "staffEmail"
      );

      // =====================================================
      // SAVE STUDENT LOGIN SESSION
      // =====================================================

      localStorage.setItem(
        "userRole",
        "student"
      );

      localStorage.setItem(
        "studentId",
        firestoreStudentId
      );

      localStorage.setItem(
        "studentEmail",
        studentEmail
      );

      localStorage.setItem(
        "studentMobile",
        studentPhone
      );

      localStorage.setItem(
        "studentUser",
        JSON.stringify(
          studentSession
        )
      );

      // Firebase Auth UID is not used
      // for this Firestore-based student login.
      localStorage.removeItem(
        "uid"
      );

      // =====================================================
      // DEBUG
      // =====================================================

      console.log(
        "===================================="
      );

      console.log(
        "STUDENT LOGIN SUCCESS"
      );

      console.log(
        "Student ID:",
        firestoreStudentId
      );

      console.log(
        "Student Email:",
        studentEmail
      );

      console.log(
        "Student Mobile:",
        studentPhone
      );

      console.log(
        "Student Session:",
        studentSession
      );

      console.log(
        "===================================="
      );

      // =====================================================
      // OPEN STUDENT DASHBOARD
      // =====================================================

      navigate(
        "/student-dashboard",
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error(
        "Login error:",
        err
      );

      if (
        err.code ===
          "auth/user-not-found" ||
        err.code ===
          "auth/wrong-password" ||
        err.code ===
          "auth/invalid-credential"
      ) {
        setErrorMsg(
          "Invalid email or password."
        );
      } else {
        setErrorMsg(
          err.message ||
            "Unable to log in. Please check your network connection."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // STAGE 1
  // ROLE SELECTION
  // =========================================================

  if (stage === "select") {
    return (
      <div className="portal-wrapper">

        <div
          className="portal-aurora"
          aria-hidden="true"
        />

        <div
          className="portal-grid-floor"
          aria-hidden="true"
        />

        <div
          className="portal-shapes"
          aria-hidden="true"
        >
          <span className="shape shape-cube" />
          <span className="shape shape-ring" />
          <span className="shape shape-tri" />
          <span className="shape shape-dot" />
        </div>

        <div
          className="portal-particles"
          aria-hidden="true"
        >
          {Array.from({
            length: 16,
          }).map((_, i) => (
            <span
              key={i}
              className="particle"
              style={{
                "--i": i,
              }}
            />
          ))}
        </div>

        <div
          className="portal-skyline"
          aria-hidden="true"
        />

        <main className="role-cards-container">

          {/* STUDENT */}

          <div
            className="role-card role-card--student"
            role="button"
            tabIndex={0}
            onClick={() =>
              chooseRole(
                "student"
              )
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              chooseRole(
                "student"
              )
            }
            onMouseMove={
              handleTilt
            }
            onMouseLeave={
              resetTilt
            }
          >
            <span
              className="role-card-glow-ring"
              aria-hidden="true"
            />

            <span
              className="role-card-spotlight"
              aria-hidden="true"
            />

            <div className="role-card-media">
              <img
                src={studentRoleImg}
                alt="Student supplies"
              />

              <div className="role-card-art-fallback">
                <Backpack
                  size={38}
                />
              </div>
            </div>

            <div className="role-card-content">

              <div className="role-badge">
                <GraduationCap
                  size={22}
                />
              </div>

              <h3>
                Student
              </h3>

              <p>
                Learn, Attend, Grow.
                <br />
                Build your future.
              </p>

              <button
                className="role-cta-btn"
                tabIndex={-1}
                aria-label="Select Student"
              >
                <ArrowRight
                  size={18}
                />
              </button>

            </div>
          </div>

          {/* STAFF */}

          <div
            className="role-card role-card--staff"
            role="button"
            tabIndex={0}
            onClick={() =>
              chooseRole(
                "staff"
              )
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              chooseRole(
                "staff"
              )
            }
            onMouseMove={
              handleTilt
            }
            onMouseLeave={
              resetTilt
            }
          >
            <span
              className="role-card-glow-ring"
              aria-hidden="true"
            />

            <span
              className="role-card-spotlight"
              aria-hidden="true"
            />

            <div className="role-card-media">

              <img
                src={staffRoleImg}
                alt="Staff workspace"
              />

              <div className="role-card-art-fallback">
                <Briefcase
                  size={38}
                />
              </div>

            </div>

            <div className="role-card-content">

              <div className="role-badge">
                <ShieldCheck
                  size={22}
                />
              </div>

              <h3>
                Staff / Faculty
              </h3>

              <p>
                Teach, Track, Manage.
                <br />
                Make an Impact.
              </p>

              <button
                className="role-cta-btn"
                tabIndex={-1}
                aria-label="Select Faculty"
              >
                <ArrowRight
                  size={18}
                />
              </button>

            </div>
          </div>

        </main>
      </div>
    );
  }

  // =========================================================
  // STAGE 2
  // LOGIN FORM
  // =========================================================

  return (
    <div className="login-wrapper">

      <div
        className="portal-aurora portal-aurora--form"
        aria-hidden="true"
      />

      <div
        className="portal-grid-floor portal-grid-floor--form"
        aria-hidden="true"
      />

      <div
        className="login-card"
        onMouseMove={
          handleTilt
        }
        onMouseLeave={
          resetTilt
        }
      >

        <span
          className="login-card-spotlight"
          aria-hidden="true"
        />

        <button
          className="back-btn"
          onClick={
            backToSelect
          }
        >
          <ArrowLeft
            size={16}
          />

          Back
        </button>

        <div
          className={`login-header login-header--${role}`}
        >

          <div className="login-role-art">

            <span
              className="login-role-art-glow"
              aria-hidden="true"
            />

            <img
              src={
                role === "staff"
                  ? staffLoginImg
                  : studentLoginImg
              }
              alt=""
              className="login-role-art-img"
              draggable="false"
            />

          </div>

<div
  className={`login-role-kicker ${
    role === "staff" ? "staff-kicker" : "student-kicker"
  }`}
>
  {role === "staff" ? (
    <>
      <ShieldCheck size={14} />
      <span>STAFF ACCESS</span>
    </>
  ) : (
    <>
      <GraduationCap size={14} />
      <span>STUDENT ACCESS</span>
    </>
  )}
</div>

        </div>

        {errorMsg && (
          <div className="login-error">

            <AlertCircle
              size={16}
            />

            <span>
              {errorMsg}
            </span>

          </div>
        )}

        <form
          onSubmit={
            handleLogin
          }
          className="login-form"
        >

          {/* LOGIN INPUT */}

          <div className="input-group">

            <label>
              {role === "staff"
                ? "Staff Email Address"
                : "Student Email or Mobile Number"}
            </label>

            <div className="input-field">

              {role === "student" &&
              isPhoneNumber(
                identifier
              ) ? (
                <Phone
                  size={18}
                  className="field-icon"
                />
              ) : (
                <Mail
                  size={18}
                  className="field-icon"
                />
              )}

              <input
                type={
                  role === "staff"
                    ? "email"
                    : "text"
                }
                name={
                  role === "staff"
                    ? "staff-login-email"
                    : "student-login"
                }
                value={
                  identifier
                }
                onChange={(e) =>
                  setIdentifier(
                    e.target.value
                  )
                }
                placeholder={
                  role === "staff"
                    ? "Enter staff email"
                    : "Enter email or mobile number"
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                required
              />

            </div>

            {role === "student" && (
              <small
                style={{
                  display: "block",
                  marginTop: "7px",
                  fontSize: "12px",
                  opacity: 0.7,
                }}
              >
                You can login using your
                registered email or mobile
                number.
              </small>
            )}

          </div>

          {/* PASSWORD */}

          <div className="input-group">

            <label>
              {role === "staff"
                ? "Password"
                : "Password (Default: 12345678)"}
            </label>

            <div className="input-field">

              <Lock
                size={18}
                className="field-icon"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder={
                  role === "staff"
                    ? "Enter your password"
                    : "Enter 12345678"
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() =>
                  setShowPassword(
                    (prev) =>
                      !prev
                  )
                }
                tabIndex={-1}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff
                    size={16}
                  />
                ) : (
                  <Eye
                    size={16}
                  />
                )}
              </button>

            </div>

          </div>

          {/* SUBMIT */}

          <button
            ref={
              submitBtnRef
            }
            type="submit"
            className={`submit-btn ${
              role === "student"
                ? "submit-btn--student"
                : ""
            }`}
            disabled={
              loading
            }
            onMouseMove={
              handleMagnetic
            }
            onMouseLeave={
              resetMagnetic
            }
          >

            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="spin-icon"
                />

                Authenticating...
              </>
            ) : (
              <>
                Sign In

                <ArrowRight
                  size={18}
                />
              </>
            )}

          </button>

        </form>

        <div className="login-footer">

          {role === "student" ? (
            <span>
              Login using your
              <strong>
                {" "}registered email
              </strong>
              {" "}or
              <strong>
                {" "}mobile number
              </strong>
              .
              <br />
              Default password for all
              students is
              <strong>
                {" "}12345678
              </strong>
              .
            </span>
          ) : (
            <span>
              Authorized staff and
              administration access only.
            </span>
          )}

        </div>

      </div>

    </div>
  );
}