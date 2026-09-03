import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { Link } from "react-router-dom";
import "./StudentDetails.css";

// Lucide Icons
import {
  ArrowLeft,
  Search,
  X,
  RotateCcw,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Users,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Layers,
  Loader2,
  Inbox,
  Save,
  HeartHandshake,
  Percent,
  Home,
} from "lucide-react";

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
};

const getDateString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
};

const getDepartmentKey = (student) => {
  const value = String(
    student.department || student.course || student.dept || ""
  )
    .trim()
    .toLowerCase();

  if (
    value === "cs" ||
    value.includes("computer science") ||
    value.includes("computer")
  ) {
    return "cs";
  }

  if (
    value === "aids" ||
    value.includes("artificial intelligence") ||
    value.includes("data science") ||
    value.includes("ai & ds") ||
    value.includes("ai and ds")
  ) {
    return "aids";
  }

  return "";
};

const getJoiningDate = (student) => {
  return getDateString(
    student.joiningDate ||
      student.joinDate ||
      student.dateOfJoining ||
      student.doj
  );
};

function StudentDetails() {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Search + filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [attendanceOrder, setAttendanceOrder] = useState("none");

  // Expanded card
  const [openId, setOpenId] = useState(null);

  // Edit
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  // =========================================================
  // LOAD STUDENTS & REALTIME ATTENDANCE
  // =========================================================

  useEffect(() => {
    const studentsRef = collection(db, "students");
    const attendanceRef = collection(db, "attendance");

    let studentsLoaded = false;
    let attendanceLoaded = false;

    const checkLoading = () => {
      if (studentsLoaded && attendanceLoaded) {
        setLoading(false);
      }
    };

    const unsubStudents = onSnapshot(
      studentsRef,
      (snapshot) => {
        const studentList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        studentList.sort((a, b) => {
          const getTime = (value) => {
            if (!value) return 0;
            if (typeof value.toDate === "function") return value.toDate().getTime();
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? 0 : date.getTime();
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setStudents(studentList);
        studentsLoaded = true;
        checkLoading();
        setLoadError("");
      },
      (error) => {
        console.error("Failed to load students:", error);
        setLoadError(`Firebase error: ${error.code || error.message}`);
        setLoading(false);
      }
    );

    const unsubAttendance = onSnapshot(
      attendanceRef,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setAttendanceRecords(list);
        attendanceLoaded = true;
        checkLoading();
      },
      (error) => {
        console.error("Failed to load attendance records:", error);
      }
    );

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, []);

  // =========================================================
  // CALCULATE CUMULATIVE ATTENDANCE (START TO NOW)
  // =========================================================

  const computedAttendance = useMemo(() => {
    const classRecords = attendanceRecords.filter((record) => {
      const type = String(record.t || "").toLowerCase();
      return type === "c" || type === "class";
    });

    const stats = {};

    students.forEach((student) => {
      const dep = getDepartmentKey(student);
      const joiningDate = getJoiningDate(student);

      let workingDays = 0;
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;

      classRecords.forEach((record) => {
        const recordDate = getDateString(record.d);
        if (!recordDate) return;

        if (joiningDate && recordDate < joiningDate) return;
        if (dep && record.dep !== dep) return;

        workingDays++;
        const s = record.s?.[student.id];

        if (s === STATUS.ABSENT) {
          absentDays++;
        } else if (s === STATUS.LATE) {
          lateDays++;
          presentDays++;
        } else {
          presentDays++;
        }
      });

      const percentage =
        workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

      stats[student.id] = {
        workingDays,
        presentDays,
        absentDays,
        lateDays,
        percentage: Number(percentage.toFixed(1)),
      };
    });

    return stats;
  }, [students, attendanceRecords]);

  const formatDate = (value) => {
    if (!value) return "—";

    try {
      const date =
        typeof value.toDate === "function"
          ? value.toDate()
          : new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const courses = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => student.course)
          .filter(Boolean)
      ),
    ].sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    const result = students.filter((student) => {
      const name = String(student.fullName || "").toLowerCase();
      const mobile = String(student.studentMobile || "").toLowerCase();
      const email = String(student.studentEmail || "").toLowerCase();
      const course = String(student.course || "").toLowerCase();
      const gender = String(student.gender || "").toLowerCase();

      const matchesSearch =
        !searchText ||
        name.includes(searchText) ||
        mobile.includes(searchText) ||
        email.includes(searchText) ||
        course.includes(searchText) ||
        gender.includes(searchText);

      const matchesGender =
        genderFilter === "all" || student.gender === genderFilter;

      const matchesCourse =
        courseFilter === "all" || student.course === courseFilter;

      return matchesSearch && matchesGender && matchesCourse;
    });

    if (attendanceOrder !== "none") {
      result.sort((a, b) => {
        const attendanceA = computedAttendance[a.id]?.percentage || 0;
        const attendanceB = computedAttendance[b.id]?.percentage || 0;

        if (attendanceOrder === "high") {
          return attendanceB - attendanceA;
        }

        return attendanceA - attendanceB;
      });
    }

    return result;
  }, [
    students,
    computedAttendance,
    search,
    genderFilter,
    courseFilter,
    attendanceOrder,
  ]);

  const toggleStudent = (studentId) => {
    setOpenId((currentId) => (currentId === studentId ? null : studentId));
  };

  const startEdit = (student) => {
    setEditingStudent({
      ...student,
      joiningDate: getJoiningDate(student),
      studyMode: student.studyMode || (student.isHybrid ? "hybrid" : "regular"),
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingStudent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveEdit = async () => {
    if (!editingStudent) return;

    try {
      setSaving(true);

      const studentRef = doc(db, "students", editingStudent.id);

      await updateDoc(studentRef, {
        fullName: editingStudent.fullName?.trim() || "",
        dob: editingStudent.dob || "",
        gender: editingStudent.gender || "",
        bloodGroup: editingStudent.bloodGroup || "",
        studentMobile: editingStudent.studentMobile?.trim() || "",
        studentEmail: editingStudent.studentEmail?.trim() || "",
        address: editingStudent.address?.trim() || "",
        pincode: editingStudent.pincode?.trim() || "",
        fatherName: editingStudent.fatherName?.trim() || "",
        fatherMobile: editingStudent.fatherMobile?.trim() || "",
        motherName: editingStudent.motherName?.trim() || "",
        motherMobile: editingStudent.motherMobile?.trim() || "",
        guardianName: editingStudent.guardianName?.trim() || "",
        guardianMobile: editingStudent.guardianMobile?.trim() || "",
        course: editingStudent.course || "",
        joiningDate: editingStudent.joiningDate || "",
        studyMode: editingStudent.studyMode || "regular",
        isHybrid: editingStudent.studyMode === "hybrid",

        updatedAt: serverTimestamp(),
      });

      setEditingStudent(null);
      alert("Student details updated successfully.");
    } catch (error) {
      console.error("Update error:", error);
      alert(`Unable to update student.\n\n${error.code || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${student.fullName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "students", student.id));

      if (openId === student.id) {
        setOpenId(null);
      }

      alert("Student deleted successfully.");
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Unable to delete student.\n\n${error.code || error.message}`);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setGenderFilter("all");
    setCourseFilter("all");
    setAttendanceOrder("none");
  };

  return (
    <div className="details-page">
      {/* HEADER */}
      <header className="details-header">
        <div className="details-brand">
          <Link to="/" className="back-link">
            <ArrowLeft size={15} /> Back to form
          </Link>

          <h1>Student Records</h1>
          <p>Complete academic profiles with live cumulative cloud attendance.</p>
        </div>

        <div className="details-count">
          <div className="details-count-icon">
            <Users size={20} />
          </div>
          <div>
            <strong>{students.length}</strong>
            <span>{students.length === 1 ? "student" : "students"}</span>
          </div>
        </div>
      </header>

      {/* FILTER TOOLBAR */}
      <div className="details-toolbar">
        <div className="search-box">
          <span className="search-icon">
            <Search size={18} />
          </span>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, mobile, email, course..."
            aria-label="Search students"
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-row">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="all">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={attendanceOrder}
            onChange={(e) => setAttendanceOrder(e.target.value)}
          >
            <option value="none">Total Attendance: Default</option>
            <option value="high">Attendance: High → Low</option>
            <option value="low">Attendance: Low → High</option>
          </select>

          {(search ||
            genderFilter !== "all" ||
            courseFilter !== "all" ||
            attendanceOrder !== "none") && (
            <button
              type="button"
              className="reset-filter"
              onClick={resetFilters}
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}

          <div className="filter-result">
            Showing <strong>{filteredStudents.length}</strong> of{" "}
            <strong>{students.length}</strong> students
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="details-body">
        {loading && (
          <div className="details-state">
            <Loader2 size={20} className="spin-icon" />
            <span>Calculating records & attendance...</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="details-state details-error">
            <AlertTriangle size={18} />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && filteredStudents.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={32} />
            </div>
            <h3>No students found</h3>
            <p>Try changing your search keywords or active filters.</p>
            <button type="button" onClick={resetFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {!loading && !loadError && filteredStudents.length > 0 && (
          <div className="details-grid">
            {filteredStudents.map((student) => {
              const isOpen = openId === student.id;
              const isHybrid =
                student.studyMode === "hybrid" || student.isHybrid === true;

              const stat = computedAttendance[student.id] || {
                workingDays: 0,
                presentDays: 0,
                absentDays: 0,
                lateDays: 0,
                percentage: 0,
              };

              const attendancePercent = stat.percentage;
              const isLow = attendancePercent < 75;

              return (
                <article
                  key={student.id}
                  className={`student-card ${isOpen ? "expanded" : ""}`}
                >
                  <div className="student-card-top">
                    <div className="student-card-heading">
                      <div className="student-name-row">
                        <h2>{student.fullName || "Unnamed student"}</h2>

                        {isHybrid && (
                          <span
                            className="attendance-badge"
                            style={{
                              background: "#e0f2fe",
                              color: "#0369a1",
                              borderColor: "#bae6fd",
                            }}
                          >
                            <Home size={12} /> Hybrid (Home)
                          </span>
                        )}

                        <span
                          className={`attendance-badge ${
                            isLow ? "attendance-low" : "attendance-good"
                          }`}
                        >
                          {isLow ? (
                            <AlertTriangle size={12} />
                          ) : (
                            <CheckCircle2 size={12} />
                          )}
                          {attendancePercent}% Total
                        </span>
                      </div>

                      <p className="student-course">
                        <GraduationCap size={15} />
                        {student.course || "Course not selected"}
                      </p>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => startEdit(student)}
                      >
                        <Pencil size={13} /> Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteStudent(student)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>

                      <button
                        type="button"
                        className="expand-toggle"
                        onClick={() => toggleStudent(student.id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? (
                          <>
                            Hide <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            View details <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <dl className="student-summary">
                    <div>
                      <dt>Mobile</dt>
                      <dd>{student.studentMobile || "—"}</dd>
                    </div>

                    <div>
                      <dt>Mode</dt>
                      <dd>{isHybrid ? "Hybrid (Home)" : "Regular (In-person)"}</dd>
                    </div>

                    <div>
                      <dt>Total Days</dt>
                      <dd>{stat.workingDays} working</dd>
                    </div>

                    <div>
                      <dt>Presence</dt>
                      <dd>
                        {stat.presentDays}P · {stat.absentDays}A
                      </dd>
                    </div>
                  </dl>

                  {isOpen && (
                    <div className="student-full">
                      <section>
                        <h3>
                          <User size={15} /> Personal
                        </h3>
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
                          <div>
                            <dt>Study Mode</dt>
                            <dd>{isHybrid ? "Hybrid (From Home)" : "Regular (In-person)"}</dd>
                          </div>
                          <div>
                            <dt>Joined On</dt>
                            <dd>
                              {student.joiningDate
                                ? formatDate(student.joiningDate)
                                : "From inception"}
                            </dd>
                          </div>
                        </dl>
                      </section>

                      <section>
                        <h3>
                          <Phone size={15} /> Contact
                        </h3>
                        <dl>
                          <div>
                            <dt>Student mobile</dt>
                            <dd>{student.studentMobile || "—"}</dd>
                          </div>
                          <div>
                            <dt>Email</dt>
                            <dd>{student.studentEmail || "—"}</dd>
                          </div>
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
                        <h3>
                          <HeartHandshake size={15} /> Parent / Guardian
                        </h3>
                        <dl>
                          <div>
                            <dt>Father</dt>
                            <dd>
                              {student.fatherName || "—"}
                              {student.fatherMobile && (
                                <> · {student.fatherMobile}</>
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt>Mother</dt>
                            <dd>
                              {student.motherName || "—"}
                              {student.motherMobile && (
                                <> · {student.motherMobile}</>
                              )}
                            </dd>
                          </div>

                          {(student.guardianName ||
                            student.guardianMobile) && (
                            <div>
                              <dt>Guardian</dt>
                              <dd>
                                {student.guardianName || "—"}
                                {student.guardianMobile && (
                                  <> · {student.guardianMobile}</>
                                )}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </section>

                      <section>
                        <h3>
                          <Percent size={15} /> Overall Cloud Attendance
                        </h3>
                        <dl>
                          <div>
                            <dt>Overall Score</dt>
                            <dd>
                              <strong>{attendancePercent}%</strong>
                            </dd>
                          </div>
                          <div>
                            <dt>Working Sessions</dt>
                            <dd>{stat.workingDays} days</dd>
                          </div>
                          <div>
                            <dt>Present Days</dt>
                            <dd>{stat.presentDays} days</dd>
                          </div>
                          <div>
                            <dt>Absent Days</dt>
                            <dd>{stat.absentDays} days</dd>
                          </div>
                          <div>
                            <dt>Late Days</dt>
                            <dd>{stat.lateDays} days</dd>
                          </div>
                        </dl>
                      </section>

                      <section>
                        <h3>
                          <Layers size={15} /> Record Details
                        </h3>
                        <dl>
                          <div>
                            <dt>Record ID</dt>
                            <dd>{student.id}</dd>
                          </div>
                          <div>
                            <dt>Submitted</dt>
                            <dd>{formatDate(student.createdAt)}</dd>
                          </div>
                          {student.updatedAt && (
                            <div>
                              <dt>Last updated</dt>
                              <dd>{formatDate(student.updatedAt)}</dd>
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

      {/* EDIT MODAL */}
      {editingStudent && (
        <div
          className="edit-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditingStudent(null);
            }
          }}
        >
          <div className="edit-modal">
            <div className="edit-modal-header">
              <div>
                <span>EDIT STUDENT RECORD</span>
                <h2>{editingStudent.fullName || "Student"}</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingStudent(null)}
                aria-label="Close edit modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="edit-form">
              <div className="edit-field wide">
                <label>Full Name</label>
                <input
                  name="fullName"
                  value={editingStudent.fullName || ""}
                  onChange={handleEditChange}
                />
              </div>

              {/* STUDY MODE (REGULAR VS HYBRID) */}
              <div className="edit-field">
                <label>Study Mode / Location</label>
                <select
                  name="studyMode"
                  value={editingStudent.studyMode || "regular"}
                  onChange={handleEditChange}
                >
                  <option value="regular">Regular (In-Person / Physical)</option>
                  <option value="hybrid">Hybrid (Study from Home)</option>
                </select>
              </div>

              <div className="edit-field">
                <label>Department / Course</label>
                <select
                  name="course"
                  value={editingStudent.course || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select course</option>
                  <option value="B.Sc. Computer Science">
                    B.Sc. Computer Science
                  </option>
                  <option value="B.Sc. Artificial Intelligence & Data Science">
                    B.Sc. Artificial Intelligence & Data Science
                  </option>
                </select>
              </div>

              <div className="edit-field">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={editingStudent.dob || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Date of Joining</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={editingStudent.joiningDate || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Gender</label>
                <select
                  name="gender"
                  value={editingStudent.gender || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="edit-field">
                <label>Blood Group</label>
                <select
                  name="bloodGroup"
                  value={editingStudent.bloodGroup || ""}
                  onChange={handleEditChange}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="edit-field">
                <label>Student Mobile</label>
                <input
                  name="studentMobile"
                  value={editingStudent.studentMobile || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Email</label>
                <input
                  type="email"
                  name="studentEmail"
                  value={editingStudent.studentEmail || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field wide">
                <label>Address</label>
                <textarea
                  name="address"
                  rows="3"
                  value={editingStudent.address || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Pincode</label>
                <input
                  name="pincode"
                  value={editingStudent.pincode || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Father's Name</label>
                <input
                  name="fatherName"
                  value={editingStudent.fatherName || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Father's Mobile</label>
                <input
                  name="fatherMobile"
                  value={editingStudent.fatherMobile || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Mother's Name</label>
                <input
                  name="motherName"
                  value={editingStudent.motherName || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Mother's Mobile</label>
                <input
                  name="motherMobile"
                  value={editingStudent.motherMobile || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Guardian Name</label>
                <input
                  name="guardianName"
                  value={editingStudent.guardianName || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Guardian Mobile</label>
                <input
                  name="guardianMobile"
                  value={editingStudent.guardianMobile || ""}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            <div className="edit-modal-footer">
              <button
                type="button"
                className="cancel-edit"
                onClick={() => setEditingStudent(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-edit"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="spin-icon" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDetails;