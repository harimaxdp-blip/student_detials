import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import "./AttendanceDashboard.css";

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
} from "lucide-react";

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
};

// =========================================================
// DATE HELPER
// =========================================================

const getDateString = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value?.toDate) {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return "";
};

// =========================================================
// STUDENT NAME
// =========================================================

const getStudentName = (student) =>
  student.fullName ||
  student.name ||
  student.studentName ||
  "Unnamed Student";

// =========================================================
// REGISTER NUMBER
// =========================================================

const getRegisterNumber = (student) =>
  student.registerNumber ||
  student.regNo ||
  student.registerNo ||
  student.register_number ||
  "-";

// =========================================================
// DEPARTMENT
// =========================================================

const getDepartment = (student) => {
  const value = String(
    student.department ||
      student.course ||
      student.dept ||
      ""
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

// =========================================================
// JOINING DATE
// =========================================================

const getJoiningDate = (student) => {
  return getDateString(
    student.joiningDate ||
      student.joinDate ||
      student.dateOfJoining ||
      student.doj
  );
};

// =========================================================
// ALPHABETICAL SORT
// =========================================================

const sortStudentsAlphabetically = (items) => {
  return [...items].sort((a, b) =>
    getStudentName(
      a.student || a
    ).localeCompare(
      getStudentName(
        b.student || b
      ),
      undefined,
      {
        sensitivity: "base",
        numeric: true,
      }
    )
  );
};

// =========================================================
// COMPONENT
// =========================================================

function AttendanceDashboard() {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);

  // View switch
  const [viewMode, setViewMode] =
    useState("daybyday");

  // Summary months
  const [fromMonth, setFromMonth] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  const [toMonth, setToMonth] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  // Selected date
  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  // Filters
  const [department, setDepartment] =
    useState("all");

  const [summaryFilter, setSummaryFilter] =
    useState("all");

  const [dayStatusFilter, setDayStatusFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // =========================================================
  // FIRESTORE
  // =========================================================

  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        );

        setStudents(data);
      },
      (error) => {
        console.error(
          "Students error:",
          error
        );

        setLoading(false);
      }
    );

    const unsubRecords = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({
            id: d.id,
            ...d.data(),
          })
        );

        setRecords(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Attendance error:",
          error
        );

        setLoading(false);
      }
    );

    return () => {
      unsubStudents();
      unsubRecords();
    };
  }, []);

  // =========================================================
  // CHANGE DAY
  // =========================================================

  const shiftDay = (days) => {
    const current =
      new Date(selectedDate);

    current.setDate(
      current.getDate() + days
    );

    setSelectedDate(
      current
        .toISOString()
        .slice(0, 10)
    );
  };

  // =========================================================
  // MONTH RANGE
  // =========================================================

  const validFromMonth =
    fromMonth <= toMonth
      ? fromMonth
      : toMonth;

  const validToMonth =
    fromMonth <= toMonth
      ? toMonth
      : fromMonth;

  // =========================================================
  // CLASS RECORDS
  // =========================================================

  const classRecords = useMemo(() => {
    return records
      .filter((record) => {
        const date =
          getDateString(record.d);

        if (!date) {
          return false;
        }

        const recordMonth =
          date.slice(0, 7);

        if (
          recordMonth <
            validFromMonth ||
          recordMonth >
            validToMonth
        ) {
          return false;
        }

        const type = String(
          record.t || ""
        ).toLowerCase();

        return (
          type === "c" ||
          type === "class"
        );
      })
      .sort((a, b) =>
        getDateString(a.d).localeCompare(
          getDateString(b.d)
        )
      );
  }, [
    records,
    validFromMonth,
    validToMonth,
  ]);

  // =========================================================
  // MONTHLY SUMMARY
  // =========================================================

  const summaryAttendanceData =
    useMemo(() => {
      const result = {};

      students.forEach(
        (student) => {
          const dep =
            getDepartment(student);

          if (!dep) return;

          if (
            department !== "all" &&
            department !== dep
          ) {
            return;
          }

          const joiningDate =
            getJoiningDate(student);

          let workingDays = 0;
          let presentDays = 0;
          let absentDays = 0;
          let lateDays = 0;

          classRecords.forEach(
            (record) => {
              const date =
                getDateString(
                  record.d
                );

              // Do not count days before joining
              if (
                joiningDate &&
                date < joiningDate
              ) {
                return;
              }

              if (
                record.dep !== dep
              ) {
                return;
              }

              workingDays++;

              const status =
                record.s?.[
                  student.id
                ];

              if (
                status ===
                STATUS.ABSENT
              ) {
                absentDays++;
              } else if (
                status ===
                STATUS.LATE
              ) {
                lateDays++;
                presentDays++;
              } else {
                presentDays++;
              }
            }
          );

          const percentage =
            workingDays > 0
              ? (presentDays /
                  workingDays) *
                100
              : 0;

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
        }
      );

      return result;
    }, [
      students,
      classRecords,
      department,
    ]);

  // =========================================================
  // SELECTED DATE RECORDS
  // =========================================================

  const dayRecordsForSelectedDate =
    useMemo(() => {
      return records.filter(
        (record) =>
          getDateString(
            record.d
          ) === selectedDate
      );
    }, [
      records,
      selectedDate,
    ]);

  // =========================================================
  // DAY BY DAY DATA
  // =========================================================

  const singleDayData = useMemo(() => {
    const data = students
      .filter((student) => {
        const dep =
          getDepartment(student);

        if (!dep) {
          return false;
        }

        if (
          department !== "all" &&
          department !== dep
        ) {
          return false;
        }

        return true;
      })
      .map((student) => {
        const dep =
          getDepartment(student);

        const joiningDate =
          getJoiningDate(student);

        // Student had not joined yet
        if (
          joiningDate &&
          selectedDate < joiningDate
        ) {
          return {
            student,
            dep,
            status: "not-joined",
          };
        }

        const depRecord =
          dayRecordsForSelectedDate.find(
            (record) =>
              record.dep === dep
          );

        // No attendance record
        if (!depRecord) {
          return {
            student,
            dep,
            status: "no-class",
          };
        }

        const status =
          depRecord.s?.[
            student.id
          ];

        if (
          status ===
          STATUS.ABSENT
        ) {
          return {
            student,
            dep,
            status: "absent",
          };
        }

        if (
          status ===
          STATUS.LATE
        ) {
          return {
            student,
            dep,
            status: "late",
          };
        }

        return {
          student,
          dep,
          status: "present",
        };
      });

    // =====================================================
    // ALWAYS SORT A-Z
    // =====================================================

    return sortStudentsAlphabetically(
      data
    );
  }, [
    students,
    dayRecordsForSelectedDate,
    selectedDate,
    department,
  ]);

  // =========================================================
  // DAILY KPI
  // =========================================================

  const dailyKPI = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let activeTotal = 0;

    singleDayData.forEach(
      (item) => {
        if (
          item.status ===
          "present"
        ) {
          present++;
          activeTotal++;
        } else if (
          item.status ===
          "absent"
        ) {
          absent++;
          activeTotal++;
        } else if (
          item.status ===
          "late"
        ) {
          late++;
          present++;
          activeTotal++;
        }
      }
    );

    const percent =
      activeTotal > 0
        ? (
            (present /
              activeTotal) *
            100
          ).toFixed(1)
        : "0.0";

    return {
      present,
      absent,
      late,
      total:
        singleDayData.length,
      percent,
    };
  }, [singleDayData]);

  // =========================================================
  // DAILY DISPLAY + SEARCH
  // =========================================================

  const displayedDailyStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return singleDayData.filter(
        (item) => {
          const name =
            getStudentName(
              item.student
            ).toLowerCase();

          const reg =
            getRegisterNumber(
              item.student
            ).toLowerCase();

          if (
            query &&
            !name.includes(
              query
            ) &&
            !reg.includes(
              query
            )
          ) {
            return false;
          }

          if (
            dayStatusFilter !==
              "all" &&
            item.status !==
              dayStatusFilter
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      singleDayData,
      search,
      dayStatusFilter,
    ]);

  // =========================================================
  // MONTHLY SUMMARY DISPLAY
  // =========================================================

  const displayedSummaryStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return Object.values(
        summaryAttendanceData
      )
        .filter((item) => {
          const name =
            getStudentName(
              item.student
            ).toLowerCase();

          const reg =
            getRegisterNumber(
              item.student
            ).toLowerCase();

          if (
            query &&
            !name.includes(
              query
            ) &&
            !reg.includes(
              query
            )
          ) {
            return false;
          }

          if (
            summaryFilter ===
              "low" &&
            item.percentage >= 75
          ) {
            return false;
          }

          if (
            summaryFilter ===
              "good" &&
            item.percentage < 75
          ) {
            return false;
          }

          return true;
        })

        // =================================================
        // A → Z
        // =================================================

        .sort((a, b) =>
          getStudentName(
            a.student
          ).localeCompare(
            getStudentName(
              b.student
            ),
            undefined,
            {
              sensitivity: "base",
              numeric: true,
            }
          )
        );
    }, [
      summaryAttendanceData,
      search,
      summaryFilter,
    ]);

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatSelectedDate = (
    dateStr
  ) => {
    if (!dateStr) {
      return "";
    }

    return new Date(
      `${dateStr}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // PERCENTAGE CLASS
  // =========================================================

  const getPercentageClass = (
    percentage
  ) => {
    if (percentage < 75) {
      return "danger";
    }

    if (percentage < 85) {
      return "warning";
    }

    return "success";
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="attendance-dashboard">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="ad-header">

        <div className="ad-header-main">

          <Link
            to="/a"
            className="ad-back"
          >
            <ArrowLeft size={15} />
            <span>
              Attendance Entry
            </span>
          </Link>

          <h1>
            Attendance Dashboard
          </h1>

          <p>
            Monitor daily presence and
            overall student attendance.
          </p>

        </div>

      </header>

      {/* =====================================================
          FILTER CARD
          ===================================================== */}

      <section className="ad-filter-card">

        {/* VIEW TOGGLE */}

        <div className="ad-toggle-container">

          <div className="ad-view-toggle">

            <button
              type="button"
              className={
                viewMode ===
                "daybyday"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode(
                  "daybyday"
                )
              }
            >
              <CalendarCheck
                size={16}
              />

              <span>
                Day-by-Day
              </span>
            </button>

            <button
              type="button"
              className={
                viewMode ===
                "summary"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setViewMode(
                  "summary"
                )
              }
            >
              <TableProperties
                size={16}
              />

              <span>
                Monthly Summary
              </span>
            </button>

          </div>

        </div>

        {/* INPUT FILTERS */}

        <div className="ad-filter">

          {viewMode ===
          "daybyday" ? (

            <div className="ad-field">

              <label>
                Select Date
              </label>

              <div className="day-stepper">

                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    shiftDay(-1)
                  }
                  title="Previous Day"
                  aria-label="Previous Day"
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <input
                  type="date"
                  value={
                    selectedDate
                  }
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                />

                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    shiftDay(1)
                  }
                  title="Next Day"
                  aria-label="Next Day"
                >
                  <ChevronRight
                    size={18}
                  />
                </button>

              </div>

            </div>

          ) : (

            <>

              <div className="ad-field">

                <label>
                  From Month
                </label>

                <input
                  type="month"
                  value={
                    fromMonth
                  }
                  onChange={(e) =>
                    setFromMonth(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="ad-field">

                <label>
                  To Month
                </label>

                <input
                  type="month"
                  value={
                    toMonth
                  }
                  onChange={(e) =>
                    setToMonth(
                      e.target.value
                    )
                  }
                />

              </div>

            </>

          )}

          {/* DEPARTMENT */}

          <div className="ad-field">

            <label>
              Department
            </label>

            <select
              value={
                department
              }
              onChange={(e) =>
                setDepartment(
                  e.target.value
                )
              }
            >

              <option value="all">
                All Departments
              </option>

              <option value="cs">
                Computer Science (CS)
              </option>

              <option value="aids">
                AI & Data Science
                (AIDS)
              </option>

            </select>

          </div>

          {/* SEARCH */}

          <div className="ad-field">

            <label>
              Search Directory
            </label>

            <div className="ad-search">

              <Search
                size={16}
              />

              <input
                value={
                  search
                }
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search name or reg no..."
              />

            </div>

          </div>

        </div>

        {/* STATUS FILTER */}

        <div className="ad-filter-buttons">

          {viewMode ===
          "daybyday" ? (

            <>

              <button
                type="button"
                className={
                  dayStatusFilter ===
                  "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setDayStatusFilter(
                    "all"
                  )
                }
              >
                <Users
                  size={14}
                />

                All (
                {
                  singleDayData.length
                }
                )
              </button>

              <button
                type="button"
                className={
                  dayStatusFilter ===
                  "present"
                    ? "active-good"
                    : ""
                }
                onClick={() =>
                  setDayStatusFilter(
                    "present"
                  )
                }
              >
                <Check
                  size={14}
                />

                Present (
                {
                  dailyKPI.present
                }
                )
              </button>

              <button
                type="button"
                className={
                  dayStatusFilter ===
                  "absent"
                    ? "active-low"
                    : ""
                }
                onClick={() =>
                  setDayStatusFilter(
                    "absent"
                  )
                }
              >
                <X
                  size={14}
                />

                Absent (
                {
                  dailyKPI.absent
                }
                )
              </button>

              <button
                type="button"
                className={
                  dayStatusFilter ===
                  "late"
                    ? "active-late"
                    : ""
                }
                onClick={() =>
                  setDayStatusFilter(
                    "late"
                  )
                }
              >
                <Clock
                  size={14}
                />

                Late (
                {
                  dailyKPI.late
                }
                )
              </button>

            </>

          ) : (

            <>

              <button
                type="button"
                className={
                  summaryFilter ===
                  "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSummaryFilter(
                    "all"
                  )
                }
              >
                <Users
                  size={14}
                />

                All Students
              </button>

              <button
                type="button"
                className={
                  summaryFilter ===
                  "low"
                    ? "active-low"
                    : ""
                }
                onClick={() =>
                  setSummaryFilter(
                    "low"
                  )
                }
              >
                <AlertTriangle
                  size={14}
                />

                Below 75%
              </button>

              <button
                type="button"
                className={
                  summaryFilter ===
                  "good"
                    ? "active-good"
                    : ""
                }
                onClick={() =>
                  setSummaryFilter(
                    "good"
                  )
                }
              >
                <CheckCircle2
                  size={14}
                />

                75% & Above
              </button>

            </>

          )}

        </div>

      </section>

      {/* =====================================================
          KPI
          ===================================================== */}

      {viewMode ===
      "daybyday" ? (

        <section className="ad-summary">

          <div className="ad-card blue">

            <div className="ad-card-icon">
              <Calendar
                size={22}
              />
            </div>

            <div>

              <span>
                Selected Date
              </span>

              <strong>
                {formatSelectedDate(
                  selectedDate
                )}
              </strong>

              <small>
                Daily roster
              </small>

            </div>

          </div>

          <div className="ad-card green">

            <div className="ad-card-icon">
              <Check
                size={22}
              />
            </div>

            <div>

              <span>
                Present Today
              </span>

              <strong>
                {
                  dailyKPI.present
                }
              </strong>

              <small>
                {
                  dailyKPI.percent
                }
                % Turnout
              </small>

            </div>

          </div>

          <div className="ad-card red">

            <div className="ad-card-icon">
              <X
                size={22}
              />
            </div>

            <div>

              <span>
                Absent Today
              </span>

              <strong>
                {
                  dailyKPI.absent
                }
              </strong>

              <small>
                Action required
              </small>

            </div>

          </div>

          <div className="ad-card yellow">

            <div className="ad-card-icon">
              <Clock
                size={22}
              />
            </div>

            <div>

              <span>
                Late Arrivals
              </span>

              <strong>
                {
                  dailyKPI.late
                }
              </strong>

              <small>
                Marked late
              </small>

            </div>

          </div>

        </section>

      ) : (

        <section className="ad-summary summary-two-col">

          <div className="ad-card blue">

            <div className="ad-card-icon">
              <CalendarDays
                size={22}
              />
            </div>

            <div>

              <span>
                Total Class Days
              </span>

              <strong>
                {
                  classRecords.length
                }
              </strong>

              <small>
                Selected period
              </small>

            </div>

          </div>

          <div className="ad-card purple">

            <div className="ad-card-icon">
              <GraduationCap
                size={22}
              />
            </div>

            <div>

              <span>
                Enrolled Students
              </span>

              <strong>
                {
                  displayedSummaryStudents.length
                }
              </strong>

              <small>
                In department
              </small>

            </div>

          </div>

        </section>

      )}

      {/* =====================================================
          TABLE
          ===================================================== */}

      <section className="ad-table-card">

        <div className="ad-table-header">

          <div>

            <h2>

              {viewMode ===
              "daybyday"
                ? `Attendance: ${formatSelectedDate(
                    selectedDate
                  )}`
                : "Summary Report"}

            </h2>

            <p>

              {department ===
              "all"
                ? "All Departments"
                : department ===
                  "cs"
                ? "Computer Science Department"
                : "AI & Data Science Department"}

            </p>

          </div>

          <div className="ad-result-count">

            <Users
              size={13}
            />

            <span>

              {viewMode ===
              "daybyday"
                ? displayedDailyStudents.length
                : displayedSummaryStudents.length}{" "}
              students

            </span>

          </div>

        </div>

        {/* ===================================================
            LOADING
            =================================================== */}

        {loading ? (

          <div className="ad-loading">

            <Loader2
              size={20}
              className="spin-icon"
            />

            <span>
              Loading records...
            </span>

          </div>

        ) : viewMode ===
          "daybyday" ? (

          displayedDailyStudents.length ===
          0 ? (

            <div className="ad-empty">

              <Inbox
                size={40}
              />

              <h3>
                No student records found
              </h3>

              <p>
                Try switching department,
                status, or date filters.
              </p>

            </div>

          ) : (

            <div className="ad-table-wrapper">

              <table>

                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      STUDENT
                    </th>

                    <th>
                      REG NUMBER
                    </th>

                    <th>
                      DEPT
                    </th>

                    <th>
                      DAY ATTENDANCE STATUS
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {displayedDailyStudents.map(
                    (
                      item,
                      index
                    ) => (

                      <tr
                        key={
                          item.student.id
                        }
                      >

                        <td className="serial">
                          {index + 1}
                        </td>

                        <td>

                          <div className="ad-student">

                            <div className="ad-avatar">

                              {getStudentName(
                                item.student
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}

                            </div>

                            <div>

                              <strong>
                                {
                                  getStudentName(
                                    item.student
                                  )
                                }
                              </strong>

                            </div>

                          </div>

                        </td>

                        <td>
                          {
                            getRegisterNumber(
                              item.student
                            )
                          }
                        </td>

                        <td>

                          <span
                            className={`ad-department ${item.dep}`}
                          >
                            {item.dep ===
                            "cs"
                              ? "CS"
                              : "AIDS"}
                          </span>

                        </td>

                        <td>

                          {item.status ===
                            "present" && (

                            <span className="day-status-badge present">

                              <Check
                                size={14}
                              />

                              Present

                            </span>

                          )}

                          {item.status ===
                            "absent" && (

                            <span className="day-status-badge absent">

                              <X
                                size={14}
                              />

                              Absent

                            </span>

                          )}

                          {item.status ===
                            "late" && (

                            <span className="day-status-badge late">

                              <Clock
                                size={14}
                              />

                              Late

                            </span>

                          )}

                          {item.status ===
                            "not-joined" && (

                            <span className="day-status-badge not-joined">
                              Joined later
                            </span>

                          )}

                          {item.status ===
                            "no-class" && (

                            <span className="day-status-badge not-joined">
                              No class entry
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )

        ) : displayedSummaryStudents.length ===
          0 ? (

          <div className="ad-empty">

            <Inbox
              size={40}
            />

            <h3>
              No student records found
            </h3>

            <p>
              Try switching department
              or attendance threshold
              filters.
            </p>

          </div>

        ) : (

          <div className="ad-table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    STUDENT
                  </th>

                  <th>
                    DEPT
                  </th>

                  <th>
                    WORKING
                  </th>

                  <th>
                    PRESENT
                  </th>

                  <th>
                    ABSENT
                  </th>

                  <th>
                    LATE
                  </th>

                  <th>
                    ATTENDANCE
                  </th>

                </tr>

              </thead>

              <tbody>

                {displayedSummaryStudents.map(
                  (
                    item,
                    index
                  ) => {

                    const percentage =
                      item.percentage;

                    const cls =
                      getPercentageClass(
                        percentage
                      );

                    return (

                      <tr
                        key={
                          item.student.id
                        }
                      >

                        <td className="serial">
                          {index + 1}
                        </td>

                        <td>

                          <div className="ad-student">

                            <div className="ad-avatar">

                              {getStudentName(
                                item.student
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}

                            </div>

                            <div>

                              <strong>
                                {
                                  getStudentName(
                                    item.student
                                  )
                                }
                              </strong>

                              <span>
                                {
                                  getRegisterNumber(
                                    item.student
                                  )
                                }
                              </span>

                            </div>

                          </div>

                        </td>

                        <td>

                          <span
                            className={`ad-department ${item.dep}`}
                          >
                            {item.dep ===
                            "cs"
                              ? "CS"
                              : "AIDS"}
                          </span>

                        </td>

                        <td>

                          <strong>
                            {
                              item.workingDays
                            }
                          </strong>

                        </td>

                        <td>

                          <span className="present-number">

                            <Check
                              size={14}
                              strokeWidth={
                                2.5
                              }
                            />

                            {
                              item.presentDays
                            }

                          </span>

                        </td>

                        <td>

                          <span className="absent-number">

                            <X
                              size={14}
                              strokeWidth={
                                2.5
                              }
                            />

                            {
                              item.absentDays
                            }

                          </span>

                        </td>

                        <td>

                          <span className="late-number">

                            <Clock
                              size={14}
                              strokeWidth={
                                2.5
                              }
                            />

                            {
                              item.lateDays
                            }

                          </span>

                        </td>

                        <td>

                          <div className="percentage-top">

                            <strong
                              className={
                                cls
                              }
                            >
                              {percentage.toFixed(
                                1
                              )}
                              %
                            </strong>

                          </div>

                          <div className="percentage-bar">

                            <div
                              className={`percentage-fill ${cls}`}
                              style={{
                                width: `${Math.min(
                                  percentage,
                                  100
                                )}%`,
                              }}
                            />

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default AttendanceDashboard;