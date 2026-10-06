import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import {
  CLOUDINARY_UPLOAD_URL,
  CLOUDINARY_UPLOAD_PRESET,
} from "../cloudinary";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from "docx";
import "./StudentDetails.css";

// Lucide Icons
import {
  ArrowLeft,
  Search,
  X,
  RotateCcw,
  RotateCw,
  Pencil,
  Trash2,
  Users,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Loader2,
  Inbox,
  Save,
  Percent,
  Home,
  Download,
  Cpu,
  Terminal,
  Mail,
  CalendarDays,
  VenusAndMars,
  Droplets,
  MapPin,
  UserRound,
  UsersRound,
  PhoneCall,
  Heart,
  Contact,
  Hash,
  Image as ImageIcon,
  Upload,
  FileText,
  MapPinned,
  Clock3,
  Check,
  Ban,
  UserCheck,
  FileSpreadsheet,
  FileType,
  Filter,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Calendar,
} from "lucide-react";

const STATUS = {
  PRESENT: "p",
  ABSENT: "a",
  LATE: "l",
};

// Available Fields Configuration for Custom Export with dedicated icons
const EXPORT_AVAILABLE_FIELDS = [
  { id: "sNo", label: "S.No", icon: Hash, defaultChecked: true },
  { id: "fullName", label: "Full Name", icon: UserRound, defaultChecked: true },
  { id: "regNo", label: "Register Number", icon: Hash, defaultChecked: true },
  { id: "course", label: "Course / Dept", icon: GraduationCap, defaultChecked: true },
  { id: "studyMode", label: "Study Mode", icon: Home, defaultChecked: false },
  { id: "studentMobile", label: "Student Mobile", icon: Phone, defaultChecked: true },
  { id: "studentEmail", label: "Student Email", icon: Mail, defaultChecked: false },
  { id: "gender", label: "Gender", icon: VenusAndMars, defaultChecked: false },
  { id: "dob", label: "Date of Birth", icon: CalendarDays, defaultChecked: false },
  { id: "bloodGroup", label: "Blood Group", icon: Droplets, defaultChecked: false },
  { id: "joiningDate", label: "Date of Joining", icon: CalendarDays, defaultChecked: true },
  { id: "fatherName", label: "Father Name", icon: UserCheck, defaultChecked: true },
  { id: "fatherMobile", label: "Father Mobile", icon: PhoneCall, defaultChecked: true },
  { id: "motherName", label: "Mother Name", icon: Heart, defaultChecked: false },
  { id: "motherMobile", label: "Mother Mobile", icon: PhoneCall, defaultChecked: true },
  { id: "guardianName", label: "Guardian Name", icon: Contact, defaultChecked: false },
  { id: "guardianMobile", label: "Guardian Mobile", icon: PhoneCall, defaultChecked: false },
  { id: "address", label: "Address & Pincode", icon: MapPin, defaultChecked: false },
  { id: "workingDays", label: "Working Days", icon: Clock3, defaultChecked: false },
  { id: "presentDays", label: "Present Days", icon: Check, defaultChecked: false },
  { id: "absentDays", label: "Absent Days", icon: Ban, defaultChecked: false },
  { id: "lateDays", label: "Late Days", icon: Clock3, defaultChecked: false },
  { id: "attendancePct", label: "Attendance %", icon: Percent, defaultChecked: true },
];

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

  // Joining Date Filter States on Page Toolbar
  const [joiningDateFilterType, setJoiningDateFilterType] = useState("all");
  const [joiningDateCutoff, setJoiningDateCutoff] = useState("2026-09-01");
  const [joiningDateEnd, setJoiningDateEnd] = useState("");

  // Custom Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState("filtered"); // 'filtered' | 'all'
  const [exportFormat, setExportFormat] = useState("xlsx"); // 'xlsx' | 'pdf' | 'docx'

  // MODAL-SPECIFIC FILTERS (Department & Joining Month Filters inside the Modal)
  const [exportDeptFilter, setExportDeptFilter] = useState("all");
  const [exportJoinFilterType, setExportJoinFilterType] = useState("all"); // 'all' | 'exact-month' | 'before-month' | 'after-month' | 'range'
  const [exportJoinMonth, setExportJoinMonth] = useState(
    new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  );
  const [exportJoinRangeStart, setExportJoinRangeStart] = useState("");
  const [exportJoinRangeEnd, setExportJoinRangeEnd] = useState("");

  const [selectedFields, setSelectedFields] = useState(() =>
    EXPORT_AVAILABLE_FIELDS.filter((f) => f.defaultChecked).map((f) => f.id)
  );
  const [exportingInProgress, setExportingInProgress] = useState(false);

  // Flipped card (ID tracking)
  const [openId, setOpenId] = useState(null);

  // Photo loading / return animation
  const [imageLoading, setImageLoading] = useState({});
  const [imageError, setImageError] = useState({});
  const [returningId, setReturningId] = useState(null);

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const deptCounts = useMemo(() => {
    let cs = 0;
    let aids = 0;

    students.forEach((student) => {
      const key = getDepartmentKey(student);
      if (key === "cs") cs++;
      if (key === "aids") aids++;
    });

    return { total: students.length, cs, aids };
  }, [students]);

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

      // 1. Text Search Filter
      const matchesSearch =
        !searchText ||
        name.includes(searchText) ||
        mobile.includes(searchText) ||
        email.includes(searchText) ||
        course.includes(searchText) ||
        gender.includes(searchText);

      // 2. Gender & Course Filter
      const matchesGender =
        genderFilter === "all" || student.gender === genderFilter;

      const matchesCourse =
        courseFilter === "all" || student.course === courseFilter;

      // 3. Joining Date Filter
      const doj = getJoiningDate(student);
      let matchesDate = true;

      if (joiningDateFilterType === "before" && joiningDateCutoff) {
        matchesDate = Boolean(doj && doj < joiningDateCutoff);
      } else if (joiningDateFilterType === "after" && joiningDateCutoff) {
        matchesDate = Boolean(doj && doj >= joiningDateCutoff);
      } else if (joiningDateFilterType === "range" && joiningDateCutoff && joiningDateEnd) {
        matchesDate = Boolean(doj && doj >= joiningDateCutoff && doj <= joiningDateEnd);
      }

      return matchesSearch && matchesGender && matchesCourse && matchesDate;
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
    joiningDateFilterType,
    joiningDateCutoff,
    joiningDateEnd,
  ]);

  // ================= MODAL DYNAMIC FILTER LOGIC =================
  const finalExportList = useMemo(() => {
    const baseList = exportScope === "all" ? students : filteredStudents;

    return baseList.filter((student) => {
      // 1. Department Filter
      const depKey = getDepartmentKey(student);
      if (exportDeptFilter === "cs" && depKey !== "cs") return false;
      if (exportDeptFilter === "aids" && depKey !== "aids") return false;

      // 2. Joining Month / Date Filter
      const doj = getJoiningDate(student); // 'YYYY-MM-DD'
      if (exportJoinFilterType !== "all") {
        if (!doj) return false;
        const studentMonth = doj.slice(0, 7); // 'YYYY-MM'

        if (exportJoinFilterType === "exact-month") {
          if (studentMonth !== exportJoinMonth) return false;
        } else if (exportJoinFilterType === "before-month") {
          if (studentMonth >= exportJoinMonth) return false;
        } else if (exportJoinFilterType === "after-month") {
          if (studentMonth <= exportJoinMonth) return false;
        } else if (exportJoinFilterType === "range") {
          if (exportJoinRangeStart && doj < exportJoinRangeStart) return false;
          if (exportJoinRangeEnd && doj > exportJoinRangeEnd) return false;
        }
      }

      return true;
    });
  }, [
    students,
    filteredStudents,
    exportScope,
    exportDeptFilter,
    exportJoinFilterType,
    exportJoinMonth,
    exportJoinRangeStart,
    exportJoinRangeEnd,
  ]);

  // ================= DYNAMIC FIELD VALUE RESOLVER =================
  const getStudentFieldValue = (student, fieldId, index) => {
    const stat = computedAttendance[student.id] || {
      workingDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      percentage: 0,
    };

    switch (fieldId) {
      case "sNo":
        return index + 1;
      case "fullName":
        return (student.fullName || "—").toUpperCase();
      case "regNo":
        return student.regNo || student.rollNo || "—";
      case "course":
        return student.course || student.department || "—";
      case "studyMode":
        return student.studyMode === "hybrid" || student.isHybrid
          ? "Hybrid"
          : "Regular";
      case "studentMobile":
        return student.studentMobile || student.mobile || "—";
      case "studentEmail":
        return student.studentEmail || student.email || "—";
      case "gender":
        return student.gender || "—";
      case "dob":
        return student.dob || "—";
      case "bloodGroup":
        return student.bloodGroup || "—";
      case "joiningDate":
        return getJoiningDate(student) || "—";
      case "fatherName":
        return (student.fatherName || "—").toUpperCase();
      case "fatherMobile":
        return student.fatherMobile || "—";
      case "motherName":
        return (student.motherName || "—").toUpperCase();
      case "motherMobile":
        return student.motherMobile || "—";
      case "guardianName":
        return (student.guardianName || "—").toUpperCase();
      case "guardianMobile":
        return student.guardianMobile || "—";
      case "address":
        return [student.address, student.pincode].filter(Boolean).join(" - ") || "—";
      case "workingDays":
        return stat.workingDays;
      case "presentDays":
        return stat.presentDays;
      case "absentDays":
        return stat.absentDays;
      case "lateDays":
        return stat.lateDays;
      case "attendancePct":
        return `${stat.percentage}%`;
      default:
        return "—";
    }
  };

  const handleSelectPreset = (preset) => {
    if (preset === "all") {
      setSelectedFields(EXPORT_AVAILABLE_FIELDS.map((f) => f.id));
    } else if (preset === "none") {
      setSelectedFields(["sNo", "fullName"]);
    } else if (preset === "academic") {
      setSelectedFields([
        "sNo",
        "regNo",
        "fullName",
        "course",
        "studyMode",
        "joiningDate",
        "studentMobile",
        "workingDays",
        "presentDays",
        "absentDays",
        "attendancePct",
      ]);
    } else if (preset === "parents") {
      setSelectedFields([
        "sNo",
        "fullName",
        "regNo",
        "course",
        "studentMobile",
        "fatherName",
        "fatherMobile",
        "motherName",
        "motherMobile",
        "guardianMobile",
        "address",
      ]);
    }
  };

  const toggleFieldSelection = (fieldId) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Run the download for selected fields
  const executeCustomExport = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one column to export.");
      return;
    }

    if (!finalExportList.length) {
      alert("No student records matched your export filter criteria.");
      return;
    }

    setExportingInProgress(true);
    const today = new Date().toISOString().slice(0, 10);
    const activeHeaders = EXPORT_AVAILABLE_FIELDS.filter((f) =>
      selectedFields.includes(f.id)
    );

    try {
      // 1. EXCEL EXPORT
      if (exportFormat === "xlsx") {
        const rows = finalExportList.map((st, idx) => {
          const rowObj = {};
          activeHeaders.forEach((h) => {
            rowObj[h.label] = getStudentFieldValue(st, h.id, idx);
          });
          return rowObj;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = activeHeaders.map((h) => {
          let maxLen = h.label.length;
          rows.forEach((r) => {
            maxLen = Math.max(maxLen, String(r[h.label] ?? "").length);
          });
          return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
        });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Export");
        XLSX.writeFile(workbook, `Student_Export_${today}.xlsx`);
      }

      // 2. PDF EXPORT
      else if (exportFormat === "pdf") {
        const orientation = activeHeaders.length > 6 ? "landscape" : "portrait";
        const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
        const dateStr = new Date().toLocaleDateString("en-IN");

        doc.setFontSize(15);
        doc.text("Student Custom Data Report", 40, 35);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(
          `Generated: ${dateStr} | Matched Records: ${finalExportList.length} | Columns: ${activeHeaders.length}`,
          40,
          50
        );

        const head = [activeHeaders.map((h) => h.label)];
        const body = finalExportList.map((st, idx) =>
          activeHeaders.map((h) => String(getStudentFieldValue(st, h.id, idx)))
        );

        autoTable(doc, {
          startY: 65,
          head,
          body,
          theme: "grid",
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: 255,
            fontStyle: "bold",
          },
          styles: { fontSize: activeHeaders.length > 8 ? 7 : 8, cellPadding: 4 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save(`Student_Export_${today}.pdf`);
      }

      // 3. WORD EXPORT (.docx)
      else if (exportFormat === "docx") {
        const tableHeaderRow = new TableRow({
          tableHeader: true,
          children: activeHeaders.map(
            (h) =>
              new TableCell({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: h.label, bold: true, color: "FFFFFF" }),
                    ],
                  }),
                ],
                shading: { fill: "1E3A8A" },
              })
          ),
        });

        const tableDataRows = finalExportList.map(
          (st, idx) =>
            new TableRow({
              children: activeHeaders.map(
                (h) =>
                  new TableCell({
                    children: [
                      new Paragraph(
                        String(getStudentFieldValue(st, h.id, idx))
                      ),
                    ],
                  })
              ),
            })
        );

        const docxDocument = new Document({
          sections: [
            {
              children: [
                new Paragraph({
                  text: "Custom Student Directory & Records",
                  heading: HeadingLevel.HEADING_1,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: `Generated on: ${new Date().toLocaleDateString("en-IN")} | Total Records: ${finalExportList.length}`,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [tableHeaderRow, ...tableDataRows],
                }),
              ],
            },
          ],
        });

        const blob = await Packer.toBlob(docxDocument);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Student_Export_${today}.docx`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      setShowExportModal(false);
    } catch (err) {
      console.error("Export failed:", err);
      alert(`Export error: ${err.message}`);
    } finally {
      setExportingInProgress(false);
    }
  };

  // ================= CARD & MODAL HANDLERS =================
  const toggleStudent = (e, studentId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setOpenId((currentId) => (currentId === studentId ? null : studentId));
  };

  const handleReturnToPhoto = (e, studentId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setReturningId(studentId);

    window.setTimeout(() => {
      setOpenId((currentId) =>
        currentId === studentId ? null : currentId
      );
    }, 120);

    window.setTimeout(() => {
      setReturningId((currentId) =>
        currentId === studentId ? null : currentId
      );
    }, 700);
  };

  const handleImageLoad = (studentId) => {
    setImageLoading((prev) => ({ ...prev, [studentId]: false }));
    setImageError((prev) => ({ ...prev, [studentId]: false }));
  };

  const handleImageError = (studentId) => {
    setImageLoading((prev) => ({ ...prev, [studentId]: false }));
    setImageError((prev) => ({ ...prev, [studentId]: true }));
  };

  const formatPhone = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "—";
    if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    return value;
  };

  const uploadStudentImage = async (file) => {
    if (!file) return null;

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image size must be less than 5 MB.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "student-records");

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary error:", data);
      throw new Error(data?.error?.message || "Image upload failed.");
    }

    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
    };
  };

  const startEdit = (e, student) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setEditingStudent({
      ...student,
      regNo: student.regNo || student.rollNo || "",
      joiningDate: getJoiningDate(student),
      studyMode:
        student.studyMode ||
        (student.isHybrid ? "hybrid" : "regular"),
      imageUrl: student.imageUrl || "",
      imagePublicId: student.imagePublicId || "",
      newImageFile: null,
      imagePreview: student.imageUrl || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingStudent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStudentImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setEditingStudent((prev) => ({
      ...prev,
      newImageFile: file,
      imagePreview: previewUrl,
    }));
  };

  const saveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingStudent) return;

    try {
      setSaving(true);

      let imageUrl = editingStudent.imageUrl || "";
      let imagePublicId = editingStudent.imagePublicId || "";

      if (editingStudent.newImageFile) {
        const uploaded = await uploadStudentImage(editingStudent.newImageFile);
        imageUrl = uploaded.secure_url;
        imagePublicId = uploaded.public_id;
      }

      const studentRef = doc(db, "students", editingStudent.id);

      await updateDoc(studentRef, {
        fullName: editingStudent.fullName?.trim() || "",
        regNo: editingStudent.regNo?.trim() || "",
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
        imageUrl,
        imagePublicId,
        updatedAt: serverTimestamp(),
      });

      setEditingStudent(null);
      alert("Student details and photo updated successfully.");
    } catch (error) {
      console.error("Update error:", error);
      alert(`Unable to update student.\n\n${error.code || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (e, student) => {
    if (e && e.stopPropagation) e.stopPropagation();
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
    setJoiningDateFilterType("all");
    setJoiningDateCutoff("2026-09-01");
    setJoiningDateEnd("");
  };

  return (
    <div className="details-page">
      {/* HEADER */}
      <header className="details-header">
        <div className="details-brand">
          <h1>Student Records</h1>
          <p>Real-time academic profiles and cumulative cloud attendance</p>
        </div>

        {/* STATS GROUP */}
        <div className="stats-group">
          <div className="stat-card">
            <div className="stat-icon total">
              <Users size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{deptCounts.total}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon cs">
              <Terminal size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{deptCounts.cs}</span>
              <span className="stat-label">CS Dept</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon aids">
              <Cpu size={18} />
            </div>
            <div className="stat-info">
              <span className="stat-num">{deptCounts.aids}</span>
              <span className="stat-label">AI & DS</span>
            </div>
          </div>
        </div>
      </header>

      {/* FILTER TOOLBAR */}
      <div className="details-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
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
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filter-row">
          <div className="select-control">
            <VenusAndMars size={14} />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              aria-label="Filter by gender"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="select-control">
            <GraduationCap size={14} />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              aria-label="Filter by course"
            >
              <option value="all">All Departments</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          {/* JOINING DATE FILTER SELECT */}
          <div className="select-control">
            <CalendarDays size={14} />
            <select
              value={joiningDateFilterType}
              onChange={(e) => setJoiningDateFilterType(e.target.value)}
              aria-label="Filter by joining date"
            >
              <option value="all">All Joining Dates</option>
              <option value="before">Joined Before</option>
              <option value="after">Joined After</option>
              <option value="range">Date Range</option>
            </select>
          </div>

          {joiningDateFilterType !== "all" && (
            <div className="date-filter-inputs">
              <input
                type="date"
                value={joiningDateCutoff}
                onChange={(e) => setJoiningDateCutoff(e.target.value)}
                className="toolbar-date-input"
              />
              {joiningDateFilterType === "range" && (
                <>
                  <span className="date-range-sep">to</span>
                  <input
                    type="date"
                    value={joiningDateEnd}
                    onChange={(e) => setJoiningDateEnd(e.target.value)}
                    className="toolbar-date-input"
                  />
                </>
              )}
            </div>
          )}

          <div className="select-control">
            <Percent size={14} />
            <select
              value={attendanceOrder}
              onChange={(e) => setAttendanceOrder(e.target.value)}
              aria-label="Sort by attendance"
            >
              <option value="none">Sort: Default</option>
              <option value="high">Attendance: High → Low</option>
              <option value="low">Attendance: Low → High</option>
            </select>
          </div>

          {(search ||
            genderFilter !== "all" ||
            courseFilter !== "all" ||
            attendanceOrder !== "none" ||
            joiningDateFilterType !== "all") && (
            <button
              type="button"
              className="reset-filter"
              onClick={resetFilters}
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}

          {/* DIRECT CUSTOM EXPORT BUTTON */}
          <button
            type="button"
            className="export-btn"
            onClick={() => setShowExportModal(true)}
            title="Configure and download custom export"
          >
            <Download size={15} /> Export Details
          </button>
        </div>
      </div>

      <div className="results-indicator">
        <Users size={12} /> Showing <strong>{filteredStudents.length}</strong> of{" "}
        <strong>{students.length}</strong> students
      </div>

      {/* MAIN BODY */}
      <main className="details-body">
        {loading && (
          <div className="details-state">
            <Loader2 size={24} className="spin-icon" />
            <span>Calculating records & attendance...</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="details-state details-error">
            <AlertTriangle size={20} />
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && filteredStudents.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Inbox size={36} />
            </div>
            <h3>No students found</h3>
            <p>Try changing your search keywords or active filters.</p>
            <button type="button" onClick={resetFilters}>
              <RotateCcw size={14} /> Clear Filters
            </button>
          </div>
        )}

        {!loading && !loadError && filteredStudents.length > 0 && (
          <div className="details-grid">
            {filteredStudents.map((student) => {
              const isFlipped = openId === student.id;
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
                <article key={student.id} className="student-card">
                  <div className={`card-flipper ${isFlipped ? "is-flipped" : ""}`}>
                    {/* ============ FRONT FACE ============ */}
                    <div className="card-face card-face-front">
                      <div className="photo-hero">
                        <button
                          type="button"
                          className="flip-corner-btn"
                          onClick={(e) => toggleStudent(e, student.id)}
                          aria-label="Flip card to view full details"
                          title="Flip card"
                        >
                          <RotateCw size={15} />
                        </button>

                        {student.imageUrl && !imageError[student.id] ? (
                          <>
                            {imageLoading[student.id] !== false && (
                              <div
                                className="image-loading-overlay"
                                aria-label="Loading student photo"
                              >
                                <div className="image-loading-spinner">
                                  <Loader2 size={25} />
                                </div>
                                <span>Loading photo...</span>
                              </div>
                            )}
                            <img
                              className={`student-photo ${
                                imageLoading[student.id] !== false
                                  ? "is-loading"
                                  : "is-loaded"
                              }`}
                              src={student.imageUrl}
                              alt={student.fullName || "Student"}
                              onLoad={() => handleImageLoad(student.id)}
                              onError={() => handleImageError(student.id)}
                              loading="lazy"
                              decoding="async"
                            />
                          </>
                        ) : (
                          <div className="photo-hero-placeholder">
                            <User size={38} />
                            <span>
                              {student.imageUrl
                                ? "Photo unavailable"
                                : "No photo on file"}
                            </span>
                          </div>
                        )}

                        <div className="hero-badge-row">
                          {isHybrid && (
                            <span className="badge badge-hybrid">
                              <Home size={12} /> Hybrid
                            </span>
                          )}
                          <span
                            className={`badge ${
                              isLow ? "badge-low" : "badge-good"
                            }`}
                          >
                            {isLow ? (
                              <AlertTriangle size={12} />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            {attendancePercent}%
                          </span>
                        </div>
                      </div>

                      <div className="front-body">
                        <div className="profile-titles">
                          <h2>{student.fullName || "Unnamed student"}</h2>
                          <span className="student-course">
                            <GraduationCap size={14} />
                            <span>{student.course || "Course not selected"}</span>
                          </span>
                        </div>

                        {/* 4-COLUMN ALIGNED STRIP */}
                        <div className="student-summary-strip">
                          <div className="summary-item">
                            <span className="summary-lbl">
                              <Phone size={10} aria-hidden="true" />
                              <span>Mobile</span>
                            </span>
                            <span className="summary-val summary-phone">
                              {student.studentMobile ? (
                                <a
                                  href={`tel:${String(student.studentMobile).replace(/\D/g, "")}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {formatPhone(student.studentMobile)}
                                </a>
                              ) : (
                                "—"
                              )}
                            </span>
                          </div>

                          <div className="summary-item">
                            <span className="summary-lbl">
                              <Home size={10} />
                              <span>Mode</span>
                            </span>
                            <span className="summary-val">
                              {isHybrid ? "Home" : "In-person"}
                            </span>
                          </div>

                          <div className="summary-item">
                            <span className="summary-lbl">
                              <Clock3 size={10} />
                              <span>WD</span>
                            </span>
                            <span className="summary-val">
                              {stat.workingDays}d
                            </span>
                          </div>

                          <div className="summary-item">
                            <span className="summary-lbl">
                              <Percent size={10} />
                              <span>Attd</span>
                            </span>
                            <span className="summary-val status-val">
                              <b className="p-count">{stat.presentDays}P</b>
                            </span>
                          </div>
                        </div>

                        <div className="card-actions">
                          <button
                            type="button"
                            className="btn-action btn-edit"
                            onClick={(e) => startEdit(e, student)}
                          >
                            <Pencil size={13} /> Edit
                          </button>

                          <button
                            type="button"
                            className="btn-action btn-delete"
                            onClick={(e) => deleteStudent(e, student)}
                          >
                            <Trash2 size={13} /> Delete
                          </button>

                          <button
                            type="button"
                            className="btn-action btn-expand"
                            onClick={(e) => toggleStudent(e, student.id)}
                          >
                            Details <RotateCw size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ============ BACK FACE ============ */}
                    <div className="card-face card-face-back">
                      <div className="back-header-group">
                        <div className="back-topbar">
                          <button
                            type="button"
                            className={`back-return-btn ${
                              returningId === student.id ? "is-returning" : ""
                            }`}
                            onClick={(e) => handleReturnToPhoto(e, student.id)}
                            aria-label="Return to student photo"
                            title="Return to photo"
                          >
                            <ArrowLeft size={14} />
                            <span>Return to Photo</span>
                          </button>
                          <span className="back-record-pill">
                            <Hash size={11} /> ID: {student.id.slice(0, 8)}
                          </span>
                        </div>

                        <div className="back-hero-title">
                          <h3>{student.fullName || "Student Details"}</h3>
                          <p>
                            <GraduationCap size={12} />{" "}
                            {student.course || "General Profile"}
                          </p>
                        </div>
                      </div>

                      <div className="back-inner">
                        <div className="detail-card-panel">
                          <span className="panel-tag">
                            <Percent size={13} /> <span>Cloud Attendance</span>
                          </span>
                          <div className="attendance-mini-stats">
                            <div className="stat-pill">
                              <span className="pill-val">
                                {stat.workingDays}
                              </span>
                              <span className="pill-lbl">
                                <Clock3 size={10} /> Working
                              </span>
                            </div>
                            <div className="stat-pill">
                              <span className="pill-val text-green">
                                {stat.presentDays}
                              </span>
                              <span className="pill-lbl">
                                <Check size={10} /> Present
                              </span>
                            </div>
                            <div className="stat-pill">
                              <span className="pill-val text-red">
                                {stat.absentDays}
                              </span>
                              <span className="pill-lbl">
                                <Ban size={10} /> Absent
                              </span>
                            </div>
                            <div className="stat-pill">
                              <span className="pill-val text-yellow">
                                {stat.lateDays}
                              </span>
                              <span className="pill-lbl">
                                <Clock3 size={10} /> Late
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="detail-card-panel">
                          <span className="panel-tag">
                            <UserRound size={13} />{" "}
                            <span>Student Information</span>
                          </span>
                          <dl className="info-grid">
                            <div>
                              <dt>
                                <CalendarDays size={11} /> DOB
                              </dt>
                              <dd>{student.dob || "—"}</dd>
                            </div>
                            <div>
                              <dt>
                                <VenusAndMars size={11} /> Gender
                              </dt>
                              <dd>{student.gender || "—"}</dd>
                            </div>
                            <div>
                              <dt>
                                <Droplets size={11} /> Blood Group
                              </dt>
                              <dd className="badge-bg">
                                {student.bloodGroup || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <CalendarDays size={11} /> Joined On
                              </dt>
                              <dd>
                                {student.joiningDate
                                  ? formatDate(student.joiningDate)
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="detail-card-panel">
                          <span className="panel-tag">
                            <UsersRound size={13} />{" "}
                            <span>Contact & Family</span>
                          </span>
                          <dl className="info-grid">
                            <div>
                              <dt>
                                <Phone size={11} /> Mobile
                              </dt>
                              <dd className="phone-value">
                                <a
                                  href={
                                    student.studentMobile
                                      ? `tel:${String(student.studentMobile).replace(/\D/g, "")}`
                                      : undefined
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {formatPhone(student.studentMobile)}
                                </a>
                              </dd>
                            </div>
                            <div>
                              <dt>
                                <Mail size={11} /> Email
                              </dt>
                              <dd className="email-value">
                                {student.studentEmail || "—"}
                              </dd>
                            </div>

                            <div className="parent-detail-block">
                              <dt>
                                <UserCheck size={11} /> Father
                              </dt>
                              <dd>
                                <span className="parent-name">
                                  {student.fatherName || "—"}
                                </span>
                                {student.fatherMobile && (
                                  <a
                                    className="parent-phone"
                                    href={`tel:${String(student.fatherMobile).replace(/\D/g, "")}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <PhoneCall size={10} />
                                    <span>
                                      {formatPhone(student.fatherMobile)}
                                    </span>
                                  </a>
                                )}
                              </dd>
                            </div>

                            <div className="parent-detail-block">
                              <dt>
                                <Heart size={11} /> Mother
                              </dt>
                              <dd>
                                <span className="parent-name">
                                  {student.motherName || "—"}
                                </span>
                                {student.motherMobile && (
                                  <a
                                    className="parent-phone"
                                    href={`tel:${String(student.motherMobile).replace(/\D/g, "")}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <PhoneCall size={10} />
                                    <span>
                                      {formatPhone(student.motherMobile)}
                                    </span>
                                  </a>
                                )}
                              </dd>
                            </div>

                            {(student.guardianName || student.guardianMobile) && (
                              <div className="parent-detail-block">
                                <dt>
                                  <Contact size={11} /> Guardian
                                </dt>
                                <dd>
                                  <span className="parent-name">
                                    {student.guardianName || "—"}
                                  </span>
                                  {student.guardianMobile && (
                                    <a
                                      className="parent-phone"
                                      href={`tel:${String(student.guardianMobile).replace(/\D/g, "")}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <PhoneCall size={10} />
                                      <span>
                                        {formatPhone(student.guardianMobile)}
                                      </span>
                                    </a>
                                  )}
                                </dd>
                              </div>
                            )}

                            {student.address && (
                              <div className="grid-full">
                                <dt>
                                  <MapPin size={11} /> Address
                                </dt>
                                <dd className="address-box">
                                  {student.address}
                                  {student.pincode
                                    ? ` - ${student.pincode}`
                                    : ""}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div className="back-footer">
                          <span>
                            <CalendarDays size={11} /> Submitted on{" "}
                            {formatDate(student.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================
          PORTAL: CUSTOM EXPORT BUILDER MODAL WITH ADVANCED FILTERS
          ======================================================== */}
      {showExportModal &&
        createPortal(
          <div
            className="edit-overlay export-overlay-front"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !exportingInProgress) {
                setShowExportModal(false);
              }
            }}
          >
            <div className="edit-modal export-builder-modal">
              <div className="edit-modal-header">
                <div>
                  <span className="modal-eyebrow">
                    <SlidersHorizontal size={11} /> EXPORT BUILDER
                  </span>
                  <h2>Configure Export Details & Filters</h2>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setShowExportModal(false)}
                  disabled={exportingInProgress}
                  aria-label="Close export modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="export-modal-body">
                {/* 1. Format & Scope Controls */}
                <div className="export-config-bar">
                  <div className="config-option-group">
                    <label>Download Format</label>
                    <div className="format-toggle-pills">
                      <button
                        type="button"
                        className={`format-btn format-excel ${exportFormat === "xlsx" ? "active" : ""}`}
                        onClick={() => setExportFormat("xlsx")}
                      >
                        <FileSpreadsheet size={16} className="format-icon icon-excel" />
                        <span>Excel (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        className={`format-btn format-pdf ${exportFormat === "pdf" ? "active" : ""}`}
                        onClick={() => setExportFormat("pdf")}
                      >
                        <FileText size={16} className="format-icon icon-pdf" />
                        <span>PDF (.pdf)</span>
                      </button>

                      <button
                        type="button"
                        className={`format-btn format-word ${exportFormat === "docx" ? "active" : ""}`}
                        onClick={() => setExportFormat("docx")}
                      >
                        <FileType size={16} className="format-icon icon-word" />
                        <span>Word (.docx)</span>
                      </button>
                    </div>
                  </div>

                  <div className="config-option-group">
                    <label>Records Scope</label>
                    <div className="format-toggle-pills">
                      <button
                        type="button"
                        className={exportScope === "filtered" ? "active" : ""}
                        onClick={() => setExportScope("filtered")}
                      >
                        <Filter size={14} />
                        <span>Screen Filter ({filteredStudents.length})</span>
                      </button>
                      <button
                        type="button"
                        className={exportScope === "all" ? "active" : ""}
                        onClick={() => setExportScope("all")}
                      >
                        <Users size={14} />
                        <span>All Students ({students.length})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. DEDICATED EXPORT FILTERS: Department & Joining Month */}
                <div className="export-modal-filters-box">
                  <span className="export-filters-title">
                    <Filter size={13} /> Filter Records To Export
                  </span>

                  <div className="export-filters-grid">
                    {/* Department Filter inside Modal */}
                    <div className="modal-filter-field">
                      <label>
                        <GraduationCap size={13} /> Target Department
                      </label>
                      <select
                        value={exportDeptFilter}
                        onChange={(e) => setExportDeptFilter(e.target.value)}
                      >
                        <option value="all">All Departments (CS & AIDS)</option>
                        <option value="cs">Computer Science (CS)</option>
                        <option value="aids">AI & Data Science (AIDS)</option>
                      </select>
                    </div>

                    {/* Joining Date Type Filter inside Modal */}
                    <div className="modal-filter-field">
                      <label>
                        <Calendar size={13} /> Joining Date Filter
                      </label>
                      <select
                        value={exportJoinFilterType}
                        onChange={(e) => setExportJoinFilterType(e.target.value)}
                      >
                        <option value="all">All Joining Dates</option>
                        <option value="exact-month">In Specific Month</option>
                        <option value="before-month">Joined Before Month</option>
                        <option value="after-month">Joined After Month</option>
                        <option value="range">Specific Date Range</option>
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Month / Date Inputs depending on selection */}
                  {exportJoinFilterType !== "all" && (
                    <div className="modal-date-picker-row">
                      {exportJoinFilterType === "range" ? (
                        <div className="modal-range-inputs">
                          <div>
                            <span className="range-sublabel">From Date:</span>
                            <input
                              type="date"
                              value={exportJoinRangeStart}
                              onChange={(e) => setExportJoinRangeStart(e.target.value)}
                              className="modal-date-input"
                            />
                          </div>
                          <div>
                            <span className="range-sublabel">To Date:</span>
                            <input
                              type="date"
                              value={exportJoinRangeEnd}
                              onChange={(e) => setExportJoinRangeEnd(e.target.value)}
                              className="modal-date-input"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="modal-month-input-wrap">
                          <span className="range-sublabel">Select Target Month:</span>
                          <input
                            type="month"
                            value={exportJoinMonth}
                            onChange={(e) => setExportJoinMonth(e.target.value)}
                            className="modal-month-input"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="matched-counter-strip">
                    <span>
                      Matching students for export:{" "}
                      <strong>{finalExportList.length}</strong> of {students.length}
                    </span>
                  </div>
                </div>

                {/* 3. Quick Column Presets */}
                <div className="preset-quick-strip">
                  <span className="preset-lbl">Column Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("all")}
                  >
                    <CheckSquare size={13} /> Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("academic")}
                  >
                    <GraduationCap size={13} /> Academic & Attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("parents")}
                  >
                    <UsersRound size={13} /> Parent & Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("none")}
                  >
                    <Square size={13} /> Clear All
                  </button>
                </div>

                {/* 4. Fields Checklist Grid with Field Icons */}
                <div className="fields-checklist-container">
                  <label className="checklist-heading">
                    Select Columns ({selectedFields.length} selected):
                  </label>
                  <div className="fields-checkbox-grid">
                    {EXPORT_AVAILABLE_FIELDS.map((field) => {
                      const isChecked = selectedFields.includes(field.id);
                      const IconComp = field.icon;
                      return (
                        <div
                          key={field.id}
                          className={`field-checkbox-item ${
                            isChecked ? "is-checked" : ""
                          }`}
                          onClick={() => toggleFieldSelection(field.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                          />
                          <IconComp size={14} className="field-icon-bullet" />
                          <span>{field.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER: Fixed Download Action */}
              <div className="edit-modal-footer wide export-modal-footer-pinned">
                <button
                  type="button"
                  className="cancel-edit"
                  onClick={() => setShowExportModal(false)}
                  disabled={exportingInProgress}
                >
                  <X size={14} /> Cancel
                </button>

                <button
                  type="button"
                  className="save-edit download-action-btn"
                  onClick={executeCustomExport}
                  disabled={exportingInProgress || selectedFields.length === 0 || finalExportList.length === 0}
                >
                  {exportingInProgress ? (
                    <>
                      <Loader2 size={16} className="spin-icon" /> Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} /> Download Selected File ({finalExportList.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL EDIT MODAL */}
      {editingStudent &&
        createPortal(
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
                  <span className="modal-eyebrow">
                    <FileText size={11} /> UPDATE RECORD
                  </span>
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

              <form className="edit-form" onSubmit={saveEdit}>
                <div className="edit-field wide student-photo-field">
                  <label>
                    <ImageIcon size={13} /> Student Photo
                  </label>

                  <div className="student-photo-editor">
                    <div className="student-photo-preview">
                      {editingStudent.imagePreview ? (
                        <img
                          src={editingStudent.imagePreview}
                          alt={editingStudent.fullName || "Student"}
                        />
                      ) : (
                        <div className="no-student-photo">
                          <User size={30} />
                          <span>No Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="student-photo-controls">
                      <input
                        id="student-image-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleStudentImageChange}
                        disabled={saving}
                        hidden
                      />

                      <label
                        htmlFor="student-image-upload"
                        className="photo-upload-button"
                      >
                        <Upload size={13} /> Choose Photo
                      </label>

                      <small>JPG, PNG or WEBP · Max 5 MB</small>

                      {editingStudent.newImageFile && (
                        <small className="selected-file-label">
                          {editingStudent.newImageFile.name}
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                <div className="edit-field wide">
                  <label>
                    <UserRound size={13} /> Full Name
                  </label>
                  <input
                    name="fullName"
                    value={editingStudent.fullName || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <Hash size={13} /> Register Number
                  </label>
                  <input
                    type="text"
                    name="regNo"
                    value={editingStudent.regNo || ""}
                    onChange={handleEditChange}
                    placeholder="Enter register number"
                    autoComplete="off"
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <MapPinned size={13} /> Study Mode / Location
                  </label>
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
                  <label>
                    <GraduationCap size={13} /> Department / Course
                  </label>
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
                  <label>
                    <CalendarDays size={13} /> Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={editingStudent.dob || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <CalendarDays size={13} /> Date of Joining
                  </label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={editingStudent.joiningDate || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <VenusAndMars size={13} /> Gender
                  </label>
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
                  <label>
                    <Droplets size={13} /> Blood Group
                  </label>
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
                  <label>
                    <Phone size={13} /> Student Mobile
                  </label>
                  <input
                    name="studentMobile"
                    value={editingStudent.studentMobile || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <Mail size={13} /> Email
                  </label>
                  <input
                    type="email"
                    name="studentEmail"
                    value={editingStudent.studentEmail || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field wide">
                  <label>
                    <MapPin size={13} /> Address
                  </label>
                  <textarea
                    name="address"
                    rows="3"
                    value={editingStudent.address || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <Hash size={13} /> Pincode
                  </label>
                  <input
                    name="pincode"
                    value={editingStudent.pincode || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <UserCheck size={13} /> Father's Name
                  </label>
                  <input
                    name="fatherName"
                    value={editingStudent.fatherName || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <PhoneCall size={13} /> Father's Mobile
                  </label>
                  <input
                    name="fatherMobile"
                    value={editingStudent.fatherMobile || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <Heart size={13} /> Mother's Name
                  </label>
                  <input
                    name="motherName"
                    value={editingStudent.motherName || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <PhoneCall size={13} /> Mother's Mobile
                  </label>
                  <input
                    name="motherMobile"
                    value={editingStudent.motherMobile || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <Contact size={13} /> Guardian Name
                  </label>
                  <input
                    name="guardianName"
                    value={editingStudent.guardianName || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-field">
                  <label>
                    <PhoneCall size={13} /> Guardian Mobile
                  </label>
                  <input
                    name="guardianMobile"
                    value={editingStudent.guardianMobile || ""}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="edit-modal-footer wide">
                  <button
                    type="button"
                    className="cancel-edit"
                    onClick={() => setEditingStudent(null)}
                    disabled={saving}
                  >
                    <X size={14} /> Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-edit"
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
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default StudentDetails;