import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  History,
  CalendarDays,
  BookOpen,
  Umbrella,
  Search,
  Check,
  X,
  Clock3,
  UserRoundX,
  Share2,
  Save,
  Eye,
  Trash2,
} from "lucide-react";
import "./Attendance.css";

const DEPARTMENTS = [
  {
    id: "cs",
    name: "Computer Science",
    short: "CS",
  },
  {
    id: "aids",
    name: "AI & Data Science",
    short: "AIDS",
  },
];

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
  NOT_JOINED: "nj",
};

function Attendance() {
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [department, setDepartment] = useState("cs");
  const [dayType, setDayType] = useState("class");
  const [attendance, setAttendance] = useState({});
  const [lateNotes, setLateNotes] = useState({});
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("attendance");

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const getDateObject = (value) => {
    if (!value) return new Date();
    return new Date(`${value}T00:00:00`);
  };

  const getDayName = (value) => {
    return getDateObject(value).toLocaleDateString("en-IN", {
      weekday: "long",
    });
  };

  const dayName = getDayName(date);

  // =========================================================
  // SUNDAY
  // =========================================================

  useEffect(() => {
    if (dayName === "Sunday") {
      setDayType("holiday");
    }
  }, [dayName]);

  // =========================================================
  // LOAD STUDENTS
  // =========================================================

  useEffect(() => {
    const studentsRef = collection(db, "students");

    const unsubscribe = onSnapshot(
      studentsRef,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setStudents(data);
        setLoading(false);
      },
      (error) => {
        console.error("Students loading error:", error);
        setLoading(false);
        setMessage("Unable to load students.");
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // LOAD ATTENDANCE HISTORY
  // =========================================================

  useEffect(() => {
    const attendanceRef = collection(db, "attendance");

    const unsubscribe = onSnapshot(
      attendanceRef,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        data.sort((a, b) =>
          String(b.d || b.id).localeCompare(String(a.d || a.id))
        );

        setRecords(data);
      },
      (error) => {
        console.error("Attendance history error:", error);
        setMessage("Unable to load attendance history.");
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // FILTER STUDENTS BY DEPARTMENT
  // =========================================================

  const departmentStudents = useMemo(() => {
    return students
      .filter((student) => {
        const value = String(
          student.department || student.course || ""
        )
          .trim()
          .toLowerCase();

        if (department === "cs") {
          return (
            value === "cs" ||
            value.includes("computer science") ||
            value.includes("computer")
          );
        }

        if (department === "aids") {
          return (
            value === "aids" ||
            value.includes("artificial intelligence") ||
            value.includes("data science") ||
            value.includes("ai & ds") ||
            value.includes("ai and ds")
          );
        }

        return false;
      })
      .sort((a, b) =>
        String(a.fullName || a.name || "").localeCompare(
          String(b.fullName || b.name || "")
        )
      );
  }, [students, department]);

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return departmentStudents;
    }

    return departmentStudents.filter((student) => {
      const name = String(
        student.fullName || student.name || ""
      ).toLowerCase();

      const registerNumber = String(
        student.registerNumber ||
          student.regNo ||
          student.registerNo ||
          ""
      ).toLowerCase();

      const mobile = String(
        student.studentMobile || student.mobile || ""
      ).toLowerCase();

      return (
        name.includes(query) ||
        registerNumber.includes(query) ||
        mobile.includes(query)
      );
    });
  }, [departmentStudents, search]);

  // =========================================================
  // LOAD SELECTED DATE RECORD
  // =========================================================

  const loadRecord = async () => {
    if (!date || !department) return;

    setLoadingRecord(true);
    setMessage("");

    try {
      const recordId = `${date}_${department}`;
      const recordRef = doc(db, "attendance", recordId);
      const snapshot = await getDoc(recordRef);

      if (dayName === "Sunday") {
        setDayType("holiday");
      }

      if (!snapshot.exists()) {
        setAttendance({});
        setLateNotes({});

        if (dayName === "Sunday" || dayName === "Saturday") {
          setDayType("holiday");
        } else {
          setDayType("class");
        }

        setLoadingRecord(false);
        return;
      }

      const data = snapshot.data();
      setDayType(
        dayName === "Sunday" ? "holiday" : data.t || "class"
      );
      setAttendance(data.s || {});
      setLateNotes(data.n || {});
    } catch (error) {
      console.error("Load attendance record:", error);
      setMessage("Unable to load attendance record.");
    }

    setLoadingRecord(false);
  };

  useEffect(() => {
    loadRecord();
  }, [date, department, departmentStudents.length]);

  // =========================================================
  // DATE CHANGE
  // =========================================================

  const changeDate = (value) => {
    setDate(value);
    const selectedDate = getDateObject(value);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      setDayType("holiday");
    } else {
      setDayType("class");
    }

    setAttendance({});
    setLateNotes({});
    setMessage("");
  };

  // =========================================================
  // DEPARTMENT CHANGE
  // =========================================================

  const changeDepartment = (value) => {
    setDepartment(value);
    setAttendance({});
    setLateNotes({});
    setSearch("");
    setMessage("");
  };

  // =========================================================
  // SET DAY TYPE
  // =========================================================

  const changeDayType = (type) => {
    if (dayName === "Sunday") {
      setDayType("holiday");
      return;
    }

    setDayType(type);

    if (type === "holiday") {
      setAttendance({});
      setLateNotes({});
    }
  };

  // =========================================================
  // MARK STUDENT
  // =========================================================

  const markStudent = (studentId, status) => {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  };

  // =========================================================
  // MARK ALL
  // =========================================================

  const markAll = (status) => {
    const newAttendance = {};
    filteredStudents.forEach((student) => {
      newAttendance[student.id] = status;
    });

    setAttendance((previous) => ({
      ...previous,
      ...newAttendance,
    }));
  };

  // =========================================================
  // MARK ALL NOT JOINED
  // =========================================================

  const markAllNotJoined = () => {
    const newAttendance = {};
    filteredStudents.forEach((student) => {
      newAttendance[student.id] = STATUS.NOT_JOINED;
    });

    setAttendance((previous) => ({
      ...previous,
      ...newAttendance,
    }));
  };

  // =========================================================
  // LATE NOTE
  // =========================================================

  const updateLateNote = (studentId, value) => {
    setLateNotes((previous) => ({
      ...previous,
      [studentId]: value,
    }));
  };

  // =========================================================
  // SAVE HOLIDAY
  // =========================================================

  const saveHoliday = async () => {
    if (!date || !department) {
      setMessage("Select date and department.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const recordId = `${date}_${department}`;
      const recordRef = doc(db, "attendance", recordId);

      await setDoc(recordRef, {
        d: date,
        dep: department,
        t: "holiday",
        s: {},
        n: {},
        u: serverTimestamp(),
      });

      setAttendance({});
      setLateNotes({});
      setMessage("Holiday saved successfully.");
    } catch (error) {
      console.error("Save holiday error:", error);
      setMessage("Unable to save holiday.");
    }

    setSaving(false);
  };

  // =========================================================
  // SAVE / UPDATE ATTENDANCE
  // =========================================================

  const saveAttendance = async () => {
    if (!date) {
      setMessage("Please select a date.");
      return;
    }

    if (dayName === "Sunday" || dayType === "holiday") {
      await saveHoliday();
      return;
    }

    const missingStudents = departmentStudents.filter(
      (student) => !attendance[student.id]
    );

    if (missingStudents.length > 0) {
      setMessage(
        `${missingStudents.length} student(s) are not marked. Please select Present, Absent, Late, or Not Joined.`
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const recordId = `${date}_${department}`;
      const recordRef = doc(db, "attendance", recordId);

      const notes = {};
      Object.entries(lateNotes).forEach(([studentId, note]) => {
        if (note && note.trim()) {
          notes[studentId] = note.trim();
        }
      });

      await setDoc(
        recordRef,
        {
          d: date,
          dep: department,
          t: "class",
          s: attendance,
          n: notes,
          u: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Attendance saved / updated successfully.");
    } catch (error) {
      console.error("Save attendance error:", error);
      setMessage("Unable to save attendance.");
    }

    setSaving(false);
  };

  // =========================================================
  // DELETE RECORD
  // =========================================================

  const deleteRecord = async (record) => {
    const departmentName = record.dep === "cs" ? "CS" : "AIDS";
    const isHoliday = record.t === "holiday";

    const confirmation = window.confirm(
      `Delete ${
        isHoliday ? "holiday" : "attendance"
      } record?\n\nDate: ${formatDate(record.d)}\nDepartment: ${departmentName}\n\nThis action cannot be undone.`
    );

    if (!confirmation) return;

    try {
      setMessage("");
      const recordRef = doc(db, "attendance", record.id);
      await deleteDoc(recordRef);

      if (record.d === date && record.dep === department) {
        setAttendance({});
        setLateNotes({});

        if (dayName === "Sunday" || dayName === "Saturday") {
          setDayType("holiday");
        } else {
          setDayType("class");
        }
      }

      setMessage("Attendance record deleted successfully.");
    } catch (error) {
      console.error("Delete attendance error:", error);
      setMessage("Unable to delete attendance record.");
    }
  };

  // =========================================================
  // OPEN PREVIOUS RECORD
  // =========================================================

  const openRecord = (record) => {
    setDate(record.d);
    setDepartment(record.dep);
    setDayType(
      record.d && getDayName(record.d) === "Sunday"
        ? "holiday"
        : record.t || "class"
    );
    setAttendance(record.s || {});
    setLateNotes(record.n || {});
    setSearch("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // GROUP RECORDS BY MONTH
  // =========================================================

  const groupedRecords = useMemo(() => {
    const groups = {};

    records.forEach((record) => {
      if (!record.d) return;

      const month = getDateObject(record.d).toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      );

      if (!groups[month]) {
        groups[month] = [];
      }

      groups[month].push(record);
    });

    return groups;
  }, [records]);

  // =========================================================
  // COUNTS
  // =========================================================

  const presentCount = filteredStudents.filter(
    (student) => attendance[student.id] === STATUS.PRESENT
  ).length;

  const absentCount = filteredStudents.filter(
    (student) => attendance[student.id] === STATUS.ABSENT
  ).length;

  const lateCount = filteredStudents.filter(
    (student) => attendance[student.id] === STATUS.LATE
  ).length;

  const notJoinedCount = filteredStudents.filter(
    (student) => attendance[student.id] === STATUS.NOT_JOINED
  ).length;

  const unmarkedCount =
    filteredStudents.length -
    presentCount -
    absentCount -
    lateCount -
    notJoinedCount;

  // =========================================================
  // WHATSAPP SHARE
  // =========================================================

  const shareAttendanceToWhatsApp = () => {
    const departmentName = getDepartmentName(department).toUpperCase();

    const presentStudents = departmentStudents.filter(
      (student) =>
        attendance[student.id] === STATUS.PRESENT ||
        attendance[student.id] === STATUS.LATE
    );

    const absentStudents = departmentStudents.filter(
      (student) => attendance[student.id] === STATUS.ABSENT
    );

    const notJoinedStudents = departmentStudents.filter(
      (student) => attendance[student.id] === STATUS.NOT_JOINED
    );

    const studentName = (student) =>
      student.fullName || student.name || "Unnamed Student";

    const presentNames = presentStudents
      .map(studentName)
      .sort((a, b) => a.localeCompare(b));

    const absentNames = absentStudents
      .map(studentName)
      .sort((a, b) => a.localeCompare(b));

    const notJoinedNames = notJoinedStudents
      .map(studentName)
      .sort((a, b) => a.localeCompare(b));

    let messageText =
      `${departmentName}\n` +
      `${formatDate(date)}\n\n` +
      `TOTAL: ${departmentStudents.length}\n` +
      `PRESENT: ${presentNames.length}\n` +
      `ABSENT: ${absentNames.length}`;

    if (notJoinedNames.length) {
      messageText += `\nNOT JOINED: ${notJoinedNames.length}`;
    }

    messageText += `\n\nPRESENT STUDENTS (${presentNames.length})\n`;
    messageText += presentNames.length
      ? presentNames
          .map((name, index) => `${index + 1}. ${name}`)
          .join("\n")
      : "None";

    messageText += `\n\nABSENT STUDENTS (${absentNames.length})\n`;
    messageText += absentNames.length
      ? absentNames
          .map((name, index) => `${index + 1}. ${name}`)
          .join("\n")
      : "None";

    if (notJoinedNames.length) {
      messageText += `\n\nNOT JOINED STUDENTS (${notJoinedNames.length})\n`;
      messageText += notJoinedNames
        .map((name, index) => `${index + 1}. ${name}`)
        .join("\n");
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      messageText
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (value) => {
    return getDateObject(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDay = (value) => {
    return getDateObject(value).toLocaleDateString("en-IN", {
      weekday: "short",
    });
  };

  const getDepartmentName = (id) => {
    return DEPARTMENTS.find((item) => item.id === id)?.name || id;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="attendance-page">
      {/* HEADER */}
      <header className="attendance-header">
        <div>
          <Link to="/d" className="attendance-back">
            <ArrowLeft size={17} strokeWidth={2.2} /> Student Details
          </Link>
          <h1>Attendance</h1>
          <p>
            Manage daily student attendance and previous records
          </p>
        </div>
      </header>

      {/* ATTENDANCE TABS */}
      <div className="attendance-tabs">
        <button
          type="button"
          className={
            activeTab === "attendance"
              ? "attendance-tab active"
              : "attendance-tab"
          }
          onClick={() => setActiveTab("attendance")}
        >
          <ClipboardCheck size={17} /> Attendance
        </button>

        <button
          type="button"
          className={
            activeTab === "history"
              ? "attendance-tab active"
              : "attendance-tab"
          }
          onClick={() => setActiveTab("history")}
        >
          <History size={17} /> Attendance Records
          <span>{records.length}</span>
        </button>
      </div>

      {/* CURRENT ATTENDANCE */}
      {activeTab === "attendance" && (
        <section className="attendance-main-card">
          <div className="attendance-top">
            <div className="field-box">
              <label>Attendance Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => changeDate(event.target.value)}
              />
            </div>

            <div className="field-box">
              <label>Department</label>
              <select
                value={department}
                onChange={(event) =>
                  changeDepartment(event.target.value)
                }
              >
                {DEPARTMENTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="day-display">
              <span>{dayName}</span>
              {dayType === "holiday" && (
                <b className="holiday-badge">HOLIDAY</b>
              )}
              {dayType === "class" && (
                <b className="class-badge">CLASS</b>
              )}
            </div>
          </div>

          <div className="day-type-section">
            <span>Day Type</span>
            <div className="day-type-buttons">
              <button
                disabled={dayName === "Sunday"}
                className={dayType === "class" ? "selected-class" : ""}
                onClick={() => changeDayType("class")}
              >
                <BookOpen size={17} /> Class Day
              </button>

              <button
                className={
                  dayType === "holiday" ? "selected-holiday" : ""
                }
                onClick={() => changeDayType("holiday")}
              >
                <Umbrella size={17} /> Holiday
              </button>
            </div>

            {dayName === "Sunday" && (
              <small>Sunday is always a holiday.</small>
            )}

            {dayName === "Saturday" && (
              <small>Saturday can be a class day or holiday.</small>
            )}
          </div>

          {dayType === "holiday" ? (
            <div className="holiday-screen">
              <div className="holiday-icon">
                <Umbrella size={48} strokeWidth={1.7} />
              </div>
              <h2>Holiday</h2>
              <p>
                {formatDate(date)} · {dayName}
              </p>
              <span>
                No student attendance is required for this day.
              </span>
              <button onClick={saveHoliday} disabled={saving}>
                {saving ? "Saving..." : <><Save size={17} /> Save Holiday</>}
              </button>
            </div>
          ) : (
            <>
              <div className="attendance-toolbar">
                <div className="attendance-search">
                  <span>
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search student name / register number..."
                  />
                </div>

                <button
                  onClick={() => markAll(STATUS.PRESENT)}
                >
                  <Check size={16} /> All Present
                </button>

                <button
                  onClick={() => markAll(STATUS.ABSENT)}
                >
                  <X size={16} /> All Absent
                </button>

                <button onClick={markAllNotJoined}>
                  <UserRoundX size={16} /> All Not Joined
                </button>
              </div>

              <div className="attendance-summary">
                <div>
                  <span>Students</span>
                  <strong>{filteredStudents.length}</strong>
                </div>

                <div className="green">
                  <span>Present</span>
                  <strong>{presentCount}</strong>
                </div>

                <div className="red">
                  <span>Absent</span>
                  <strong>{absentCount}</strong>
                </div>

                <div className="yellow">
                  <span>Late</span>
                  <strong>{lateCount}</strong>
                </div>

                <div className="gray">
                  <span>Not Joined</span>
                  <strong>{notJoinedCount}</strong>
                </div>

                <div className="gray">
                  <span>Unmarked</span>
                  <strong>{unmarkedCount}</strong>
                </div>
              </div>

              <div className="attendance-students">
                {loading || loadingRecord ? (
                  <div className="attendance-loading">
                    Loading...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="attendance-empty">
                    <h3>No students found</h3>
                    <p>
                      Check the selected department or search.
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((student, index) => {
                    const studentName =
                      student.fullName ||
                      student.name ||
                      "Unnamed Student";

                    const registerNumber =
                      student.registerNumber ||
                      student.regNo ||
                      student.registerNo ||
                      "";

                    const status = attendance[student.id];

                    return (
                      <div
                        key={student.id}
                        className={`attendance-row ${status || ""}`}
                      >
                        <div className="student-index">
                          {index + 1}
                        </div>

                        <div className="student-avatar">
                          {String(studentName)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="student-info">
                          <strong>{studentName}</strong>
                          <span>
                            {registerNumber || "No register number"}
                          </span>
                        </div>

                        <div className="status-buttons">
                          <button
                            className={
                              status === STATUS.PRESENT
                                ? "active-present"
                                : ""
                            }
                            onClick={() =>
                              markStudent(
                                student.id,
                                STATUS.PRESENT
                              )
                            }
                          >
                            <Check size={16} /> Present
                          </button>

                          <button
                            className={
                              status === STATUS.ABSENT
                                ? "active-absent"
                                : ""
                            }
                            onClick={() =>
                              markStudent(
                                student.id,
                                STATUS.ABSENT
                              )
                            }
                          >
                            <X size={16} /> Absent
                          </button>

                          <button
                            className={
                              status === STATUS.LATE
                                ? "active-late"
                                : ""
                            }
                            onClick={() =>
                              markStudent(
                                student.id,
                                STATUS.LATE
                              )
                            }
                          >
                            <Clock3 size={16} /> Late
                          </button>

                          <button
                            className={
                              status === STATUS.NOT_JOINED
                                ? "active-not-joined"
                                : ""
                            }
                            onClick={() =>
                              markStudent(
                                student.id,
                                STATUS.NOT_JOINED
                              )
                            }
                          >
                            <UserRoundX size={16} /> Not Joined
                          </button>
                        </div>

                        {status === STATUS.LATE && (
                          <input
                            className="late-note"
                            value={lateNotes[student.id] || ""}
                            onChange={(event) =>
                              updateLateNote(
                                student.id,
                                event.target.value
                              )
                            }
                            placeholder="Late note..."
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {message && (
            <div className="attendance-message">{message}</div>
          )}

          {dayType === "class" && (
            <div className="attendance-save">
              <div>
                <strong>{formatDate(date)}</strong>
                <span> · {getDepartmentName(department)}</span>
              </div>

              <div className="attendance-save-actions">
                <button
                  type="button"
                  className="whatsapp-share-button"
                  onClick={shareAttendanceToWhatsApp}
                  disabled={
                    presentCount +
                      absentCount +
                      lateCount +
                      notJoinedCount ===
                    0
                  }
                >
                  <Share2 size={17} /> Share WhatsApp
                </button>

                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save / Update Attendance"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* HISTORY */}
      {activeTab === "history" && (
        <section className="attendance-history">
          <div className="history-header">
            <div>
              <h2>Attendance Records</h2>
              <p>Previous attendance and holidays</p>
            </div>
            <div className="history-total">
              {records.length} records
            </div>
          </div>

          {Object.keys(groupedRecords).length === 0 ? (
            <div className="history-empty">
              <div>
                <CalendarDays size={42} strokeWidth={1.7} />
              </div>
              <strong>No records yet</strong>
              <span>
                Saved attendance and holidays will appear here.
              </span>
            </div>
          ) : (
            Object.entries(groupedRecords).map(
              ([month, monthRecords]) => (
                <div className="month-group" key={month}>
                  <div className="month-title">
                    <span>{month}</span>
                    <small>{monthRecords.length} records</small>
                  </div>

                  <div className="history-table">
                    {monthRecords.map((record) => {
                      const isHoliday = record.t === "holiday";
                      const statusValues = Object.values(
                        record.s || {}
                      );

                      const p = statusValues.filter(
                        (value) => value === STATUS.PRESENT
                      ).length;

                      const a = statusValues.filter(
                        (value) => value === STATUS.ABSENT
                      ).length;

                      const l = statusValues.filter(
                        (value) => value === STATUS.LATE
                      ).length;

                      const nj = statusValues.filter(
                        (value) => value === STATUS.NOT_JOINED
                      ).length;

                      return (
                        <div
                          className={`history-row ${
                            isHoliday ? "history-holiday" : ""
                          }`}
                          key={record.id}
                        >
                          <div className="history-date">
                            <strong>{formatDate(record.d)}</strong>
                            <span>{formatDay(record.d)}</span>
                          </div>

                          <div className="history-department">
                            <span
                              className={`department-pill ${record.dep}`}
                            >
                              {record.dep === "cs" ? "CS" : "AIDS"}
                            </span>
                            <small>
                              {getDepartmentName(record.dep)}
                            </small>
                          </div>

                          {isHoliday ? (
                            <div className="history-holiday-label">
                              <span>
                                <Umbrella size={15} />
                              </span>
                              HOLIDAY
                            </div>
                          ) : (
                            <div className="history-counts">
                              <span className="hp">
                                <Check size={14} /> {p}
                                <small>Present</small>
                              </span>

                              <span className="ha">
                                <X size={14} /> {a}
                                <small>Absent</small>
                              </span>

                              <span className="hl">
                                <Clock3 size={14} /> {l}
                                <small>Late</small>
                              </span>

                              <span className="hnj">
                                <UserRoundX size={14} /> {nj}
                                <small>Not Joined</small>
                              </span>
                            </div>
                          )}

                          <div className="history-actions">
                            <button
                              className="history-view"
                              onClick={() => openRecord(record)}
                            >
                              <Eye size={15} /> VIEW
                            </button>

                            <button
                              className="history-delete"
                              onClick={() => deleteRecord(record)}
                              title="Delete record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )
          )}
        </section>
      )}
    </div>
  );
}

export default Attendance;