import { useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import "./StudentForm.css";

const initialFormData = {
  fullName: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  studentMobile: "",
  studentEmail: "",
  address: "",
  pincode: "",
  fatherName: "",
  fatherMobile: "",
  motherName: "",
  motherMobile: "",
  guardianName: "",
  guardianMobile: "",
  course: "",
};

function StudentForm() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Numbers only for phone numbers and pincode
    if (
      name === "studentMobile" ||
      name === "fatherMobile" ||
      name === "motherMobile" ||
      name === "guardianMobile" ||
      name === "pincode"
    ) {
      if (!/^\d*$/.test(value)) return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Remove error while correcting
    setErrors((prev) => ({
      ...prev,
      [name]: "",
      parentMobile: "",
    }));

    setSubmitted(false);
  };

  /*
   * Fields required for submission.
   *
   * Blood group is optional.
   * Guardian name is optional.
   */
  const requiredFields = [
    "fullName",
    "dob",
    "gender",
    "studentMobile",
    "studentEmail",
    "address",
    "pincode",
    "fatherName",
    "motherName",
    "course",
  ];

  // At least one parent/guardian number is required
  const parentMobileCompleted =
    formData.fatherMobile.trim() !== "" ||
    formData.motherMobile.trim() !== "" ||
    formData.guardianMobile.trim() !== "";

  const totalFields = requiredFields.length + 1;

  const completedNormalFields = requiredFields.filter(
    (field) => formData[field].trim() !== ""
  ).length;

  const completedFields =
    completedNormalFields +
    (parentMobileCompleted ? 1 : 0);

  const completionPercentage = Math.round(
    (completedFields / totalFields) * 100
  );

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required.";
    }

    if (!formData.gender) {
      newErrors.gender = "Please select your gender.";
    }

    if (!formData.studentMobile.trim()) {
      newErrors.studentMobile =
        "Student mobile number is required.";
    } else if (!/^\d{10}$/.test(formData.studentMobile)) {
      newErrors.studentMobile =
        "Enter a valid 10 digit mobile number.";
    }

    if (!formData.studentEmail.trim()) {
      newErrors.studentEmail =
        "Student email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.studentEmail
      )
    ) {
      newErrors.studentEmail =
        "Enter a valid email address.";
    }

    if (!formData.address.trim()) {
      newErrors.address =
        "Residential address is required.";
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode =
        "Enter a valid 6 digit pincode.";
    }

    if (!formData.fatherName.trim()) {
      newErrors.fatherName =
        "Father's name is required.";
    }

    if (!formData.motherName.trim()) {
      newErrors.motherName =
        "Mother's name is required.";
    }

    // At least ONE parent/guardian number
    if (!parentMobileCompleted) {
      newErrors.parentMobile =
        "Enter at least one parent or guardian mobile number.";
    }

    // Validate father number if entered
    if (
      formData.fatherMobile &&
      !/^\d{10}$/.test(formData.fatherMobile)
    ) {
      newErrors.fatherMobile =
        "Enter a valid 10 digit mobile number.";
    }

    // Validate mother number if entered
    if (
      formData.motherMobile &&
      !/^\d{10}$/.test(formData.motherMobile)
    ) {
      newErrors.motherMobile =
        "Enter a valid 10 digit mobile number.";
    }

    // Validate guardian number if entered
    if (
      formData.guardianMobile &&
      !/^\d{10}$/.test(formData.guardianMobile)
    ) {
      newErrors.guardianMobile =
        "Enter a valid 10 digit mobile number.";
    }

    if (!formData.course) {
      newErrors.course =
        "Please select your course.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();

    setErrors(newErrors);

    // ==========================================
    // VALIDATION ERRORS
    // ==========================================
    if (Object.keys(newErrors).length > 0) {
      setSubmitted(false);

      // Find first error
      const firstError = Object.keys(newErrors)[0];

      let element = document.querySelector(
        `[name="${firstError}"]`
      );

      // Parent mobile is a combined requirement
      if (
        firstError === "parentMobile" &&
        !element
      ) {
        element = document.querySelector(
          '[name="fatherMobile"]'
        );
      }

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setTimeout(() => {
          element.focus();
        }, 500);
      }

      return;
    }

    // ==========================================
    // FIREBASE SUBMISSION
    // ==========================================

    try {
      setSaving(true);
      setSubmitted(false);

      // Create a clean copy of the form data
      const studentData = {
        fullName: formData.fullName.trim(),
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        studentMobile: formData.studentMobile.trim(),
        studentEmail: formData.studentEmail.trim(),
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        fatherName: formData.fatherName.trim(),
        fatherMobile: formData.fatherMobile.trim(),
        motherName: formData.motherName.trim(),
        motherMobile: formData.motherMobile.trim(),
        guardianName: formData.guardianName.trim(),
        guardianMobile: formData.guardianMobile.trim(),
        course: formData.course,

        // Firebase timestamp
        createdAt: serverTimestamp(),
      };

      // Add student to Firestore
      const docRef = await addDoc(
        collection(db, "students"),
        studentData
      );

      console.log(
        "Student saved successfully:",
        docRef.id
      );

      setSubmitted(true);

      alert(
        "Student details submitted successfully!"
      );

      /*
       * If you want the form to clear after submission,
       * uncomment this line:
       *
       * setFormData(initialFormData);
       */
    } catch (error) {
      console.error(
        "Firebase submission error:",
        error
      );

      setSubmitted(false);

      alert(
        "Unable to save student details. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const errorClass = (field) =>
    errors[field] ? "input-error" : "";

  return (
    <div className="student-page">

      {/* ================= HEADER ================= */}

      <header className="portal-header">

        <div className="brand">

          <div className="college-logo">
            CS
          </div>

          <div className="college-info">
            <h1>YOUR COLLEGE NAME</h1>

            <p>
              Department of Computer Science
            </p>
          </div>

        </div>

        <div className="academic-year">
          <span>Academic Year</span>

          <strong>
            2026 – 2027
          </strong>
        </div>

      </header>


      {/* ================= HERO ================= */}

      <section className="form-intro">

        <div className="hero-content">

          <span className="eyebrow">
            STUDENT PORTAL
          </span>

          <h2>
            Student Basic Details
          </h2>

          <p>
            Please provide your complete information
            for college records.
          </p>

        </div>

        <div className="course-badge">
          <span>YEAR</span>

          <strong>
            01
          </strong>
        </div>

      </section>


      {/* ================= COMPLETION ================= */}

      <section className="completion-wrapper">

        <div className="completion-top">

          <div className="completion-info">

            <div className="completion-heading">
              Profile Completion
            </div>

            <div className="completion-status">

              {completionPercentage === 100
                ? "All required details completed ✓"
                : `${totalFields - completedFields} ${
                    totalFields - completedFields === 1
                      ? "detail"
                      : "details"
                  } remaining`}

            </div>

          </div>

          <strong className="completion-percentage">
            {completionPercentage}%
          </strong>

        </div>

        <div className="progress-track">

          <div
            className={`progress-fill ${
              completionPercentage === 100
                ? "complete"
                : ""
            }`}
            style={{
              width: `${completionPercentage}%`,
            }}
          />

        </div>

        <div className="completion-bottom">

          <span>
            {completedFields} of {totalFields} completed
          </span>

          <span
            className={
              completionPercentage === 100
                ? "ready-text"
                : "waiting-text"
            }
          >
            {completionPercentage === 100
              ? "✓ Ready to submit"
              : "Required details remaining"}
          </span>

        </div>

      </section>


      {/* ================= FORM ================= */}

      <main className="form-wrapper">

        <form
          onSubmit={handleSubmit}
          noValidate
        >


          {/* ================= PERSONAL ================= */}

          <section className="form-block">

            <div className="block-heading">

              <div className="number">
                01
              </div>

              <div>
                <h3>
                  Personal Information
                </h3>

                <p>
                  Your basic personal details
                </p>
              </div>

            </div>


            <div className="input-grid">

              {/* FULL NAME */}

              <div className="input-group wide">

                <label>
                  Full Name <i>*</i>
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errorClass(
                    "fullName"
                  )}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />

                {errors.fullName && (
                  <small className="error-text">
                    {errors.fullName}
                  </small>
                )}

              </div>


              {/* DOB */}

              <div className="input-group">

                <label>
                  Date of Birth <i>*</i>
                </label>

                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={errorClass(
                    "dob"
                  )}
                />

                {errors.dob && (
                  <small className="error-text">
                    {errors.dob}
                  </small>
                )}

              </div>


              {/* GENDER */}

              <div className="input-group">

                <label>
                  Gender <i>*</i>
                </label>

                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={errorClass(
                    "gender"
                  )}
                >

                  <option value="">
                    Select gender
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

                {errors.gender && (
                  <small className="error-text">
                    {errors.gender}
                  </small>
                )}

              </div>


              {/* BLOOD GROUP */}

              <div className="input-group">

                <label>
                  Blood Group

                  <span className="optional">
                    Optional
                  </span>
                </label>

                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                >

                  <option value="">
                    Select blood group
                  </option>

                  <option value="A+">
                    A+
                  </option>

                  <option value="A-">
                    A-
                  </option>

                  <option value="B+">
                    B+
                  </option>

                  <option value="B-">
                    B-
                  </option>

                  <option value="O+">
                    O+
                  </option>

                  <option value="O-">
                    O-
                  </option>

                  <option value="AB+">
                    AB+
                  </option>

                  <option value="AB-">
                    AB-
                  </option>

                </select>

              </div>

            </div>

          </section>


          {/* ================= CONTACT ================= */}

          <section className="form-block">

            <div className="block-heading">

              <div className="number">
                02
              </div>

              <div>
                <h3>
                  Contact Information
                </h3>

                <p>
                  How we can contact you
                </p>
              </div>

            </div>


            <div className="input-grid">

              {/* STUDENT MOBILE */}

              <div className="input-group">

                <label>
                  Student Mobile Number <i>*</i>
                </label>

                <input
                  type="tel"
                  name="studentMobile"
                  value={formData.studentMobile}
                  onChange={handleChange}
                  className={errorClass(
                    "studentMobile"
                  )}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  maxLength="10"
                />

                {errors.studentMobile && (
                  <small className="error-text">
                    {errors.studentMobile}
                  </small>
                )}

              </div>


              {/* EMAIL */}

              <div className="input-group">

                <label>
                  Student Email ID <i>*</i>
                </label>

                <input
                  type="email"
                  name="studentEmail"
                  value={formData.studentEmail}
                  onChange={handleChange}
                  className={errorClass(
                    "studentEmail"
                  )}
                  placeholder="example@gmail.com"
                  autoComplete="email"
                />

                {errors.studentEmail && (
                  <small className="error-text">
                    {errors.studentEmail}
                  </small>
                )}

              </div>


              {/* ADDRESS */}

              <div className="input-group wide">

                <label>
                  Residential Address <i>*</i>
                </label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errorClass(
                    "address"
                  )}
                  placeholder="Enter your complete residential address"
                  rows="4"
                />

                {errors.address && (
                  <small className="error-text">
                    {errors.address}
                  </small>
                )}

              </div>


              {/* PINCODE */}

              <div className="input-group">

                <label>
                  Pincode <i>*</i>
                </label>

                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className={errorClass(
                    "pincode"
                  )}
                  placeholder="6 digit pincode"
                  inputMode="numeric"
                  maxLength="6"
                />

                {errors.pincode && (
                  <small className="error-text">
                    {errors.pincode}
                  </small>
                )}

              </div>

            </div>

          </section>


          {/* ================= PARENT ================= */}

          <section className="form-block">

            <div className="block-heading">

              <div className="number">
                03
              </div>

              <div>
                <h3>
                  Parent / Guardian
                </h3>

                <p>
                  Parent or guardian contact information
                </p>
              </div>

            </div>


            {/* PARENT REQUIREMENT */}

            <div
              className={`parent-notice ${
                parentMobileCompleted
                  ? "valid"
                  : ""
              } ${
                errors.parentMobile
                  ? "invalid"
                  : ""
              }`}
            >

              <span className="notice-icon">

                {parentMobileCompleted
                  ? "✓"
                  : "!"}

              </span>

              <div>

                <strong>
                  Parent / Guardian mobile number
                </strong>

                <p>
                  At least one parent or guardian
                  mobile number is required.
                </p>

                {errors.parentMobile && (
                  <small className="error-text">
                    {errors.parentMobile}
                  </small>
                )}

              </div>

            </div>


            <div className="input-grid">

              {/* FATHER NAME */}

              <div className="input-group">

                <label>
                  Father's Name <i>*</i>
                </label>

                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  className={errorClass(
                    "fatherName"
                  )}
                  placeholder="Father's name"
                />

                {errors.fatherName && (
                  <small className="error-text">
                    {errors.fatherName}
                  </small>
                )}

              </div>


              {/* FATHER MOBILE */}

              <div className="input-group">

                <label>
                  Father's Mobile Number
                </label>

                <input
                  type="tel"
                  name="fatherMobile"
                  value={formData.fatherMobile}
                  onChange={handleChange}
                  className={errorClass(
                    "fatherMobile"
                  )}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  maxLength="10"
                />

                {errors.fatherMobile && (
                  <small className="error-text">
                    {errors.fatherMobile}
                  </small>
                )}

              </div>


              {/* MOTHER NAME */}

              <div className="input-group">

                <label>
                  Mother's Name <i>*</i>
                </label>

                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  className={errorClass(
                    "motherName"
                  )}
                  placeholder="Mother's name"
                />

                {errors.motherName && (
                  <small className="error-text">
                    {errors.motherName}
                  </small>
                )}

              </div>


              {/* MOTHER MOBILE */}

              <div className="input-group">

                <label>
                  Mother's Mobile Number
                </label>

                <input
                  type="tel"
                  name="motherMobile"
                  value={formData.motherMobile}
                  onChange={handleChange}
                  className={errorClass(
                    "motherMobile"
                  )}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  maxLength="10"
                />

                {errors.motherMobile && (
                  <small className="error-text">
                    {errors.motherMobile}
                  </small>
                )}

              </div>


              {/* GUARDIAN NAME */}

              <div className="input-group">

                <label>
                  Guardian Name

                  <span className="optional">
                    If applicable
                  </span>
                </label>

                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Guardian name"
                />

              </div>


              {/* GUARDIAN MOBILE */}

              <div className="input-group">

                <label>
                  Guardian Mobile Number
                </label>

                <input
                  type="tel"
                  name="guardianMobile"
                  value={formData.guardianMobile}
                  onChange={handleChange}
                  className={errorClass(
                    "guardianMobile"
                  )}
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  maxLength="10"
                />

                {errors.guardianMobile && (
                  <small className="error-text">
                    {errors.guardianMobile}
                  </small>
                )}

              </div>

            </div>

          </section>


          {/* ================= COURSE ================= */}

          <section className="form-block">

            <div className="block-heading">

              <div className="number">
                04
              </div>

              <div>
                <h3>
                  Course Information
                </h3>

                <p>
                  Select your current programme
                </p>
              </div>

            </div>


            <div
              className={`course-options ${
                errors.course
                  ? "course-error"
                  : ""
              }`}
            >

              {/* CS */}

              <label
                className={`course-option ${
                  formData.course ===
                  "B.Sc. Computer Science"
                    ? "selected"
                    : ""
                }`}
              >

                <input
                  type="radio"
                  name="course"
                  value="B.Sc. Computer Science"
                  checked={
                    formData.course ===
                    "B.Sc. Computer Science"
                  }
                  onChange={handleChange}
                />

                <span className="radio-design"></span>

                <span className="course-text">

                  <strong>
                    B.Sc. Computer Science
                  </strong>

                  <small>
                    Computer Science
                  </small>

                </span>

              </label>


              {/* AI & DS */}

              <label
                className={`course-option ${
                  formData.course ===
                  "B.Sc. Artificial Intelligence & Data Science"
                    ? "selected"
                    : ""
                }`}
              >

                <input
                  type="radio"
                  name="course"
                  value="B.Sc. Artificial Intelligence & Data Science"
                  checked={
                    formData.course ===
                    "B.Sc. Artificial Intelligence & Data Science"
                  }
                  onChange={handleChange}
                />

                <span className="radio-design"></span>

                <span className="course-text">

                  <strong>
                    B.Sc. Artificial Intelligence
                    & Data Science
                  </strong>

                  <small>
                    Artificial Intelligence & Data Science
                  </small>

                </span>

              </label>

            </div>

            {errors.course && (
              <small className="error-text course-error-text">
                {errors.course}
              </small>
            )}

          </section>


          {/* ================= SUBMIT ================= */}

          <div className="submit-area">

            <div className="submit-info">

              <strong>
                {saving
                  ? "Saving your details..."
                  : completionPercentage === 100
                  ? "Everything is complete!"
                  : "Ready to submit?"}
              </strong>

              <p>
                {saving
                  ? "Please wait while we save your information."
                  : completionPercentage === 100
                  ? "Please review your details and submit."
                  : "Press Submit Details to see any missing information."}
              </p>

            </div>

            <button
              type="submit"
              className="submit-active"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Submit Details"}

              {!saving && (
                <span>→</span>
              )}
            </button>

          </div>


          {/* ================= SUCCESS ================= */}

          {submitted && (

            <div className="success-message">

              <span className="success-icon">
                ✓
              </span>

              <div>

                <strong>
                  Details submitted successfully
                </strong>

                <p>
                  Your student information has been
                  recorded successfully.
                </p>

              </div>

            </div>

          )}

        </form>

      </main>


      {/* ================= FOOTER ================= */}

      <footer className="student-footer">
        Student Information Portal • 2026–2027
      </footer>

    </div>
  );
}

export default StudentForm;