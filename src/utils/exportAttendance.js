import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
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
  AlignmentType,
  ImageRun,
} from "docx";
import { saveAs } from "file-saver";

export async function loadImageAsBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not load banner image:", err);
    return null;
  }
}

const thinBorder = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

function resolveDeptCode(item) {
  const raw = String(
    item.dep ||
      item.department ||
      item.student?.department ||
      item.student?.course ||
      item.course ||
      ""
  ).toLowerCase();

  if (raw.includes("ai") || raw.includes("data") || raw === "aids") {
    return "aids";
  }
  return "cs";
}

function getPeriodDisplayString(periodText) {
  if (!periodText) return "JUNE TO SEPTEMBER  2026";
  return periodText
    .replace(/^CONSOLIDATED ATTENDANCE\s*[:-]?\s*/i, "")
    .trim()
    .toUpperCase();
}

/**
 * Builds a single department sheet with authentic A4 print setup & red highlight labels
 */
function buildExcelDepartmentSheet(
  workbook,
  imageId,
  sheetTitle,
  deptCode,
  sheetStudents,
  periodText,
  academicYear
) {
  const ws = workbook.addWorksheet(sheetTitle, {
    views: [{ showGridLines: true }],
  });

  // Safe ExcelJS A4 Page Setup
  ws.pageSetup = {
    paperSize: 9, // 9 = A4 format
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1, // Fit all 7 columns into 1 page width
    fitToHeight: 0, // Auto flow rows vertically across pages
    horizontalCentered: true,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  // Exact column widths tuned for A4 page width
  ws.columns = [
    { key: "sl", width: 7.5 },
    { key: "reg", width: 18 },
    { key: "name", width: 28 },
    { key: "conducted", width: 13.5 },
    { key: "attended", width: 13.5 },
    { key: "absent", width: 11.5 },
    { key: "pct", width: 15 },
  ];

  // Row 1: Header Banner (Height: 51.75pt, Merged A1:G1)
  ws.getRow(1).height = 51.75;
  ws.mergeCells("A1:G1");
  if (imageId !== null) {
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      br: { col: 7, row: 1 },
      editAs: "oneCell",
    });
  }

  // Row 2: Department Title (Height: 18.75pt)
  ws.mergeCells("A2:G2");
  const r2 = ws.getCell("A2");
  r2.value = "DEPARTMENT OF COMPUTER SCIENCE AND AIDS";
  r2.font = { name: "Times New Roman", size: 14, bold: true };
  r2.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(2).height = 18.75;

  // Row 3: Consolidated Period Subtitle
  ws.mergeCells("A3:G3");
  const r3 = ws.getCell("A3");
  r3.value = `CONSOLIDATED ATTENDANCE - ${getPeriodDisplayString(periodText)}`;
  r3.font = { name: "Times New Roman", size: 12, bold: true };
  r3.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  ws.getRow(3).height = 18;

  // Row 4: Spacer row
  ws.mergeCells("A4:G4");
  ws.getRow(4).height = 15.75;

  // Row 5: Degree & Academic Year line (Full merged row A5:G5)
  ws.mergeCells("A5:G5");
  const r5 = ws.getCell("A5");
  const degreeStr = deptCode === "aids" ? "I B.Sc. AIDS" : "I B.Sc. CS";
  const batchStr = String(academicYear || "2026-2029").replace(/\s+/g, "");
  r5.value = `YEAR: ${degreeStr}                                                                                     ACADEMIC YEAR:${batchStr}`;
  r5.font = { name: "Times New Roman", size: 12, bold: true };
  r5.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  ws.getRow(5).height = 15.75;

  // Row 6: Main Table Headers (Height: 78.75pt)
  const headerRow = ws.getRow(6);
  headerRow.height = 78.75;
  headerRow.values = [
    "SL. NO",
    "REG NO",
    "STUDENT NAME",
    "TOTAL NO.OF. DAYS CONDUCTED",
    "TOTAL DAYS ATTENDED",
    "TOTAL DAYS ABSENT",
    "OVER ALL ATTENDANCE PERCENTAGE",
  ];

  for (let c = 1; c <= 7; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: "Times New Roman", size: 12, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
  }

  // Row 7+: Data Rows
  let currentRowIndex = 7;
  sheetStudents.forEach((item, index) => {
    const s = item.student || item;
    const regNo =
      s.registerNumber ||
      s.regNo ||
      s.registerNo ||
      s.rollNo ||
      s.register_number ||
      "-";
    const studentName = (
      s.fullName ||
      s.name ||
      s.studentName ||
      "UNNAMED STUDENT"
    ).toUpperCase();

    const conducted = Number(item.workingDays) || 0;
    const attended = Number(item.presentDays) || 0;
    const absent = Number(item.absentDays) || 0;
    const percentage = conducted > 0 ? parseFloat(item.percentage.toFixed(1)) : 0;

    const row = ws.getRow(currentRowIndex);
    row.height = 16.5;
    row.values = [
      index + 1,
      regNo,
      studentName,
      conducted,
      attended,
      absent,
      percentage,
    ];

    // Style standard columns 1 to 6
    for (let c = 1; c <= 6; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Times New Roman", size: 12, bold: false };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: c === 3 ? "left" : "center",
        vertical: "middle",
      };
    }

    // Cell 7: Percentage styling matching your sample image[cite: 1]
    const pctCell = row.getCell(7);
    pctCell.border = thinBorder;
    pctCell.alignment = { horizontal: "center", vertical: "middle" };

    if (percentage < 75) {
      // Light red/pink fill with dark bold red text[cite: 1]
      pctCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
      pctCell.font = {
        name: "Times New Roman",
        size: 12,
        bold: true,
        color: { argb: "FF9C0006" },
      };
    } else if (percentage < 85) {
      // Dark amber / brown text for warning range[cite: 1]
      pctCell.font = {
        name: "Times New Roman",
        size: 12,
        bold: true,
        color: { argb: "FF8A5000" },
      };
    } else {
      // Standard black font[cite: 1]
      pctCell.font = {
        name: "Times New Roman",
        size: 12,
        bold: false,
        color: { argb: "FF000000" },
      };
    }

    currentRowIndex++;
  });

  // Exactly 2 blank rows before the signature row
  const sigRowIdx = currentRowIndex + 2;
  ws.getRow(sigRowIdx).height = 22;

  // CLASS INCHARGE (A:B merged)
  ws.mergeCells(`A${sigRowIdx}:B${sigRowIdx}`);
  const rIncharge = ws.getCell(`A${sigRowIdx}`);
  rIncharge.value = "CLASS INCHARGE";
  rIncharge.font = { name: "Times New Roman", size: 11, bold: true };
  rIncharge.alignment = { horizontal: "center", vertical: "middle" };

  // HOD (Col C)
  const rHod = ws.getCell(`C${sigRowIdx}`);
  rHod.value = "HOD";
  rHod.font = { name: "Times New Roman", size: 12, bold: true };
  rHod.alignment = { horizontal: "center", vertical: "middle" };

  // VP (Col D)
  const rVp = ws.getCell(`D${sigRowIdx}`);
  rVp.value = "VP";
  rVp.font = { name: "Times New Roman", size: 12, bold: true };
  rVp.alignment = { horizontal: "center", vertical: "middle" };

  // PRINCIPAL (F:G merged)
  ws.mergeCells(`F${sigRowIdx}:G${sigRowIdx}`);
  const rPrincipal = ws.getCell(`F${sigRowIdx}`);
  rPrincipal.value = "PRINCIPAL";
  rPrincipal.font = { name: "Times New Roman", size: 12, bold: true };
  rPrincipal.alignment = { horizontal: "center", vertical: "middle" };
}

