import { Link } from "react-router-dom";

import {
  Home as HomeIcon,
  CalendarCheck,
  FileText,
  GraduationCap,
  ArrowRight,
  Info,
} from "lucide-react";

import "./Home.css";

function Home() {
  return (
    <div className="student-home">

      {/* =====================================================
          NAVBAR
          ===================================================== */}

      <header className="student-navbar">

        {/* ================= BRAND ================= */}

        <div className="student-brand">

          <div className="student-logo">
            CS
          </div>

          <div className="student-brand-text">
            <h2>Student Portal</h2>

            <span>
              Raak Arts and Science College
            </span>
          </div>

        </div>


        {/* ================= DESKTOP NAV ================= */}

        <nav className="student-nav-links">

          {/* HOME */}

          <Link
            to="/"
            className="student-nav-link active"
          >
            <HomeIcon
              size={17}
              strokeWidth={2.2}
            />

            <span>
              Home
            </span>
          </Link>


          {/* ATTENDANCE */}

          <Link
            to="/ad"
            className="student-nav-link"
          >
            <CalendarCheck
              size={17}
              strokeWidth={2.2}
            />

            <span>
              Attendance Details
            </span>
          </Link>


          {/* EXAM MARKS */}

          <Link
            to="/marks"
            className="student-nav-link"
          >
            <FileText
              size={17}
              strokeWidth={2.2}
            />

            <span>
              Exam Marks
            </span>
          </Link>

        </nav>


        {/* ================= ACADEMIC YEAR ================= */}

        <div className="academic-year">
          2026 – 2027
        </div>

      </header>


      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="student-home-content">


        {/* ===================================================
            HERO
            =================================================== */}

        <section className="student-hero">

          <div className="hero-text">

            <span className="hero-label">
              STUDENT PORTAL
            </span>

            <h1>
              Welcome to your
              <br />

              <strong>
                Student Portal
              </strong>
            </h1>

            <p>
              View your attendance details and
              examination marks from one simple
              student portal.
            </p>

          </div>


          <div className="hero-icon">

            <div className="hero-circle">

              <GraduationCap
                size={64}
                strokeWidth={1.5}
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            STUDENT SERVICES
            =================================================== */}

        <section className="portal-section">

          <div className="section-title">

            <span>
              STUDENT SERVICES
            </span>

            <h2>
              What would you like to view?
            </h2>

          </div>


          <div className="portal-options">


            {/* =================================================
                ATTENDANCE
                ================================================= */}

            <Link
              to="/ad"
              className="portal-card attendance-card"
            >

              <div className="portal-card-icon">

                <CalendarCheck
                  size={27}
                  strokeWidth={1.9}
                />

              </div>


              <div className="portal-card-content">

                <span className="portal-number">
                  01
                </span>

                <h3>
                  Attendance Details
                </h3>

                <p>
                  Check your daily attendance,
                  working days, present days,
                  absent days and attendance
                  percentage.
                </p>


                <div className="portal-open">

                  <span>
                    View Attendance
                  </span>

                  <ArrowRight
                    size={17}
                    strokeWidth={2}
                  />

                </div>

              </div>

            </Link>


            {/* =================================================
                EXAM MARKS
                ================================================= */}

            <Link
              to="/marks"
              className="portal-card marks-card"
            >

              <div className="portal-card-icon">

                <FileText
                  size={27}
                  strokeWidth={1.9}
                />

              </div>


              <div className="portal-card-content">

                <span className="portal-number">
                  02
                </span>

                <h3>
                  Exam Marks
                </h3>

                <p>
                  View your examination marks,
                  subject-wise marks, results and
                  academic performance.
                </p>


                <div className="portal-open">

                  <span>
                    View Exam Marks
                  </span>

                  <ArrowRight
                    size={17}
                    strokeWidth={2}
                  />

                </div>

              </div>

            </Link>

          </div>

        </section>


        {/* ===================================================
            INFORMATION
            =================================================== */}

        <section className="student-notice">

          <div className="notice-icon">

            <Info
              size={17}
              strokeWidth={2.2}
            />

          </div>


          <div>

            <strong>
              Student Information
            </strong>

            <p>
              Use the navigation above to access
              your attendance details and
              examination marks.
            </p>

          </div>

        </section>


        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="student-footer">

          <span>
            Raak Arts and Science College
          </span>

          <span>
            Department of Computer Science
          </span>

        </footer>

      </main>


      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
          ===================================================== */}

      <nav className="mobile-nav">

        {/* HOME */}

        <Link
          to="/"
          className="mobile-nav-link active"
        >

          <HomeIcon
            size={20}
            strokeWidth={2}
          />

          <small>
            Home
          </small>

        </Link>


        {/* ATTENDANCE */}

        <Link
          to="/ad"
          className="mobile-nav-link"
        >

          <CalendarCheck
            size={20}
            strokeWidth={2}
          />

          <small>
            Attendance
          </small>

        </Link>


        {/* MARKS */}

        <Link
          to="/marks"
          className="mobile-nav-link"
        >

          <FileText
            size={20}
            strokeWidth={2}
          />

          <small>
            Marks
          </small>

        </Link>

      </nav>

    </div>
  );
}

export default Home;