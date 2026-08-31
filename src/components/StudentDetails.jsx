import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import "./StudentDetails.css";

function StudentDetails() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const studentsQuery = query(
      collection(db, "students"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        setStudents(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load student details:", err);
        setLoadError(
          "Could not load student details. Please try again."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = value.toDate ? value.toDate() : new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredStudents = students.filter((student) =>
    (student.fullName || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div className="details-page">

      <header className="details-header">

        <div className="details-brand">
          <Link to="/" className="back-link">
            ← Back to form
          </Link>

          <h1>Student Records</h1>

          <p>
            Every profile submitted through the student portal.
          </p>
        </div>

        <div className="details-count">
          <strong>{students.length}</strong>
          <span>
            {students.length === 1 ? "student" : "students"}
          </span>
        </div>

      </header>

      <div className="details-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name"
          aria-label="Search students by name"
        />
      </div>

      <main className="details-body">

        {loading && (
          <p className="details-state">
            Loading student details...
          </p>
        )}

        {!loading && loadError && (
          <p className="details-state details-error">
            {loadError}
          </p>
        )}

        {!loading && !loadError && filteredStudents.length === 0 && (
          <p className="details-state">
            {students.length === 0
              ? "No students have submitted their details yet."
              : "No students match that search."}
          </p>
        )}

        {!loading && !loadError && filteredStudents.length > 0 && (
          <div className="details-grid">

            {filteredStudents.map((student) => {
              const isOpen = openId === student.id;

              return (
                <article
                  key={student.id}
                  className={`student-card ${isOpen ? "expanded" : ""}`}
                >

                  <div className="student-card-top">

                    <div className="student-card-heading">
                      <h2>
                        {student.fullName || "Unnamed student"}
                      </h2>

                      <p className="student-course">
                        {student.course || "Course not selected"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="expand-toggle"
                      onClick={() =>
                        setOpenId(isOpen ? null : student.id)
                      }
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "Hide details" : "View details"}
                    </button>

                  </div>

                  <dl className="student-summary">

                    <div>
                      <dt>Mobile</dt>
                      <dd>{student.studentMobile || "—"}</dd>
                    </div>

                    <div>
                      <dt>Email</dt>
                      <dd>{student.studentEmail || "—"}</dd>
                    </div>

                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDate(student.createdAt)}</dd>
                    </div>

                  </dl>

                  {isOpen && (

                    <div className="student-full">

                      <section>
                        <h3>Personal</h3>

                        <dl>
                          <div>
                            <dt>Date of birth</dt>
                            <dd>{student.dob || "—"}</dd>
                          </div>

                          <div>
                            <dt>Gender</dt>
                            <dd>{student.gender || "—"}</dd>
                          </div>

                          <div>
                            <dt>Blood group</dt>
                            <dd>{student.bloodGroup || "—"}</dd>
                          </div>
                        </dl>
                      </section>

                      <section>
                        <h3>Contact</h3>

                        <dl>
                          <div>
                            <dt>Address</dt>
                            <dd>{student.address || "—"}</dd>
                          </div>

                          <div>
                            <dt>Pincode</dt>
                            <dd>{student.pincode || "—"}</dd>
                          </div>
                        </dl>
                      </section>

                      <section>
                        <h3>Parent / guardian</h3>

                        <dl>
                          <div>
                            <dt>Father</dt>
                            <dd>
                              {student.fatherName || "—"}
                              {student.fatherMobile &&
                                ` · ${student.fatherMobile}`}
                            </dd>
                          </div>

                          <div>
                            <dt>Mother</dt>
                            <dd>
                              {student.motherName || "—"}
                              {student.motherMobile &&
                                ` · ${student.motherMobile}`}
                            </dd>
                          </div>

                          {student.guardianName && (
                            <div>
                              <dt>Guardian</dt>
                              <dd>
                                {student.guardianName}
                                {student.guardianMobile &&
                                  ` · ${student.guardianMobile}`}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </section>

                    </div>

                  )}

                </article>
              );
            })}

          </div>
        )}

      </main>

    </div>
  );
}

export default StudentDetails;
