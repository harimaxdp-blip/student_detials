import { useEffect, useMemo, useState, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import "./AttendanceDashboard.css";
import bannerImage from "../assets/new.png";
import pageFlipAudioSrc from "../assets/paper.wav";
import {
  exportToExcel,
  exportToPDF,
  exportToWord,
} from "../utils/exportAttendance";

// Lucide Icons
import {
  ArrowLeft,
  Calendar,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  GraduationCap,
  Loader2,
  Inbox,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  TableProperties,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  BookOpen,
  Bookmark,
  Volume2,
  VolumeX,
} from "lucide-react";

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
};

const STUDENTS_PER_PAGE = 20;

const getDateString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
};

const getStudentName = (student) =>
  student.fullName ||
  student.name ||
  student.studentName ||
  "Unnamed Student";

// StudentDetails stores photos in imageUrl.
// These fallbacks also support older student records.
const getStudentImage = (student) =>
  student?.imageUrl ||
  student?.photoUrl ||
  student?.photoURL ||
  student?.profileImage ||
  student?.studentImage ||
  student?.image ||
  student?.photo ||
  "";

const getStudentMobile = (student) =>
  student?.studentMobile ||
  student?.studentPhone ||
  student?.mobile ||
  student?.phone ||
  "";

const getFatherMobile = (student) =>
  student?.fatherMobile ||
  student?.fatherPhone ||
  student?.fatherNumber ||
  "";

const getMotherMobile = (student) =>
  student?.motherMobile ||
  student?.motherPhone ||
  student?.motherNumber ||
  "";

const cleanPhone = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).trim();
};

const getRegisterNumber = (student) =>
  student.registerNumber ||
  student.regNo ||
  student.registerNo ||
  student.rollNo ||
  student.register_number ||
  "-";

const getDepartment = (student) => {
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

const sortStudentsAlphabetically = (items) => {
  return [...items].sort((a, b) =>
    getStudentName(a.student || a).localeCompare(
      getStudentName(b.student || b),
      undefined,
      { sensitivity: "base", numeric: true }
    )
  );
};

function AttendanceDashboard() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  // View switch: "daybyday" | "summary" | "realbook"
  const [viewMode, setViewMode] = useState("daybyday");

  // Summary and Register Month
  const [fromMonth, setFromMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [toMonth, setToMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Selected date for day-by-day
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Real Book Turning States
  const [bookPage, setBookPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState("next");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio element reference using assets sound file
  const flipAudioRef = useRef(null);

  useEffect(() => {
    flipAudioRef.current = new Audio(pageFlipAudioSrc);
    flipAudioRef.current.preload = "auto";
  }, []);

  const playPaperSound = () => {
    if (!soundEnabled || !flipAudioRef.current) return;
    try {
      flipAudioRef.current.currentTime = 0;
      flipAudioRef.current.play().catch(() => {});
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  // Filters
  const [department, setDepartment] = useState("all");
  const [summaryFilter, setSummaryFilter] = useState("all");
  const [dayStatusFilter, setDayStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  // Close the export menu whenever the user clicks/taps outside it.
  // Escape also closes it for keyboard users.
  useEffect(() => {
    if (!showDownloadMenu) return;

    const handleOutsideClick = (event) => {
      if (
        downloadMenuRef.current &&
        !downloadMenuRef.current.contains(event.target)
      ) {
        setShowDownloadMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowDownloadMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDownloadMenu]);

  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setStudents(data);
      },
      (error) => {
        console.error("Students error:", error);
        setLoading(false);
      }
    );

    const unsubRecords = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        console.error("Attendance error:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, []);

  const shiftDay = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  const validFromMonth = fromMonth <= toMonth ? fromMonth : toMonth;
  const validToMonth = fromMonth <= toMonth ? toMonth : fromMonth;

  const classRecords = useMemo(() => {
    return records
      .filter((record) => {
        const date = getDateString(record.d);
        if (!date) return false;
        const recordMonth = date.slice(0, 7);
        if (recordMonth < validFromMonth || recordMonth > validToMonth) {
          return false;
        }
        const type = String(record.t || "").toLowerCase();
        return type === "c" || type === "class";
      })
      .sort((a, b) => getDateString(a.d).localeCompare(getDateString(b.d)));
  }, [records, validFromMonth, validToMonth]);

  const summaryAttendanceData = useMemo(() => {
    const result = {};

    students.forEach((student) => {
      const dep = getDepartment(student);
      if (!dep) return;
      if (department !== "all" && department !== dep) return;

      const joiningDate = getJoiningDate(student);
      let workingDays = 0;
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;

      classRecords.forEach((record) => {
        const date = getDateString(record.d);
        if (joiningDate && date < joiningDate) return;
        if (record.dep !== dep) return;

        workingDays++;
        const status = record.s?.[student.id];

        if (status === STATUS.ABSENT) {
          absentDays++;
        } else if (status === STATUS.LATE) {
          lateDays++;
          presentDays++;
        } else {
          presentDays++;
        }
      });

      const percentage =
        workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

      result[student.id] = {
        student,
        dep,
        joiningDate,
        workingDays,
        presentDays,
        absentDays,
        lateDays,
        percentage,
      };
    });

    return result;
  }, [students, classRecords, department]);

  const dayRecordsForSelectedDate = useMemo(() => {
    return records.filter(
      (record) => getDateString(record.d) === selectedDate
    );
  }, [records, selectedDate]);

  const singleDayData = useMemo(() => {
    const data = students
      .filter((student) => {
        const dep = getDepartment(student);
        if (!dep) return false;
        if (department !== "all" && department !== dep) return false;
        return true;
      })
      .map((student) => {
        const dep = getDepartment(student);
        const joiningDate = getJoiningDate(student);

        if (joiningDate && selectedDate < joiningDate) {
          return { student, dep, status: "not-joined" };
        }

        const depRecord = dayRecordsForSelectedDate.find(
          (record) => record.dep === dep
        );

        if (!depRecord) {
          return { student, dep, status: "no-class" };
        }

        const status = depRecord.s?.[student.id];
        if (status === STATUS.ABSENT) {
          return { student, dep, status: "absent" };
        }
        if (status === STATUS.LATE) {
          return { student, dep, status: "late" };
        }
        return { student, dep, status: "present" };
      });

    return sortStudentsAlphabetically(data);
  }, [students, dayRecordsForSelectedDate, selectedDate, department]);

  const dailyKPI = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let activeTotal = 0;

    singleDayData.forEach((item) => {
      if (item.status === "present") {
        present++;
        activeTotal++;
      } else if (item.status === "absent") {
        absent++;
        activeTotal++;
      } else if (item.status === "late") {
        late++;
        present++;
        activeTotal++;
      }
    });

    const percent =
      activeTotal > 0
        ? ((present / activeTotal) * 100).toFixed(1)
        : "0.0";

    return {
      present,
      absent,
      late,
      total: singleDayData.length,
      percent,
    };
  }, [singleDayData]);

  const displayedDailyStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return singleDayData.filter((item) => {
      const name = getStudentName(item.student).toLowerCase();
      const reg = getRegisterNumber(item.student).toLowerCase();

      if (query && !name.includes(query) && !reg.includes(query)) {
        return false;
      }
      if (dayStatusFilter !== "all" && item.status !== dayStatusFilter) {
        return false;
      }
      return true;
    });
  }, [singleDayData, search, dayStatusFilter]);

  const displayedSummaryStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return Object.values(summaryAttendanceData)
      .filter((item) => {
        const name = getStudentName(item.student).toLowerCase();
        const reg = getRegisterNumber(item.student).toLowerCase();

        if (query && !name.includes(query) && !reg.includes(query)) {
          return false;
        }
        if (summaryFilter === "low" && item.percentage >= 75) {
          return false;
        }
        if (summaryFilter === "good" && item.percentage < 75) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        getStudentName(a.student).localeCompare(
          getStudentName(b.student),
          undefined,
          { sensitivity: "base", numeric: true }
        )
      );
  }, [summaryAttendanceData, search, summaryFilter]);

  // =========================================================
  // REAL REGISTER BOOK LOGIC (FOLIO DAYS & DAY MARKS)
  // =========================================================
  const registerMonth = fromMonth;

  const monthCalendarDays = useMemo(() => {
    if (!registerMonth) return [];
    const [year, month] = registerMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const days = [];

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${registerMonth}-${String(day).padStart(2, "0")}`;
      const d = new Date(`${dateStr}T00:00:00`);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const isSunday = d.getDay() === 0;
      days.push({
        dayNumber: day,
        dateStr,
        dayName: dayName.slice(0, 2),
        isSunday,
      });
    }
    return days;
  }, [registerMonth]);

  const recordsByDateAndDep = useMemo(() => {
    const map = {};
    records.forEach((rec) => {
      const d = getDateString(rec.d);
      if (!d) return;
      const key = `${d}_${rec.dep}`;
      map[key] = rec;
    });
    return map;
  }, [records]);

  const realBookStudents = useMemo(() => {
    return displayedSummaryStudents.map((item) => {
      const student = item.student;
      const dep = item.dep;
      const joiningDate = item.joiningDate;

      const dayMarks = monthCalendarDays.map((calDay) => {
        if (calDay.isSunday) {
          return { char: "S", type: "holiday" };
        }

        if (joiningDate && calDay.dateStr < joiningDate) {
          return { char: "-", type: "not-joined" };
        }

        const key = `${calDay.dateStr}_${dep}`;
        const record = recordsByDateAndDep[key];

        if (!record) {
          return { char: "—", type: "no-class" };
        }

        const s = record.s?.[student.id];
        if (s === STATUS.ABSENT) return { char: "A", type: "absent" };
        if (s === STATUS.LATE) return { char: "L", type: "late" };
        return { char: "P", type: "present" };
      });

      return {
        ...item,
        dayMarks,
      };
    });
  }, [displayedSummaryStudents, monthCalendarDays, recordsByDateAndDep]);

  const totalBookPages = Math.max(
    1,
    Math.ceil(realBookStudents.length / STUDENTS_PER_PAGE)
  );

  const currentBookPageStudents = useMemo(() => {
    const start = (bookPage - 1) * STUDENTS_PER_PAGE;
    return realBookStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [realBookStudents, bookPage]);

  // Turn page with physical 3D animation and sound effect
  const handleTurnPage = (direction) => {
    if (isFlipping) return;

    if (direction === "next" && bookPage < totalBookPages) {
      playPaperSound();
      setFlipDirection("next");
      setIsFlipping(true);

      setTimeout(() => {
        setBookPage((prev) => prev + 1);
      }, 260);

      setTimeout(() => {
        setIsFlipping(false);
      }, 620);
    } else if (direction === "prev" && bookPage > 1) {
      playPaperSound();
      setFlipDirection("prev");
      setIsFlipping(true);

      setTimeout(() => {
        setBookPage((prev) => prev - 1);
      }, 260);

      setTimeout(() => {
        setIsFlipping(false);
      }, 620);
    }
  };

  const formatSelectedDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPercentageClass = (percentage) => {
    if (percentage < 75) return "danger";
    if (percentage < 85) return "warning";
    return "success";
  };

  const getPeriodText = () => {
    const fMonth = new Date(`${validFromMonth}-01`).toLocaleDateString("en-US", { month: "long" });
    const tMonth = new Date(`${validToMonth}-01`).toLocaleDateString("en-US", { month: "long" });
    return fMonth === tMonth ? fMonth : `${fMonth} - ${tMonth}`;
  };

  const getDepartmentTitle = () => {
    if (department === "aids") {
      return "DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE";
    }
    if (department === "cs") {
      return "DEPARTMENT OF COMPUTER SCIENCE";
    }
    return "DEPARTMENT OF COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE";
  };

  const resolveStudentDept = (s) => {
    const raw = String(
      s.dep || s.department || s.student?.course || s.student?.department || s.course || ""
    ).toLowerCase();

    if (raw.includes("ai") || raw.includes("data") || raw === "aids") {
      return "aids";
    }
    return "cs";
  };

  const handleDownload = async (format) => {
    if (!displayedSummaryStudents.length) {
      alert("No attendance records to export.");
      return;
    }

    try {
      setDownloading(true);
      setShowDownloadMenu(false);

      const admissionYear = 2026;
      const batchPeriod = `${admissionYear} - ${admissionYear + 3}`;

      const enrichedStudents = displayedSummaryStudents.map((item) => ({
        ...item,
        dep: resolveStudentDept(item),
      }));

      const deptSuffix =
        department === "all"
          ? "CS_AND_AIDS"
          : department === "aids"
          ? "AIDS"
          : "CS";

      const payload = {
        bannerUrl: bannerImage,
        students: enrichedStudents,
        departmentCode: department,
        departmentName: getDepartmentTitle(),
        periodText: getPeriodText(),
        academicYear: batchPeriod,
        fileName: `Attendance_${deptSuffix}_${getPeriodText().replace(/\s+/g, "_")}.${format}`,
      };

      if (format === "xlsx") {
        await exportToExcel(payload);
      } else if (format === "pdf") {
        await exportToPDF(payload);
      } else if (format === "docx") {
        await exportToWord(payload);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="attendance-dashboard">
  

      {/* FILTER CARD */}
      <section className="ad-filter-card">
        {/* VIEW TOGGLE */}
        <div className="ad-toggle-container">
          <div className="ad-view-toggle three-toggle">
            <button
              type="button"
              className={viewMode === "daybyday" ? "active" : ""}
              onClick={() => setViewMode("daybyday")}
            >
              <CalendarCheck size={16} />
              <span>Day-by-Day</span>
            </button>

            <button
              type="button"
              className={viewMode === "summary" ? "active" : ""}
              onClick={() => setViewMode("summary")}
            >
              <TableProperties size={16} />
              <span>Monthly Summary</span>
            </button>

            <button
              type="button"
              className={viewMode === "realbook" ? "active" : ""}
              onClick={() => {
                setViewMode("realbook");
                setBookPage(1);
                playPaperSound();
              }}
            >
              <BookOpen size={16} />
              <span>Real Attendance</span>
            </button>
          </div>
        </div>

        {/* INPUT FILTERS */}
        <div className="ad-filter">
          {viewMode === "daybyday" ? (
            <div className="ad-field">
              <label>Select Date</label>
              <div className="day-stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => shiftDay(-1)}
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  <ChevronLeft size={18} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => shiftDay(1)}
                  title="Next Day"
                  aria-label="Next Day"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : viewMode === "summary" ? (
            <>
              <div className="ad-field">
                <label>From Month</label>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                />
              </div>

              <div className="ad-field">
                <label>To Month</label>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="ad-field">
              <label>Register Month (Book Folio)</label>
              <input
                type="month"
                value={fromMonth}
                onChange={(e) => {
                  setFromMonth(e.target.value);
                  setToMonth(e.target.value);
                  setBookPage(1);
                  playPaperSound();
                }}
              />
            </div>
          )}

          {/* DEPARTMENT */}
          <div className="ad-field">
            <label>Department</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setBookPage(1);
              }}
            >
              <option value="all">All Departments</option>
              <option value="cs">Computer Science (CS)</option>
              <option value="aids">AI & Data Science (AIDS)</option>
            </select>
          </div>

          {/* SEARCH */}
          <div className="ad-field">
            <label>Search Directory</label>
            <div className="ad-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or reg no..."
              />
            </div>
          </div>
        </div>

        {/* STATUS FILTER BUTTONS */}
        <div className="ad-filter-buttons">
          {viewMode === "daybyday" ? (
            <>
              <button
                type="button"
                className={dayStatusFilter === "all" ? "active" : ""}
                onClick={() => setDayStatusFilter("all")}
              >
                <Users size={14} />
                All ({singleDayData.length})
              </button>

              <button
                type="button"
                className={dayStatusFilter === "present" ? "active-good" : ""}
                onClick={() => setDayStatusFilter("present")}
              >
                <Check size={14} />
                Present ({dailyKPI.present})
              </button>

              <button
                type="button"
                className={dayStatusFilter === "absent" ? "active-low" : ""}
                onClick={() => setDayStatusFilter("absent")}
              >
                <X size={14} />
                Absent ({dailyKPI.absent})
              </button>

              <button
                type="button"
                className={dayStatusFilter === "late" ? "active-late" : ""}
                onClick={() => setDayStatusFilter("late")}
              >
                <Clock size={14} />
                Late ({dailyKPI.late})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={summaryFilter === "all" ? "active" : ""}
                onClick={() => setSummaryFilter("all")}
              >
                <Users size={14} />
                All Students
              </button>

              <button
                type="button"
                className={summaryFilter === "low" ? "active-low" : ""}
                onClick={() => setSummaryFilter("low")}
              >
                <AlertTriangle size={14} />
                Below 75%
              </button>

              <button
                type="button"
                className={summaryFilter === "good" ? "active-good" : ""}
                onClick={() => setSummaryFilter("good")}
              >
                <CheckCircle2 size={14} />
                75% & Above
              </button>
            </>
          )}
        </div>
      </section>

      {/* KPI METRICS (DAY-BY-DAY & SUMMARY) */}
      {viewMode === "daybyday" ? (
        <section className="ad-summary">
          <div className="ad-card blue">
            <div className="ad-card-icon">
              <Calendar size={22} />
            </div>
            <div>
              <span>Selected Date</span>
              <strong>{formatSelectedDate(selectedDate)}</strong>
              <small>Daily roster</small>
            </div>
          </div>

          <div className="ad-card green">
            <div className="ad-card-icon">
              <Check size={22} />
            </div>
            <div>
              <span>Present Today</span>
              <strong>{dailyKPI.present}</strong>
              <small>{dailyKPI.percent}% Turnout</small>
            </div>
          </div>

          <div className="ad-card red">
            <div className="ad-card-icon">
              <X size={22} />
            </div>
            <div>
              <span>Absent Today</span>
              <strong>{dailyKPI.absent}</strong>
              <small>Action required</small>
            </div>
          </div>

          <div className="ad-card yellow">
            <div className="ad-card-icon">
              <Clock size={22} />
            </div>
            <div>
              <span>Late Arrivals</span>
              <strong>{dailyKPI.late}</strong>
              <small>Marked late</small>
            </div>
          </div>
        </section>
      ) : viewMode === "summary" ? (
        <section className="ad-summary summary-two-col">
          <div className="ad-card blue">
            <div className="ad-card-icon">
              <CalendarDays size={22} />
            </div>
            <div>
              <span>Total Class Days</span>
              <strong>{classRecords.length}</strong>
              <small>Selected period</small>
            </div>
          </div>

          <div className="ad-card purple">
            <div className="ad-card-icon">
              <GraduationCap size={22} />
            </div>
            <div>
              <span>Enrolled Students</span>
              <strong>{displayedSummaryStudents.length}</strong>
              <small>In department</small>
            </div>
          </div>
        </section>
      ) : null}

      {/* =======================================================
          VIEW 1 & 2: DAY-BY-DAY & MONTHLY SUMMARY TABLE
          ======================================================= */}
      {viewMode !== "realbook" ? (
        <section className="ad-table-card">
          <div className="ad-table-header">
            <div>
              <h2>
                {viewMode === "daybyday"
                  ? `Attendance: ${formatSelectedDate(selectedDate)}`
                  : "Summary Report"}
              </h2>
              <p>
                {department === "all"
                  ? "All Departments (CS & AIDS)"
                  : department === "cs"
                  ? "Computer Science Department"
                  : "AI & Data Science Department"}
              </p>
            </div>

            <div className="ad-header-actions">
              <div className="ad-result-count">
                <Users size={13} />
                <span>
                  {viewMode === "daybyday"
                    ? displayedDailyStudents.length
                    : displayedSummaryStudents.length}{" "}
                  students
                </span>
              </div>

              {viewMode === "summary" && (
                <div
                  className="ad-download-container"
                  ref={downloadMenuRef}
                >
                  <button
                    type="button"
                    className="ad-download-btn"
                    onClick={() => setShowDownloadMenu((prev) => !prev)}
                    disabled={downloading || displayedSummaryStudents.length === 0}
                  >
                    {downloading ? (
                      <>
                        <Loader2 size={15} className="spin-icon" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        <span>Export Report</span>
                      </>
                    )}
                  </button>

                  {showDownloadMenu && (
                    <div className="ad-download-dropdown">
                      <button
                        type="button"
                        onClick={() => handleDownload("xlsx")}
                      >
                        <FileSpreadsheet size={15} className="icon-excel" />
                        <span>Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload("pdf")}
                      >
                        <FileText size={15} className="icon-pdf" />
                        <span>PDF Document (.pdf)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload("docx")}
                      >
                        <FileType size={15} className="icon-word" />
                        <span>Word Document (.docx)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="ad-loading">
              <Loader2 size={20} className="spin-icon" />
              <span>Loading records...</span>
            </div>
          ) : viewMode === "daybyday" ? (
            displayedDailyStudents.length === 0 ? (
              <div className="ad-empty">
                <Inbox size={40} />
                <h3>No student records found</h3>
                <p>Try switching department, status, or date filters.</p>
              </div>
            ) : (
              <div className="ad-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>STUDENT</th>
                      <th>CONTACT NUMBERS</th>
                      <th>DEPT</th>
                      <th>DAY ATTENDANCE STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDailyStudents.map((item, index) => {
                      const isAbsent = item.status === "absent";

                      return (
                        <tr
                          key={item.student.id}
                          className={isAbsent ? "daily-absent-row" : ""}
                        >
                          <td className="serial">{index + 1}</td>

                          <td>
                            <div className="ad-student">
                              <div className="ad-avatar">
                                {getStudentImage(item.student) ? (
                                  <>
                                    <img
                                      src={getStudentImage(item.student)}
                                      alt={getStudentName(item.student)}
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const fallback = e.currentTarget.nextElementSibling;
                                        if (fallback) fallback.style.display = "grid";
                                      }}
                                    />
                                    <span className="ad-avatar-fallback" style={{ display: "none" }}>
                                      {getStudentName(item.student).charAt(0).toUpperCase()}
                                    </span>
                                  </>
                                ) : (
                                  <span className="ad-avatar-fallback">
                                    {getStudentName(item.student).charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div className="ad-student-name">
                                <strong>{getStudentName(item.student)}</strong>
                              </div>
                            </div>
                          </td>

                          <td className="daily-contact-cell">
                            <div className="daily-contact-list">
                              <a
                                className="daily-contact student-contact"
                                href={
                                  getStudentMobile(item.student)
                                    ? `tel:${String(getStudentMobile(item.student)).replace(/\D/g, "")}`
                                    : undefined
                                }
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="daily-contact-label">Student</span>
                                <span>{cleanPhone(getStudentMobile(item.student))}</span>
                              </a>

                              {isAbsent && (
                                <>
                                  <a
                                    className="daily-contact father-contact"
                                    href={
                                      getFatherMobile(item.student)
                                        ? `tel:${String(getFatherMobile(item.student)).replace(/\D/g, "")}`
                                        : undefined
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="daily-contact-label">Father</span>
                                    <span>{cleanPhone(getFatherMobile(item.student))}</span>
                                  </a>

                                  <a
                                    className="daily-contact mother-contact"
                                    href={
                                      getMotherMobile(item.student)
                                        ? `tel:${String(getMotherMobile(item.student)).replace(/\D/g, "")}`
                                        : undefined
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="daily-contact-label">Mother</span>
                                    <span>{cleanPhone(getMotherMobile(item.student))}</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className={`ad-department ${item.dep}`}>
                              {item.dep === "cs" ? "CS" : "AIDS"}
                            </span>
                          </td>

                          <td>
                            {item.status === "present" && (
                              <span className="day-status-badge present">
                                <Check size={14} /> Present
                              </span>
                            )}
                            {item.status === "absent" && (
                              <span className="day-status-badge absent">
                                <X size={14} /> Absent
                              </span>
                            )}
                            {item.status === "late" && (
                              <span className="day-status-badge late">
                                <Clock size={14} /> Late
                              </span>
                            )}
                            {item.status === "not-joined" && (
                              <span className="day-status-badge not-joined">
                                Joined later
                              </span>
                            )}
                            {item.status === "no-class" && (
                              <span className="day-status-badge not-joined">
                                No class entry
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : displayedSummaryStudents.length === 0 ? (
            <div className="ad-empty">
              <Inbox size={40} />
              <h3>No student records found</h3>
              <p>Try switching department or attendance threshold filters.</p>
            </div>
          ) : (
            <div className="ad-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>STUDENT</th>
                    <th>REG NUMBER</th>
                    <th>DEPT</th>
                    <th>WORKING</th>
                    <th>PRESENT</th>
                    <th>ABSENT</th>
                    <th>LATE</th>
                    <th>ATTENDANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSummaryStudents.map((item, index) => {
                    const percentage = item.percentage;
                    const cls = getPercentageClass(percentage);

                    return (
                      <tr key={item.student.id}>
                        <td className="serial">{index + 1}</td>
                        <td>
                          <div className="ad-student">
                            <div className="ad-avatar">
                              {getStudentImage(item.student) ? (
                                <>
                                  <img
                                    src={getStudentImage(item.student)}
                                    alt={getStudentName(item.student)}
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const fallback = e.currentTarget.nextElementSibling;
                                      if (fallback) fallback.style.display = "grid";
                                    }}
                                  />
                                  <span className="ad-avatar-fallback" style={{ display: "none" }}>
                                    {getStudentName(item.student).charAt(0).toUpperCase()}
                                  </span>
                                </>
                              ) : (
                                <span className="ad-avatar-fallback">
                                  {getStudentName(item.student).charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <strong>{getStudentName(item.student)}</strong>
                            </div>
                          </div>
                        </td>
                        <td>{getRegisterNumber(item.student)}</td>
                        <td>
                          <span className={`ad-department ${item.dep}`}>
                            {item.dep === "cs" ? "CS" : "AIDS"}
                          </span>
                        </td>
                        <td>
                          <strong>{item.workingDays}</strong>
                        </td>
                        <td>
                          <span className="present-number">
                            <Check size={14} strokeWidth={2.5} />
                            {item.presentDays}
                          </span>
                        </td>
                        <td>
                          <span className="absent-number">
                            <X size={14} strokeWidth={2.5} />
                            {item.absentDays}
                          </span>
                        </td>
                        <td>
                          <span className="late-number">
                            <Clock size={14} strokeWidth={2.5} />
                            {item.lateDays}
                          </span>
                        </td>
                        <td>
                          <div className="percentage-top">
                            <strong className={cls}>
                              {percentage.toFixed(1)}%
                            </strong>
                          </div>
                          <div className="percentage-bar">
                            <div
                              className={`percentage-fill ${cls}`}
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* =======================================================
            VIEW 3: REAL ATTENDANCE (AUTHENTIC 3D FLIPPING BOOK WITHOUT SIGNATURES)
            ======================================================= */
        <section className="real-book-viewport">
          <div className="real-book-stage">
            {/* Hardbound Binder Cover */}
            <div className="real-book-cover">
              {/* Spine Stitch & Rivet Effect */}
              <div className="book-spine-binding">
                <span className="spine-ring"></span>
                <span className="spine-ring"></span>
                <span className="spine-ring"></span>
                <span className="spine-ring"></span>
                <span className="spine-ring"></span>
              </div>

              {/* BOOK TOOLBAR & TURNING CONTROLS */}
              <div className="book-top-controls">
                <div className="book-heading-tag">
                  <Bookmark size={15} />
                  <span>
                    OFFICIAL REGISTER ·{" "}
                    {new Date(`${registerMonth}-01`).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    }).toUpperCase()}
                  </span>
                </div>

                <div className="book-pagination-controls">
                  <button
                    type="button"
                    className="book-sound-toggle"
                    onClick={() => setSoundEnabled((prev) => !prev)}
                    title={soundEnabled ? "Mute paper sounds" : "Enable paper sounds"}
                  >
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>

                  <button
                    type="button"
                    className="book-page-btn"
                    onClick={() => handleTurnPage("prev")}
                    disabled={bookPage <= 1 || isFlipping}
                    title="Turn to previous folio"
                  >
                    <ChevronLeft size={16} />
                    <span>Prev Folio</span>
                  </button>

                  <span className="book-page-indicator">
                    Folio <strong>{bookPage}</strong> of <strong>{totalBookPages}</strong>
                  </span>

                  <button
                    type="button"
                    className="book-page-btn"
                    onClick={() => handleTurnPage("next")}
                    disabled={bookPage >= totalBookPages || isFlipping}
                    title="Turn to next folio"
                  >
                    <span>Next Folio</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* 3D BOOK LEAF CONTAINER */}
              <div className="book-paper-stack">
                <div className="underlying-page-edge edge-3"></div>
                <div className="underlying-page-edge edge-2"></div>
                <div className="underlying-page-edge edge-1"></div>

                {/* THE ACTIVE FLIPPABLE PAPER PAGE */}
                <div
                  className={`book-paper-page ${
                    isFlipping
                      ? flipDirection === "next"
                        ? "page-flip-forward"
                        : "page-flip-backward"
                      : ""
                  }`}
                >
                  <div className="paper-curl-overlay"></div>

                  {/* LEDGER PAGE HEADER */}
                  <div className="ledger-formal-header">
                    <div className="ledger-brand-line">
                      RAAK ARTS AND SCIENCE COLLEGE (AUTONOMOUS)
                    </div>
                    <h3 className="ledger-title-line">
                      {department === "aids"
                        ? "DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE"
                        : department === "cs"
                        ? "DEPARTMENT OF COMPUTER SCIENCE"
                        : "DEPARTMENT OF COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE"}
                    </h3>
                    <div className="ledger-sub-line">
                      <span>
                        YEAR:{" "}
                        <strong>
                          {department === "aids"
                            ? "I B.Sc. ARTIFICIAL INTELLIGENCE & DATA SCIENCE"
                            : department === "cs"
                            ? "I B.Sc. COMPUTER SCIENCE"
                            : "I B.Sc. COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE"}
                        </strong>
                      </span>
                      <span>
                        ACADEMIC YEAR: <strong>2026 - 2029</strong>
                      </span>
                      <span>
                        MONTH:{" "}
                        <strong>
                          {new Date(`${registerMonth}-01`).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          }).toUpperCase()}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* REAL REGISTER GRID */}
                  <div className="ledger-grid-scroll">
                    <table className="ledger-book-table">
                      <thead>
                        <tr className="ledger-th-top">
                          <th rowSpan={2} className="th-sl">#</th>
                          <th rowSpan={2} className="th-reg">REG NO</th>
                          <th rowSpan={2} className="th-name">STUDENT NAME</th>
                          <th rowSpan={2} className="th-dept">DEPT</th>
                          <th colSpan={monthCalendarDays.length} className="th-dates-title">
                            DAYS OF THE MONTH
                          </th>
                          <th colSpan={4} className="th-stats-title">TOTALS</th>
                        </tr>
                        <tr className="ledger-th-days">
                          {monthCalendarDays.map((cal) => (
                            <th
                              key={cal.dayNumber}
                              className={`th-day-cell ${cal.isSunday ? "sunday-col" : ""}`}
                            >
                              <span className="day-num">{cal.dayNumber}</span>
                              <span className="day-wk">{cal.dayName}</span>
                            </th>
                          ))}
                          <th className="th-tot">WD</th>
                          <th className="th-tot">P</th>
                          <th className="th-tot">A</th>
                          <th className="th-tot">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentBookPageStudents.map((item, idx) => {
                          const slNo = (bookPage - 1) * STUDENTS_PER_PAGE + idx + 1;
                          const percentage = item.percentage;
                          const isShort = percentage < 75;
                          const isWarning = percentage >= 75 && percentage < 85;

                          return (
                            <tr key={item.student.id} className="ledger-student-row">
                              <td className="td-sl">{slNo}</td>
                              <td className="td-reg">{getRegisterNumber(item.student)}</td>
                              <td className="td-name">
                                {getStudentName(item.student).toUpperCase()}
                              </td>
                              <td className="td-dept">
                                <span className={`ledger-dept-pill ${item.dep}`}>
                                  {item.dep === "cs" ? "CS" : "AIDS"}
                                </span>
                              </td>

                              {item.dayMarks.map((mark, dIdx) => (
                                <td
                                  key={dIdx}
                                  className={`td-mark-cell mark-${mark.type}`}
                                >
                                  {mark.char}
                                </td>
                              ))}

                              <td className="td-num-stat">{item.workingDays}</td>
                              <td className="td-num-stat text-p">{item.presentDays}</td>
                              <td className="td-num-stat text-a">{item.absentDays}</td>
                              <td
                                className={`td-num-stat td-pct ${
                                  isShort
                                    ? "pct-short"
                                    : isWarning
                                    ? "pct-warn"
                                    : "pct-good"
                                }`}
                              >
                                {percentage.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures removed from Real Attendance view */}
                  <div className="ledger-folio-footer">
                    <span>
                      Page {bookPage} · Cumulative Record Sheet
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AttendanceDashboard;