// =========================================================
// 1. EXCEL EXPORT (.xlsx)
// =========================================================
export async function exportToExcel({
  bannerUrl,
  students = [],
  departmentCode = "all",
  periodText = "",
  academicYear = "2026-2029",
  fileName = "ATTENDANCE_MARK.xlsx",
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RAAK Arts and Science College";
  workbook.created = new Date();

  let imageId = null;
  const base64Data = await loadImageAsBase64(bannerUrl);
  if (base64Data) {
    const rawBase64 = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;
    const ext = bannerUrl.toLowerCase().includes("png") ? "png" : "jpeg";
    imageId = workbook.addImage({
      base64: rawBase64,
      extension: ext,
    });
  }

  // If 'all', split into AIDS and CS tabs matching template
  if (departmentCode === "all") {
    const aidsStudents = students.filter((s) => resolveDeptCode(s) === "aids");
    const csStudents = students.filter((s) => resolveDeptCode(s) === "cs");

    buildExcelDepartmentSheet(
      workbook,
      imageId,
      "AIDS",
      "aids",
      aidsStudents,
      periodText,
      academicYear
    );

    buildExcelDepartmentSheet(
      workbook,
      imageId,
      "CS",
      "cs",
      csStudents,
      periodText,
      academicYear
    );
  } else {
    const sheetName = departmentCode === "aids" ? "AIDS" : "CS";
    buildExcelDepartmentSheet(
      workbook,
      imageId,
      sheetName,
      departmentCode,
      students,
      periodText,
      academicYear
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName || "ATTENDANCE_MARK.xlsx"
  );
}

// =========================================================
// 2. PDF EXPORT (.pdf)
// =========================================================
export async function exportToPDF({
  bannerUrl,
  students = [],
  departmentCode = "all",
  periodText = "",
  academicYear = "2026-2029",
  fileName = "Monthly_Attendance_Report.pdf",
}) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const base64Data = await loadImageAsBase64(bannerUrl);

  const deptTitle = "DEPARTMENT OF COMPUTER SCIENCE AND AIDS";
  const degreeStr =
    departmentCode === "aids"
      ? "I B.Sc. ARTIFICIAL INTELLIGENCE & DATA SCIENCE"
      : departmentCode === "cs"
      ? "I B.Sc. COMPUTER SCIENCE"
      : "I B.Sc. COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE";

  let startY = 18;

  if (base64Data) {
    const bannerWidth = pageWidth - 40;
    const bannerHeight = 55;
    const imgFormat = bannerUrl.toLowerCase().includes("png") ? "PNG" : "JPEG";
    doc.addImage(base64Data, imgFormat, 20, startY, bannerWidth, bannerHeight);
    startY += bannerHeight + 14;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(deptTitle, pageWidth / 2, startY, { align: "center" });
  startY += 16;

  doc.setFontSize(10.5);
  doc.text(
    `CONSOLIDATED ATTENDANCE - ${getPeriodDisplayString(periodText)}`,
    pageWidth / 2,
    startY,
    { align: "center" }
  );
  startY += 16;

  doc.setFontSize(9);
  doc.text(`YEAR: ${degreeStr}`, 20, startY);
  doc.text(`ACADEMIC YEAR: ${academicYear}`, pageWidth - 20, startY, {
    align: "right",
  });
  startY += 10;

  const tableHead = [
    [
      "SL. NO",
      "REG NO",
      "STUDENT NAME",
      "TOTAL DAYS\nCONDUCTED",
      "TOTAL DAYS\nATTENDED",
      "TOTAL DAYS\nABSENT",
      "OVER ALL\nPERCENTAGE",
    ],
  ];

  const tableBody = students.map((item, index) => {
    const s = item.student || item;
    return [
      index + 1,
      s.registerNumber || s.regNo || "-",
      (s.fullName || s.name || "").toUpperCase(),
      item.workingDays || 0,
      item.presentDays || 0,
      item.absentDays || 0,
      `${(item.percentage || 0).toFixed(1)}`,
    ];
  });

  autoTable(doc, {
    startY: startY + 5,
    margin: { left: 20, right: 20 },
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      font: "times",
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    bodyStyles: {
      font: "times",
      fontSize: 8.5,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 35 },
      1: { halign: "center", cellWidth: 85 },
      2: { halign: "left" },
      3: { halign: "center", cellWidth: 65 },
      4: { halign: "center", cellWidth: 65 },
      5: { halign: "center", cellWidth: 65 },
      6: { halign: "center", cellWidth: 70 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const rawVal = parseFloat(data.cell.raw);
        if (!isNaN(rawVal)) {
          if (rawVal < 75) {
            data.cell.styles.fillColor = [255, 199, 206];
            data.cell.styles.textColor = [156, 0, 6];
            data.cell.styles.fontStyle = "bold";
          } else if (rawVal < 85) {
            data.cell.styles.textColor = [138, 80, 0];
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
  });

  let finalY = doc.lastAutoTable.finalY + 45;
  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 55;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text("CLASS INCHARGE", 40, finalY);
  doc.text("HOD", pageWidth * 0.38, finalY);
  doc.text("VP", pageWidth * 0.65, finalY);
  doc.text("PRINCIPAL", pageWidth - 80, finalY);

  doc.save(fileName);
}

// =========================================================
// 3. WORD EXPORT (.docx)
// =========================================================
export async function exportToWord({
  bannerUrl,
  students = [],
  departmentCode = "all",
  periodText = "",
  academicYear = "2026-2029",
  fileName = "Monthly_Attendance_Report.docx",
}) {
  const base64Data = await loadImageAsBase64(bannerUrl);
  const children = [];

  const deptTitle = "DEPARTMENT OF COMPUTER SCIENCE AND AIDS";
  const degreeStr =
    departmentCode === "aids"
      ? "I B.Sc. ARTIFICIAL INTELLIGENCE & DATA SCIENCE"
      : departmentCode === "cs"
      ? "I B.Sc. COMPUTER SCIENCE"
      : "I B.Sc. COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE";

  if (base64Data) {
    const rawBase64 = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;
    const imageBytes = Uint8Array.from(atob(rawBase64), (c) =>
      c.charCodeAt(0)
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: imageBytes,
            transformation: { width: 590, height: 85 },
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: deptTitle,
          bold: true,
          font: "Times New Roman",
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `CONSOLIDATED ATTENDANCE - ${getPeriodDisplayString(periodText)}`,
          bold: true,
          font: "Times New Roman",
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: `YEAR: ${degreeStr}                                                                   ACADEMIC YEAR: ${academicYear}`,
          bold: true,
          font: "Times New Roman",
          size: 18,
        }),
      ],
    })
  );

  const headerTitles = [
    "SL. NO",
    "REG NO",
    "STUDENT NAME",
    "TOTAL NO.OF. DAYS CONDUCTED",
    "TOTAL DAYS ATTENDED",
    "TOTAL DAYS ABSENT",
    "OVER ALL ATTENDANCE PERCENTAGE",
  ];

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headerTitles.map(
        (t) =>
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: t,
                    bold: true,
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          })
      ),
    }),
  ];

  students.forEach((item, index) => {
    const s = item.student || item;
    const conducted = item.workingDays || 0;
    const attended = item.presentDays || 0;
    const absent = item.absentDays || 0;
    const pctVal = conducted > 0 ? item.percentage : 0;
    const pctStr = conducted > 0 ? item.percentage.toFixed(1) : "0.0";
    const isLow = pctVal < 75;
    const isWarning = pctVal >= 75 && pctVal < 85;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(index + 1),
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: s.registerNumber || s.regNo || "-",
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: (s.fullName || s.name || "").toUpperCase(),
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(conducted),
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(attended),
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(absent),
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: isLow ? { fill: "FFC7CE" } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: pctStr,
                    size: 16,
                    font: "Times New Roman",
                    bold: isLow || isWarning,
                    color: isLow ? "9C0006" : isWarning ? "8A5000" : "000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 800, after: 300 },
      alignment: AlignmentType.BOTH,
      children: [
        new TextRun({
          text: "CLASS INCHARGE                     HOD                            VP                             PRINCIPAL",
          bold: true,
          font: "Times New Roman",
          size: 18,
        }),
      ],
    })
  );

  const docxDocument = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(docxDocument);
  saveAs(blob, fileName);
}