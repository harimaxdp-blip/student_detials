import React, { useState, useEffect, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { LockKeyhole, Eye, EyeOff, X, User } from "lucide-react";
import { db } from "../firebase";
import StudentNavbar from "./StudentNavbar";
import "./StudentDashboard.css";

export default function StudentLayout() {
  const auth = getAuth();

  const [students, setStudents] = useState([]);
  const [inchargeDocs, setInchargeDocs] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password Modal State
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    let sLoaded = false;
    let aLoaded = false;

    const checkLoading = () => {
      if (sLoaded && aLoaded) setLoading(false);
    };

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      sLoaded = true;
      checkLoading();
    });

    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendanceRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      aLoaded = true;
      checkLoading();
    });

    const unsubIncharge = onSnapshot(collection(db, "classIncharge"), (snap) => {
      setInchargeDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubIncharge();
    };
  }, []);

  const student = useMemo(() => {
    if (!students.length) return null;
    const storedId = localStorage.getItem("studentId");
    if (storedId) {
      const found = students.find((s) => s.id === storedId);
      if (found) return found;
    }
    if (firebaseUser?.uid) {
      const found = students.find(
        (s) => s.id === firebaseUser.uid || s.uid === firebaseUser.uid
      );
      if (found) return found;
    }
    if (firebaseUser?.email) {
      const authEmail = firebaseUser.email.trim().toLowerCase();
      const found = students.find(
        (s) => (s.email || s.studentEmail || "").trim().toLowerCase() === authEmail
      );
      if (found) return found;
    }
    return null;
  }, [students, firebaseUser]);

  const inchargeRecord = useMemo(() => {
    if (!student || !inchargeDocs.length) return null;
    const sId = String(student.id || "").trim();
    const sEmail = String(student.email || student.studentEmail || "").trim().toLowerCase();

    return inchargeDocs.find((docItem) => {
      const dId = String(docItem.id || "").trim();
      const dStudentId = String(docItem.studentId || "").trim();
      const dEmail = String(docItem.email || "").trim().toLowerCase();
      return (
        (sId && (dId === sId || dStudentId === sId)) ||
        (sEmail && dEmail && dEmail === sEmail)
      );
    });
  }, [student, inchargeDocs]);

  const isClassIncharge = !!inchargeRecord;

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordSuccess(false);

    if (!firebaseUser?.email) {
      setPasswordMessage("No valid email/password login session found.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("New password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      setPasswordSuccess(true);
      setPasswordMessage("Password changed successfully.");
      setTimeout(() => setPasswordModal(false), 1500);
    } catch (error) {
      setPasswordMessage(error.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading || !authChecked) {
    return (
      <div className="sdb-page sdb-loading-page">
        <div className="student-loader" />
        <p>Loading student portal...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="sdb-page sdb-empty-page">
        <div className="student-empty-icon"><User size={42} /></div>
        <h2>Student Profile Not Found</h2>
        <p>Could not link your login to an active student account.</p>
      </div>
    );
  }

  return (
    <div className="sdb-page">
      <StudentNavbar
        student={student}
        isClassIncharge={isClassIncharge}
        openPasswordModal={() => setPasswordModal(true)}
      />

      <main style={{ flex: 1, width: "100%" }}>
        {/* Provides shared context to sub-pages */}
        <Outlet
          context={{
            student,
            students,
            attendanceRecords,
            isClassIncharge,
            inchargeRecord,
          }}
        />
      </main>

      {/* PASSWORD MODAL */}
      {passwordModal && (
        <div className="password-modal-overlay" onClick={() => setPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <div className="password-title">
                <div className="password-icon"><LockKeyhole size={21} /></div>
                <div>
                  <h2>Change Password</h2>
                  <p>Update your portal login password</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setPasswordModal(false)}>
                <X size={19} />
              </button>
            </div>

            <form className="password-form" onSubmit={handleChangePassword}>
              <div className="password-field">
                <label>Current Password</label>
                <div>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrentPassword((v) => !v)}>
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="password-field">
                <label>New Password</label>
                <div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNewPassword((v) => !v)}>
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="password-field">
                <label>Confirm Password</label>
                <div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div className={`password-message ${passwordSuccess ? "success" : "error"}`}>
                  {passwordMessage}
                </div>
              )}

              <button type="submit" className="change-password-submit" disabled={passwordLoading}>
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}