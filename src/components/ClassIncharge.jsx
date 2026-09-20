import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

function ClassIncharge() {
  const [students, setStudents] = useState([]);
  const [inchargeList, setInchargeList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [inchargeRole, setInchargeRole] = useState("Representative");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      // 1. Fetch All Students
      const studentsSnapshot = await getDocs(collection(db, "students"));
      const allStudents = studentsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      allStudents.sort((a, b) => {
        const nameA = String(a.fullName || a.name || "").toLowerCase();
        const nameB = String(b.fullName || b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setStudents(allStudents);

      // 2. Fetch All Active Incharges
      const inchargeSnapshot = await getDocs(collection(db, "classIncharge"));
      const currentIncharges = inchargeSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      currentIncharges.sort((a, b) => {
        const nameA = String(a.name || "").toLowerCase();
        const nameB = String(b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setInchargeList(currentIncharges);
    } catch (error) {
      console.error("Error loading class incharge records:", error);
      setMessage({
        text: `Unable to load data: ${error.message || error.code}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter out students who are already assigned as incharges
  const availableStudents = useMemo(() => {
    const assignedIds = new Set(inchargeList.map((item) => item.studentId || item.id));
    return students.filter((student) => !assignedIds.has(student.id));
  }, [students, inchargeList]);

  const handleAssign = async () => {
    if (!selectedStudent) {
      setMessage({ text: "Please select a student.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      setMessage({ text: "", type: "" });

      const student = students.find((item) => item.id === selectedStudent);
      if (!student) {
        setMessage({ text: "Selected student could not be found.", type: "error" });
        return;
      }

      const inchargePayload = {
        studentId: String(student.id),
        name: String(student.fullName || student.name || "Unnamed Student").trim(),
        email: String(student.studentEmail || student.email || "—").trim(),
        mobile: String(
          student.studentMobile ||
            student.mobile ||
            student.studentPhone ||
            student.phone ||
            "—"
        ).trim(),
        course: String(student.course || student.department || "—").trim(),
        role: inchargeRole.trim() || "Representative",
        assignedAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      };

      // Add to Firestore using student's unique ID
      await setDoc(doc(db, "classIncharge", student.id), inchargePayload);

      await loadData();
      setSelectedStudent("");
      setMessage({
        text: `${inchargePayload.name} added as Class Incharge successfully.`,
        type: "success",
      });
    } catch (error) {
      console.error("Error assigning class incharge:", error);
      setMessage({
        text: `Unable to assign class incharge: ${error.code || error.message}`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (docId, studentName) => {
    if (!docId) return;

    const confirmDelete = window.confirm(
      `Remove ${studentName || "this student"} from the Class Incharge role?`
    );
    if (!confirmDelete) return;

    try {
      setRemovingId(docId);
      setMessage({ text: "", type: "" });

      await deleteDoc(doc(db, "classIncharge", docId));

      setInchargeList((prev) => prev.filter((item) => item.id !== docId));
      setMessage({
        text: `${studentName || "Student"} removed from Class Incharge.`,
        type: "success",
      });
    } catch (error) {
      console.error("Error removing class incharge:", error);
      setMessage({
        text: `Unable to remove incharge: ${error.code || error.message}`,
        type: "error",
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
          color: "#475569",
        }}
      >
        <h2>Loading Class Incharges...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "36px 20px",
        background: "#f8fafc",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* HEADER */}
      <div style={{ maxWidth: "860px", margin: "0 auto 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              color: "#0f172a",
              fontWeight: "700",
              letterSpacing: "-0.03em",
            }}
          >
            Class Incharges
          </h1>
          <span
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              fontSize: "0.8rem",
              fontWeight: "800",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            {inchargeList.length} Active
          </span>
        </div>
        <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "0.95rem" }}>
          Assign one or more student coordinators to lead and manage class activities.
        </p>
      </div>

      {/* STATUS ALERT */}
      {message.text && (
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto 20px",
            padding: "14px 18px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: "600",
            background: message.type === "error" ? "#fff1f2" : "#ecfdf5",
            color: message.type === "error" ? "#e11d48" : "#059669",
            border: `1px solid ${message.type === "error" ? "#fecdd3" : "#a7f3d0"}`,
          }}
        >
          {message.text}
        </div>
      )}

      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* CURRENT INCHARGE LIST */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px 28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "1.2rem",
              color: "#0f172a",
              fontWeight: "700",
            }}
          >
            Current Appointed Incharges
          </h2>

          {inchargeList.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "14px",
              }}
            >
              {inchargeList.map((incharge) => (
                <div
                  key={incharge.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.05rem",
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {incharge.name || "Unknown Student"}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "800",
                          color: "#059669",
                          background: "#ecfdf5",
                          padding: "2px 8px",
                          borderRadius: "6px",
                        }}
                      >
                        {incharge.role || "Incharge"}
                      </span>
                    </div>

                    {incharge.course && incharge.course !== "—" && (
                      <p
                        style={{
                          margin: "2px 0 8px",
                          color: "#2563eb",
                          fontSize: "0.82rem",
                          fontWeight: "600",
                        }}
                      >
                        {incharge.course}
                      </p>
                    )}

                    <p style={{ margin: "3px 0", color: "#64748b", fontSize: "0.82rem" }}>
                      <strong>Email:</strong> {incharge.email || "—"}
                    </p>
                    <p style={{ margin: "3px 0", color: "#64748b", fontSize: "0.82rem" }}>
                      <strong>Mobile:</strong> {incharge.mobile || "—"}
                    </p>
                  </div>

                  <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleRemove(incharge.id, incharge.name)}
                      disabled={removingId === incharge.id}
                      style={{
                        border: "1px solid #fecdd3",
                        background: "#fff1f2",
                        color: "#e11d48",
                        padding: "6px 12px",
                        borderRadius: "7px",
                        fontWeight: "700",
                        fontSize: "0.78rem",
                        cursor: removingId === incharge.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {removingId === incharge.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.9rem" }}>
              No Class Incharges are currently assigned.
            </p>
          )}
        </div>

        {/* ASSIGN FORM CARD */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px 28px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "1.2rem",
              color: "#0f172a",
              fontWeight: "700",
            }}
          >
            Add New Class Incharge
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label
                htmlFor="student-select"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  color: "#334155",
                }}
              >
                Select Student
              </label>
              <select
                id="student-select"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "0.9rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  outline: "none",
                }}
              >
                <option value="">-- Choose student --</option>
                {availableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName || student.name || "Unnamed Student"}{" "}
                    {student.course ? `(${student.course})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="role-select"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "700",
                  fontSize: "0.82rem",
                  color: "#334155",
                }}
              >
                Designation / Role
              </label>
              <select
                id="role-select"
                value={inchargeRole}
                onChange={(e) => setInchargeRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "0.9rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  outline: "none",
                }}
              >
                <option value="Representative">Representative</option>
                <option value="Lead Incharge">Lead Incharge</option>
                <option value="Assistant Incharge">Assistant Incharge</option>
                <option value="Academic Coordinator">Academic Coordinator</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAssign}
            disabled={saving || !selectedStudent}
            style={{
              width: "100%",
              border: "none",
              background: saving || !selectedStudent ? "#94a3b8" : "#2563eb",
              color: "#ffffff",
              padding: "13px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              fontWeight: "700",
              cursor: saving || !selectedStudent ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {saving ? "Adding..." : "Add as Class Incharge"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClassIncharge;