import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db } from "../firebase";

import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertTriangle,
  User,
  BookOpen,
  ShieldCheck,
  LogOut,
  KeyRound,
  ChevronDown,
  X,
  LockKeyhole,
  Eye,
  EyeOff,
  ListFilter,
  RotateCcw,
  Home,
  FileSpreadsheet,
  Share2,
  CheckSquare,
  Square,
  Calendar,
  Layers,
  Menu,
  Sparkles,
} from "lucide-react";

import "./StudentDashboard.css";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
  NOT_JOINED: "nj",
};

const REQUIRED_ATTENDANCE = 75;

const STATUS_FILTERS = [
  { key: "all", label: "All days" },
  { key: "present", label: "Present" },
  { key: "absent", label: "Absent" },
  { key: "late", label: "Late" },
];

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

// Local date format YYYY-MM-DD avoiding UTC date shifts
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return formatLocalDate(value.toDate());
  if (value instanceof Date) return formatLocalDate(value);
  return "";
};

const getStudentName = (student) =>
  student?.fullName || student?.name || student?.studentName || "Student";

const getStudentEmail = (student) =>
  String(student?.email || student?.studentEmail || student?.studentEmailId || "")
    .trim()
    .toLowerCase();

const getStudentUid = (student) =>
  String(student?.uid || student?.userId || student?.authUid || "").trim();

const getRegisterNumber = (student) =>
  student?.registerNumber ||
  student?.regNo ||
  student?.registerNo ||
  student?.rollNo ||
  student?.register_number ||
  "-";

const getDepartment = (student) => {
  const value = String(student?.department || student?.course || student?.dept || "")
    .trim()
    .toLowerCase();

  if (value === "cs" || value.includes("computer science") || value.includes("computer")) {
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

const getDepartmentName = (student) => {
  const department = typeof student === "string" ? student : getDepartment(student);
  if (department === "cs") return "Computer Science";
  if (department === "aids") return "AI & Data Science";
  return student?.department || student?.course || student?.dept || "-";
};

const getJoiningDate = (student) =>
  getDateString(
    student?.joiningDate || student?.joinDate || student?.dateOfJoining || student?.doj
  );

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatShortDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const getDayName = (dateString) => {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
  });
};

const getTodayString = () => formatLocalDate(new Date());

const getMonthKey = (dateString) => (dateString ? dateString.slice(0, 7) : "");

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return "";
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function StudentDashboard() {
  const auth = getAuth();
  const profileRef = useRef(null);

  /* NAVIGATION TAB STATE: 'home' | 'register' | 'incharge' */
  const [activeTab, setActiveTab] = useState("home");

  /* ANDROID / MOBILE HAMBURGER MENU DRAWER */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* DATA */
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [inchargeDocs, setInchargeDocs] = useState([]);

  /* AUTH */
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  /* PROFILE MENU */
  const [profileOpen, setProfileOpen] = useState(false);

  /* REGISTER FILTERS */
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  /* INCHARGE WORKSPACE STATES */
  const [inchargeDeptFilter, setInchargeDeptFilter] = useState("all");
  const [inchargeDate, setInchargeDate] = useState(getTodayString());
  const [selectedAbsentIds, setSelectedAbsentIds] = useState(new Set());
  const [inchargeAttendanceFilter, setInchargeAttendanceFilter] = useState("all");

  /* PASSWORD MODAL */
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

  /* =======================================================
     FIREBASE AUTH LISTENER
  ======================================================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [auth]);

  /* =======================================================
     LOAD STUDENTS + ATTENDANCE + INCHARGE ASSIGNMENTS
  ======================================================= */
  useEffect(() => {
    let studentsLoaded = false;
    let attendanceLoaded = false;

    const checkLoading = () => {
      if (studentsLoaded && attendanceLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        setStudents(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        studentsLoaded = true;
        checkLoading();
      },
      (error) => {
        console.error("Students collection error:", error);
        studentsLoaded = true;
        checkLoading();
      }
    );

    const unsubscribeAttendance = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        setAttendanceRecords(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        attendanceLoaded = true;
        checkLoading();
      },
      (error) => {
        console.error("Attendance collection error:", error);
        attendanceLoaded = true;
        checkLoading();
      }
    );

    const unsubscribeIncharge = onSnapshot(
      collection(db, "classIncharge"),
      (snapshot) => {
        setInchargeDocs(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Class incharge collection error:", error);
      }
    );

    return () => {
      unsubscribeStudents();
      unsubscribeAttendance();
      unsubscribeIncharge();
    };
  }, []);

  /* =======================================================
     FIND LOGGED-IN STUDENT
  ======================================================= */
  const student = useMemo(() => {
    if (!students.length) return null;

    const storedStudentId = localStorage.getItem("studentId");
    if (storedStudentId) {
      const found = students.find((item) => item.id === storedStudentId);
      if (found) return found;
    }

    const storedUid = localStorage.getItem("uid");
    if (storedUid) {
      const found = students.find(
        (item) => item.id === storedUid || getStudentUid(item) === storedUid
      );
      if (found) return found;
    }

    const storedEmail = localStorage.getItem("studentEmail");
    if (storedEmail) {
      const email = storedEmail.trim().toLowerCase();
      const found = students.find((item) => getStudentEmail(item) === email);
      if (found) return found;
    }

    if (firebaseUser?.uid) {
      const found = students.find(
        (item) => item.id === firebaseUser.uid || getStudentUid(item) === firebaseUser.uid
      );
      if (found) return found;
    }

    if (firebaseUser?.email) {
      const authEmail = firebaseUser.email.trim().toLowerCase();
      const found = students.find((item) => getStudentEmail(item) === authEmail);
      if (found) return found;
    }

    return null;
  }, [students, firebaseUser]);

  useEffect(() => {
    if (!student) return;
    localStorage.setItem("studentId", student.id);
    const email = getStudentEmail(student);
    if (email) localStorage.setItem("studentEmail", email);
    const uid = getStudentUid(student);
    if (uid) localStorage.setItem("uid", uid);
  }, [student]);

  /* =======================================================
     VERIFY IF LOGGED-IN STUDENT IS CLASS INCHARGE
  ======================================================= */
  const inchargeRecord = useMemo(() => {
    if (!student || !inchargeDocs.length) return null;

    const sId = String(student.id || "").trim();
    const sEmail = getStudentEmail(student);

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

  /* =======================================================
     INCHARGE DESK: EXCLUDE HYBRID STUDENTS & ACCURATELY MAP ATTENDANCE
  ======================================================= */
  const inchargeDailyAttendanceMap = useMemo(() => {
    if (!isClassIncharge) return {};

    // 1. Match records by field `d` or docId prefix `${inchargeDate}_`
    const dayRecords = attendanceRecords.filter((rec) => {
      const recordDate = getDateString(rec.d);
      if (recordDate === inchargeDate) return true;
      if (rec.id && rec.id.startsWith(inchargeDate)) return true;
      return false;
    });

    // 2. Merge attendance maps across all department records for this date
    const map = {};
    dayRecords.forEach((rec) => {
      if (rec.s && typeof rec.s === "object") {
        Object.entries(rec.s).forEach(([sId, status]) => {
          map[sId] = status; // 'p', 'a', 'l', 'nj'
        });
      }
    });

    return map;
  }, [attendanceRecords, inchargeDate, isClassIncharge]);

  const { inchargeList, inchargeDeptCounts } = useMemo(() => {
    if (!isClassIncharge) {
      return {
        inchargeList: [],
        inchargeDeptCounts: { total: 0, cs: 0, aids: 0, present: 0, absent: 0, late: 0 },
      };
    }

    // Exclude students marked hybrid / home
    const regularStudentsOnly = students.filter(
      (st) => st.studyMode !== "hybrid" && st.isHybrid !== true
    );

    let csCount = 0;
    let aidsCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const mapped = regularStudentsOnly.map((st) => {
      const dept = getDepartment(st);
      if (dept === "cs") csCount++;
      if (dept === "aids") aidsCount++;

      // Check status across student id, student doc id, and registration number
      const raw =
        inchargeDailyAttendanceMap[st.id] ||
        (st.studentId && inchargeDailyAttendanceMap[st.studentId]) ||
        (st.regNo && inchargeDailyAttendanceMap[st.regNo]);

      let status = "unmarked";
      if (raw === STATUS.PRESENT) {
        status = "present";
        presentCount++;
      } else if (raw === STATUS.ABSENT) {
        status = "absent";
        absentCount++;
      } else if (raw === STATUS.LATE) {
        status = "late";
        lateCount++;
      } else if (raw === STATUS.NOT_JOINED) {
        status = "not-joined";
      }

      return { ...st, deptKey: dept, currentStatus: status };
    });

    const filtered = mapped.filter((st) => {
      const matchesDept =
        inchargeDeptFilter === "all" || st.deptKey === inchargeDeptFilter;
      const matchesStatus =
        inchargeAttendanceFilter === "all" ||
        st.currentStatus === inchargeAttendanceFilter;
      return matchesDept && matchesStatus;
    });

    return {
      inchargeList: filtered,
      inchargeDeptCounts: {
        total: regularStudentsOnly.length,
        cs: csCount,
        aids: aidsCount,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
      },
    };
  }, [
    students,
    inchargeDailyAttendanceMap,
    inchargeDeptFilter,
    inchargeAttendanceFilter,
    isClassIncharge,
  ]);

  const toggleStudentSelection = (studentId) => {
    setSelectedAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const selectAllAbsent = () => {
    const ids = inchargeList
      .filter((s) => s.currentStatus === "absent")
      .map((s) => s.id);
    setSelectedAbsentIds(new Set(ids));
  };

  const handleShareToWhatsApp = () => {
    const selectedList = students.filter((s) => selectedAbsentIds.has(s.id));
    if (selectedList.length === 0) {
      alert("Please tap student photos to select who cut class / were absent after the break!");
      return;
    }

    const formattedDate = formatDate(inchargeDate);

    let msg = `🚨 *POST-BREAK CUT-CLASS / ABSENT REPORT* 🚨\n`;
    msg += `📅 *Date:* ${formattedDate}\n`;
    msg += `👥 *Total Reported:* ${selectedList.length}\n`;
    msg += `------------------------------------\n\n`;

    selectedList.forEach((s, i) => {
      const name = getStudentName(s);
      const reg = getRegisterNumber(s) !== "-" ? ` (${getRegisterNumber(s)})` : "";
      const dept = getDepartmentName(s) !== "-" ? ` [${getDepartmentName(s)}]` : "";
      msg += `${i + 1}. *${name}*${reg}${dept}\n`;
      if (s.studentMobile || s.mobile) {
        msg += `   📞 Mob: ${s.studentMobile || s.mobile}\n`;
      }
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  /* Close profile dropdown on outside click */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* =======================================================
     ATTENDANCE CALCULATIONS (PERSONAL RECORD)
  ======================================================= */
  const attendanceRecordsFromJoining = useMemo(() => {
    if (!student) return [];

    const department = getDepartment(student);
    const joiningDate = getJoiningDate(student);
    const today = getTodayString();

    return attendanceRecords
      .filter((record) => {
        const date = getDateString(record.d);
        if (!date) return false;
        if (joiningDate && date < joiningDate) return false;
        if (date > today) return false;
        if (department && record.dep !== department) return false;
        if (new Date(`${date}T00:00:00`).getDay() === 0) return false;
        const type = String(record.t || "").toLowerCase();
        if (type !== "c" && type !== "class") return false;
        if (!record.s || !record.s[student.id]) return false;
        return true;
      })
      .sort((a, b) => getDateString(a.d).localeCompare(getDateString(b.d)));
  }, [attendanceRecords, student]);

  const attendanceData = useMemo(() => {
    let workingDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    const history = [];

    attendanceRecordsFromJoining.forEach((record) => {
      const date = getDateString(record.d);
      const status = record.s?.[student?.id];
      workingDays++;

      if (status === STATUS.ABSENT) {
        absentDays++;
        history.push({ date, status: "absent" });
      } else if (status === STATUS.LATE) {
        lateDays++;
        presentDays++;
        history.push({ date, status: "late" });
      } else {
        presentDays++;
        history.push({ date, status: "present" });
      }
    });

    const percentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

    return {
      workingDays,
      presentDays,
      absentDays,
      lateDays,
      percentage,
      history,
    };
  }, [attendanceRecordsFromJoining, student]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    attendanceData.history.forEach((item) => {
      const key = getMonthKey(item.date);
      if (key) months.add(key);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [attendanceData.history]);

  useEffect(() => {
    if (filterMonth !== "all" && !availableMonths.includes(filterMonth)) {
      setFilterMonth("all");
    }
  }, [availableMonths, filterMonth]);

  const filteredHistory = useMemo(() => {
    return attendanceData.history.filter((item) => {
      if (filterMonth !== "all" && getMonthKey(item.date) !== filterMonth) {
        return false;
      }
      if (filterStatus !== "all" && item.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [attendanceData.history, filterMonth, filterStatus]);

  const monthScopedHistory = useMemo(() => {
    if (filterMonth === "all") return attendanceData.history;
    return attendanceData.history.filter((item) => getMonthKey(item.date) === filterMonth);
  }, [attendanceData.history, filterMonth]);

  const registerSummary = useMemo(() => {
    const workingDays = monthScopedHistory.length;
    const absentDays = monthScopedHistory.filter((item) => item.status === "absent").length;
    const lateDays = monthScopedHistory.filter((item) => item.status === "late").length;
    const presentDays = workingDays - absentDays;
    const percentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
    return { workingDays, presentDays, absentDays, lateDays, percentage };
  }, [monthScopedHistory]);

  const statusCounts = useMemo(() => ({
    all: monthScopedHistory.length,
    present: monthScopedHistory.filter((item) => item.status === "present").length,
    absent: monthScopedHistory.filter((item) => item.status === "absent").length,
    late: monthScopedHistory.filter((item) => item.status === "late").length,
  }), [monthScopedHistory]);

  const filtersActive = filterMonth !== "all" || filterStatus !== "all";
  const clearFilters = () => {
    setFilterMonth("all");
    setFilterStatus("all");
  };

  const leaveData = useMemo(() => {
    const { workingDays, presentDays, absentDays } = attendanceData;
    if (workingDays === 0) {
      return {
        taken: 0,
        remaining: 0,
        message: "No attendance has been recorded after your joining date.",
      };
    }

    let remaining = 0;
    while (presentDays / (workingDays + remaining + 1) >= REQUIRED_ATTENDANCE / 100) {
      remaining++;
    }

    let message;
    if (attendanceData.percentage < REQUIRED_ATTENDANCE) {
      message = "Your attendance is below the required 75%. Attend upcoming classes regularly.";
    } else if (remaining === 0) {
      message = "Another full-day absence would take your attendance below 75%.";
    } else {
      message = `Based on your current overall attendance, you can take ${remaining} more working-day ${
        remaining === 1 ? "leave" : "leaves"
      } while maintaining 75%.`;
    }

    return { taken: absentDays, remaining, message };
  }, [attendanceData]);

  const attendanceStatus = useMemo(() => {
    const percentage = attendanceData.percentage;
    if (percentage < REQUIRED_ATTENDANCE) {
      return { label: "Attendance Shortage", className: "danger", icon: <AlertTriangle size={17} /> };
    }
    if (percentage < 85) {
      return { label: "Attendance is Safe", className: "warning", icon: <AlertTriangle size={17} /> };
    }
    return { label: "Excellent Attendance", className: "success", icon: <CheckCircle2 size={17} /> };
  }, [attendanceData.percentage]);

  /* LOGOUT */
  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      try {
        await signOut(auth);
      } catch (error) {
        console.log("No Firebase Auth session:", error);
      }
    } finally {
      localStorage.removeItem("userRole");
      localStorage.removeItem("studentId");
      localStorage.removeItem("studentEmail");
      localStorage.removeItem("studentMobile");
      localStorage.removeItem("studentUser");
      localStorage.removeItem("uid");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("staffId");
      localStorage.removeItem("staffEmail");

      window.location.replace("/login");
    }
  };

  /* PASSWORD MODAL */
  const openPasswordModal = () => {
    setProfileOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setPasswordSuccess(false);
    setPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (passwordLoading) return;
    setPasswordModal(false);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordSuccess(false);

    if (!firebaseUser) {
      setPasswordMessage("Your Firebase login session could not be found.");
      return;
    }
    if (!firebaseUser.email) {
      setPasswordMessage("This account does not have an email/password login.");
      return;
    }
    if (!currentPassword) {
      setPasswordMessage("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("New password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMessage("New password must be different from your current password.");
      return;
    }

    try {
      setPasswordLoading(true);
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

      setPasswordSuccess(true);
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setPasswordModal(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        setPasswordMessage("Current password is incorrect.");
      } else if (error.code === "auth/requires-recent-login") {
        setPasswordMessage("Please log in again before changing your password.");
      } else {
        setPasswordMessage(error.message || "Unable to change password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  if (loading || !authChecked) {
    return (
      <div className="sdb-page sdb-loading-page">
        <div className="student-loader" />
        <p>Loading your student dashboard...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="sdb-page sdb-empty-page">
        <div className="student-empty-icon">
          <User size={42} />
        </div>
        <h2>Student Profile Not Found</h2>
        <p>We couldn't match your login with a student profile.</p>
        <div className="student-debug-box">
          <strong>Login information detected</strong>
          <div>Student ID: <span>{localStorage.getItem("studentId") || "Not available"}</span></div>
          <div>Student Email: <span>{localStorage.getItem("studentEmail") || "Not available"}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="sdb-page">
      {/* TOP NAVIGATION BAR */}
      <header className="sdb-topbar">
        <div className="sdb-brand">
          <button
            type="button"
            className="sdb-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="sdb-brand-icon">
            <BookOpen size={20} />
          </div>
          <div className="sdb-brand-text">
            <strong>Faculty Portal</strong>
            <span>Student & Incharge Hub</span>
          </div>
        </div>

        {/* DESKTOP PILL NAVIGATION TABS */}
        <nav className="sdb-nav-tabs">
          <button
            type="button"
            className={`sdb-tab-btn ${activeTab === "home" ? "active" : ""}`}
            onClick={() => handleTabSwitch("home")}
          >
            <Home size={15} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`sdb-tab-btn ${activeTab === "register" ? "active" : ""}`}
            onClick={() => handleTabSwitch("register")}
          >
            <FileSpreadsheet size={15} />
            <span>Attendance Register</span>
          </button>

          {isClassIncharge && (
            <button
              type="button"
              className={`sdb-tab-btn incharge-badge-btn ${activeTab === "incharge" ? "active" : ""}`}
              onClick={() => handleTabSwitch("incharge")}
            >
              <ShieldCheck size={15} />
              <span>Incharge Desk</span>
            </button>
          )}
        </nav>

        {/* PROFILE CARD */}
        <div className="sdb-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className={`sdb-profile-chip ${profileOpen ? "is-open" : ""}`}
            onClick={() => setProfileOpen((val) => !val)}
            aria-label="Open profile options"
          >
            <div className="sdb-chip-avatar">
              {student?.imageUrl ? (
                <img src={student.imageUrl} alt={getStudentName(student)} />
              ) : (
                getStudentName(student).charAt(0).toUpperCase()
              )}
              <span className="sdb-chip-status-dot" />
            </div>
            <div className="sdb-chip-info">
              <span className="sdb-chip-name">{getStudentName(student)}</span>
              <span className="sdb-chip-dept">{getDepartmentName(student)}</span>
            </div>
            <ChevronDown size={14} className="sdb-chip-chevron" />
          </button>

          {profileOpen && (
            <div className="sdb-profile-menu">
              <div className="sdb-menu-user-card">
                <div className="sdb-menu-user-avatar">
                  {student?.imageUrl ? (
                    <img src={student.imageUrl} alt={getStudentName(student)} />
                  ) : (
                    getStudentName(student).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="sdb-menu-user-details">
                  <h4>{getStudentName(student)}</h4>
                  <p>{getStudentEmail(student) || "Registered Student"}</p>
                  <span className="sdb-menu-badge">{getRegisterNumber(student)}</span>
                </div>
              </div>

              <div className="sdb-menu-divider" />

              <button
                type="button"
                className="sdb-menu-item"
                onClick={openPasswordModal}
              >
                <KeyRound size={16} />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                className="sdb-menu-item logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout Session</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="sdb-mobile-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <aside className="sdb-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sdb-drawer-header">
              <div className="sdb-drawer-user">
                <div className="sdb-drawer-avatar">
                  {student?.imageUrl ? (
                    <img src={student.imageUrl} alt={getStudentName(student)} />
                  ) : (
                    getStudentName(student).charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{getStudentName(student)}</strong>
                  <span>{getRegisterNumber(student)}</span>
                </div>
              </div>
              <button
                type="button"
                className="sdb-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <nav className="sdb-drawer-nav">
              <button
                type="button"
                className={`sdb-drawer-item ${activeTab === "home" ? "active" : ""}`}
                onClick={() => handleTabSwitch("home")}
              >
                <Home size={18} />
                <span>Dashboard Home</span>
              </button>

              <button
                type="button"
                className={`sdb-drawer-item ${activeTab === "register" ? "active" : ""}`}
                onClick={() => handleTabSwitch("register")}
              >
                <FileSpreadsheet size={18} />
                <span>Attendance Register</span>
              </button>

              {isClassIncharge && (
                <button
                  type="button"
                  className={`sdb-drawer-item incharge ${activeTab === "incharge" ? "active" : ""}`}
                  onClick={() => handleTabSwitch("incharge")}
                >
                  <ShieldCheck size={18} />
                  <span>Incharge Special Desk</span>
                </button>
              )}

              <div className="sdb-menu-divider" style={{ margin: "14px 0" }} />

              <button
                type="button"
                className="sdb-drawer-item"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openPasswordModal();
                }}
              >
                <KeyRound size={18} />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                className="sdb-drawer-item logout"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* STUDENT IDENTITY BANNER */}
      <section className="student-welcome">
        <div className="welcome-left">
          <div className="student-avatar-halo">
            {student?.imageUrl ? (
              <img src={student.imageUrl} alt={getStudentName(student)} />
            ) : (
              getStudentName(student).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="welcome-tag">
              <Sparkles size={13} />
              <span>OFFICIAL STUDENT PORTAL</span>
            </div>
            <h1>{getStudentName(student)}</h1>
            <div className="student-meta">
              <span>{getRegisterNumber(student)}</span>
              <span>•</span>
              <span>{getDepartmentName(student)}</span>
              {getJoiningDate(student) && (
                <>
                  <span>•</span>
                  <span>Joined {formatDate(getJoiningDate(student))}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {isClassIncharge && (
            <div className="incharge-privilege-chip">
              <ShieldCheck size={16} />
              <span>{inchargeRecord?.role || "Class Incharge"}</span>
            </div>
          )}
          <div className="academic-badge">
            <BookOpen size={15} />
            <span>Academic Year 2026–2029</span>
          </div>
        </div>
      </section>

      {/* TAB 1: HOME */}
      {activeTab === "home" && (
        <div className="tab-fade-in">
          <section className="attendance-main-card">
            <div className="attendance-heading">
              <div>
                <span className="eyebrow">ATTENDANCE FROM DATE OF JOINING</span>
                <h2>Overall Attendance</h2>
              </div>

              <div className={`attendance-status ${attendanceStatus.className}`}>
                {attendanceStatus.icon}
                <span>{attendanceStatus.label}</span>
              </div>
            </div>

            <div className="attendance-progress-section">
              <div
                className="percentage-circle"
                style={{
                  "--attendance": `${Math.min(attendanceData.percentage, 100) * 3.6}deg`,
                }}
              >
                <div className="circle-inner">
                  <strong>{attendanceData.percentage.toFixed(1)}%</strong>
                  <span>Overall</span>
                </div>
              </div>

              <div className="attendance-progress-content">
                <div className="progress-label-row">
                  <span>Overall Attendance</span>
                  <strong>{attendanceData.percentage.toFixed(1)}%</strong>
                </div>

                <div className="progress-track">
                  <div
                    className={`progress-fill ${attendanceStatus.className}`}
                    style={{ width: `${Math.min(attendanceData.percentage, 100)}%` }}
                  />
                </div>

                <div className="minimum-label">
                  <span>Minimum Required</span>
                  <strong>{REQUIRED_ATTENDANCE}%</strong>
                </div>

                <div className="attendance-period">
                  <span>Attendance Period</span>
                  <strong>
                    {getJoiningDate(student)
                      ? formatDate(getJoiningDate(student))
                      : "Joining Date"}{" "}
                    — Today
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="student-kpi-grid">
            <div className="student-kpi blue">
              <div className="kpi-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <span>Working Days</span>
                <strong>{attendanceData.workingDays}</strong>
              </div>
            </div>

            <div className="student-kpi green">
              <div className="kpi-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span>Present</span>
                <strong>{attendanceData.presentDays}</strong>
              </div>
            </div>

            <div className="student-kpi red">
              <div className="kpi-icon">
                <XCircle size={22} />
              </div>
              <div>
                <span>Absent</span>
                <strong>{attendanceData.absentDays}</strong>
              </div>
            </div>

            <div className="student-kpi orange">
              <div className="kpi-icon">
                <Clock3 size={22} />
              </div>
              <div>
                <span>Late</span>
                <strong>{attendanceData.lateDays}</strong>
              </div>
            </div>
          </section>

          <section
            className={`student-leave-card ${
              leaveData.remaining > 0 ? "leave-safe" : "leave-warning"
            }`}
          >
            <div className="leave-header">
              <div className="leave-title">
                <div className="leave-icon">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <span>LEAVE STATUS</span>
                  <h2>Leave Calculation</h2>
                </div>
              </div>

              <div className="leave-remaining">
                <strong>{leaveData.remaining}</strong>
                <span>days available</span>
              </div>
            </div>

            <div className="leave-grid">
              <div className="leave-stat">
                <span>Leave Taken</span>
                <strong>{leaveData.taken}</strong>
                <small>Since joining</small>
              </div>

              <div className="leave-stat">
                <span>Minimum Attendance</span>
                <strong>{REQUIRED_ATTENDANCE}%</strong>
                <small>Required</small>
              </div>

              <div className="leave-stat highlight">
                <span>Can Take</span>
                <strong>{leaveData.remaining}</strong>
                <small>Working days</small>
              </div>
            </div>

            <div className="leave-message">
              {leaveData.remaining > 0 ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <span>{leaveData.message}</span>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REGISTER */}
      {activeTab === "register" && (
        <div className="tab-fade-in">
          <section className="student-history-card physical-register">
            <div className="register-heading">
              <div className="register-college-title">
                <span className="register-small-title">STUDENT ATTENDANCE RECORD</span>
                <h2>Attendance Register</h2>
                <p>Complete attendance record from date of joining</p>
              </div>

              <div className="register-stamp">
                <CheckCircle2 size={18} />
                <span>OFFICIAL RECORD</span>
              </div>
            </div>

            <div className="register-student-info">
              <div className="register-info-item">
                <span>Student Name</span>
                <strong>{getStudentName(student)}</strong>
              </div>

              <div className="register-info-item">
                <span>Register Number</span>
                <strong>{getRegisterNumber(student)}</strong>
              </div>

              <div className="register-info-item">
                <span>Department</span>
                <strong>{getDepartmentName(student)}</strong>
              </div>

              <div className="register-info-item">
                <span>Date of Joining</span>
                <strong>
                  {getJoiningDate(student) ? formatDate(getJoiningDate(student)) : "-"}
                </strong>
              </div>
            </div>

            {attendanceData.history.length > 0 && (
              <div className="register-filters">
                <div className="filter-lead">
                  <ListFilter size={17} />
                  <span>
                    {filterMonth === "all"
                      ? "Showing every recorded day"
                      : `Showing ${formatMonthLabel(filterMonth)}`}
                  </span>
                </div>

                <div className="filter-controls">
                  <div className="month-select-wrap">
                    <CalendarDays size={16} />
                    <select
                      className="month-select"
                      value={filterMonth}
                      onChange={(event) => setFilterMonth(event.target.value)}
                      aria-label="Filter register by month"
                    >
                      <option value="all">All months</option>
                      {availableMonths.map((month) => (
                        <option key={month} value={month}>
                          {formatMonthLabel(month)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="month-select-chevron" />
                  </div>

                  <div className="status-segment" role="group" aria-label="Filter by status">
                    {STATUS_FILTERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`segment-btn ${item.key} ${
                          filterStatus === item.key ? "active" : ""
                        }`}
                        onClick={() => setFilterStatus(item.key)}
                        aria-pressed={filterStatus === item.key}
                      >
                        <span>{item.label}</span>
                        <b>{statusCounts[item.key]}</b>
                      </button>
                    ))}
                  </div>

                  {filtersActive && (
                    <button
                      type="button"
                      className="filter-reset"
                      onClick={clearFilters}
                    >
                      <RotateCcw size={15} />
                      <span>Clear filters</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="register-summary">
              <div>
                <span>Working Days</span>
                <strong>{registerSummary.workingDays}</strong>
              </div>
              <div className="present-summary">
                <span>Present</span>
                <strong>{registerSummary.presentDays}</strong>
              </div>
              <div className="absent-summary">
                <span>Absent</span>
                <strong>{registerSummary.absentDays}</strong>
              </div>
              <div className="late-summary">
                <span>Late</span>
                <strong>{registerSummary.lateDays}</strong>
              </div>
              <div className="percentage-summary">
                <span>Attendance</span>
                <strong>{registerSummary.percentage.toFixed(1)}%</strong>
              </div>
            </div>

            {attendanceData.history.length === 0 ? (
              <div className="register-empty">
                <CalendarDays size={38} />
                <h3>No Attendance Records</h3>
                <p>Attendance has not been recorded after your joining date.</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="register-empty">
                <ListFilter size={38} />
                <h3>Nothing matches this filter</h3>
                <p>No recorded days match your selected month and status filter.</p>
                <button type="button" className="filter-reset inline" onClick={clearFilters}>
                  <RotateCcw size={15} />
                  <span>Clear filters</span>
                </button>
              </div>
            ) : (
              <div className="physical-register-wrapper">
                <table className="physical-register-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Attendance</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item, index) => (
                      <tr key={`${item.date}-${index}`}>
                        <td className="register-number">{String(index + 1).padStart(2, "0")}</td>
                        <td className="register-date">
                          <strong>{new Date(`${item.date}T00:00:00`).getDate()}</strong>
                          <span>{formatShortDate(item.date).split(" ").slice(1).join(" ")}</span>
                        </td>
                        <td className="register-day">{getDayName(item.date)}</td>
                        <td className="register-attendance-cell">
                          <span className={`attendance-letter ${item.status}`}>
                            {item.status === "present" && "P"}
                            {item.status === "absent" && "A"}
                            {item.status === "late" && "L"}
                          </span>
                        </td>
                        <td>
                          <span className={`register-status ${item.status}`}>
                            {item.status === "present" && "PRESENT"}
                            {item.status === "absent" && "ABSENT"}
                            {item.status === "late" && "LATE"}
                          </span>
                        </td>
                        <td className="register-remark">
                          {item.status === "present" && "Class Attended"}
                          {item.status === "absent" && "Leave / Absent"}
                          {item.status === "late" && "Late Arrival"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="register-footer">
              <div>
                <span>P = Present</span>
                <span>A = Absent</span>
                <span>L = Late</span>
              </div>
              <div>
                {filtersActive ? "Filtered Records:" : "Total Records:"}
                <strong>{filteredHistory.length}</strong>
                {filtersActive && <em> of {attendanceData.history.length}</em>}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: INCHARGE SPECIAL DESK */}
      {activeTab === "incharge" && isClassIncharge && (
        <div className="tab-fade-in">
          <section className="incharge-desk-panel">
            {/* Header */}
            <div className="incharge-panel-header">
              <div>
                <span className="incharge-eyebrow-badge">
                  <ShieldCheck size={14} /> CLASS INCHARGE POST-BREAK BROADCASTER
                </span>
                <h2 className="incharge-panel-title">
                  Absentee & Cut-Class Broadcaster
                </h2>
                <p className="incharge-panel-desc">
                  Review and mark regular on-campus students who cut class or were absent after the break. Filter by <strong>Computer Science</strong> or <strong>AI & DS</strong> and send the report directly to WhatsApp.
                </p>
              </div>

              {/* Date Selector */}
              <div className="incharge-date-box">
                <Calendar size={16} color="#64748b" />
                <input
                  type="date"
                  value={inchargeDate}
                  onChange={(e) => setInchargeDate(e.target.value)}
                />
              </div>
            </div>

            {/* Department Filter Toggle */}
            <div className="incharge-cohort-selector">
              <span className="incharge-cohort-lbl">
                <Layers size={14} /> Department:
              </span>
              <button
                type="button"
                className={`incharge-dept-btn ${inchargeDeptFilter === "all" ? "active" : ""}`}
                onClick={() => setInchargeDeptFilter("all")}
              >
                Both Depts ({inchargeDeptCounts.total})
              </button>
              <button
                type="button"
                className={`incharge-dept-btn cs ${inchargeDeptFilter === "cs" ? "active" : ""}`}
                onClick={() => setInchargeDeptFilter("cs")}
              >
                CS ({inchargeDeptCounts.cs})
              </button>
              <button
                type="button"
                className={`incharge-dept-btn aids ${inchargeDeptFilter === "aids" ? "active" : ""}`}
                onClick={() => setInchargeDeptFilter("aids")}
              >
                AI & DS ({inchargeDeptCounts.aids})
              </button>
            </div>

            {/* Metrics */}
            <div className="incharge-metric-grid">
              <div className="incharge-metric-tile">
                <span>Regular Students</span>
                <strong>{inchargeList.length}</strong>
              </div>
              <div className="incharge-metric-tile green">
                <span>Present Today</span>
                <strong>{inchargeDeptCounts.present}</strong>
              </div>
              <div className="incharge-metric-tile red">
                <span>Absent / Cut</span>
                <strong>{inchargeDeptCounts.absent}</strong>
              </div>
              <div className="incharge-metric-tile yellow">
                <span>Late</span>
                <strong>{inchargeDeptCounts.late}</strong>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="incharge-action-toolbar">
              <div className="incharge-status-filters">
                <button
                  type="button"
                  className={inchargeAttendanceFilter === "all" ? "active" : ""}
                  onClick={() => setInchargeAttendanceFilter("all")}
                >
                  All Cohort
                </button>
                <button
                  type="button"
                  className={inchargeAttendanceFilter === "absent" ? "active red" : ""}
                  onClick={() => setInchargeAttendanceFilter("absent")}
                >
                  Absentees Only ({inchargeDeptCounts.absent})
                </button>
                <button
                  type="button"
                  className={inchargeAttendanceFilter === "present" ? "active green" : ""}
                  onClick={() => setInchargeAttendanceFilter("present")}
                >
                  Present Only ({inchargeDeptCounts.present})
                </button>
              </div>

              {/* Multi-Select & WhatsApp Triggers */}
              <div className="incharge-broadcast-actions">
                <button
                  type="button"
                  className="btn-select-all"
                  onClick={selectAllAbsent}
                >
                  Select All Absentees
                </button>

                {selectedAbsentIds.size > 0 && (
                  <button
                    type="button"
                    className="btn-clear-selection"
                    onClick={() => setSelectedAbsentIds(new Set())}
                  >
                    Clear ({selectedAbsentIds.size})
                  </button>
                )}

                <button
                  type="button"
                  className="btn-whatsapp-broadcast"
                  onClick={handleShareToWhatsApp}
                >
                  <Share2 size={15} /> Send WhatsApp Report ({selectedAbsentIds.size})
                </button>
              </div>
            </div>

            {/* Student Photo Card Grid */}
            <div className="incharge-student-photo-grid">
              {inchargeList.map((st) => {
                const isSelected = selectedAbsentIds.has(st.id);
                const isAbsent = st.currentStatus === "absent";
                const isPresent = st.currentStatus === "present";

                return (
                  <div
                    key={st.id}
                    onClick={() => toggleStudentSelection(st.id)}
                    className={`incharge-student-card ${isSelected ? "is-selected" : ""}`}
                  >
                    <div className="incharge-card-photo-box">
                      {st.imageUrl ? (
                        <img
                          src={st.imageUrl}
                          alt={getStudentName(st)}
                          loading="lazy"
                        />
                      ) : (
                        <div className="incharge-photo-fallback">
                          No Photo
                        </div>
                      )}

                      <div className="incharge-checkbox-pill">
                        {isSelected ? <CheckSquare size={16} color="#25D366" /> : <Square size={16} color="#64748b" />}
                      </div>

                      <div className="incharge-status-badge-container">
                        {isPresent && <span className="badge-present">PRESENT</span>}
                        {isAbsent && <span className="badge-absent">ABSENT</span>}
                        {st.currentStatus === "late" && <span className="badge-late">LATE</span>}
                        {st.currentStatus === "not-joined" && <span className="badge-late">NOT JOINED</span>}
                      </div>
                    </div>

                    <div className="incharge-card-info">
                      <div className="incharge-student-name">
                        {getStudentName(st)}
                      </div>
                      <div className={`incharge-student-dept ${st.deptKey === "cs" ? "cs" : "aids"}`}>
                        {getDepartmentName(st)}
                      </div>
                      {getRegisterNumber(st) !== "-" && (
                        <div className="incharge-student-reg">
                          Reg: {getRegisterNumber(st)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* FOOTER */}
      <section className="attendance-info">
        <ShieldCheck size={18} />
        <p>
          Attendance is calculated from recorded class days starting from your date
          of joining. Sundays, future dates, and non-class attendance entries are
          excluded.
        </p>
      </section>

      {/* PASSWORD MODAL */}
      {passwordModal && (
        <div className="password-modal-overlay" onClick={closePasswordModal}>
          <div
            className="password-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="password-modal-header">
              <div className="password-title">
                <div className="password-icon">
                  <LockKeyhole size={21} />
                </div>
                <div>
                  <h2>Change Password</h2>
                  <p>Update your student account password</p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closePasswordModal}
              >
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
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                  >
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
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="password-field">
                <label>Confirm New Password</label>
                <div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div
                  className={`password-message ${
                    passwordSuccess ? "success" : "error"
                  }`}
                >
                  {passwordMessage}
                </div>
              )}

              <button
                type="submit"
                className="change-password-submit"
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}