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
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

function getDepartmentTitles(departmentCode) {
  const code = String(departmentCode || "all").trim().toLowerCase();

  if (code === "aids") {
    return {
      departmentHeader: "DEPARTMENT OF ARTIFICIAL INTELLIGENCE & DATA SCIENCE",
      yearDegreeLine: "YEAR: I B.Sc. ARTIFICIAL INTELLIGENCE & DATA SCIENCE",
      fileNameDept: "AIDS",
    };
  }

  if (code === "cs") {
    return {
      departmentHeader: "DEPARTMENT OF COMPUTER SCIENCE",
      yearDegreeLine: "YEAR: I B.Sc. COMPUTER SCIENCE",
      fileNameDept: "CS",
    };
  }

  return {
    departmentHeader: "DEPARTMENT OF COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE",
    yearDegreeLine: "YEAR: I B.Sc. COMPUTER SCIENCE & ARTIFICIAL INTELLIGENCE & DATA SCIENCE",
    fileNameDept: "CS_AND_AIDS",
  };
}

// =========================================================
// 1. EXCEL EXPORT (.xlsx) — Clean Print-Optimized
// =========================================================
export async function exportToExcel({
  bannerUrl,
  students,
  departmentCode = "all",
  periodText,
  academicYear = "2026 - 2029",
  fileName = "Monthly_Attendance_Report.xlsx",
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Consolidated Attendance");
  const { departmentHeader, yearDegreeLine } = getDepartmentTitles(departmentCode);

  worksheet.columns = [
    { key: "sl", width: 8 },
    { key: "reg", width: 22 },
    { key: "name", width: 34 },
    { key: "conducted", width: 20 },
    { key: "attended", width: 18 },
    { key: "absent", width: 18 },
    { key: "percent", width: 22 },
  ];

  worksheet.getRow(1).height = 85;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 20;
  worksheet.getRow(4).height = 8;
  worksheet.getRow(5).height = 24;
  worksheet.getRow(6).height = 46;

  const base64Data = await loadImageAsBase64(bannerUrl);
  if (base64Data) {
    const ext = bannerUrl.toLowerCase().includes("png") ? "png" : "jpeg";
    const imageId = workbook.addImage({
      base64: base64Data,
      extension: ext,
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.05, row: 0.05 },
      br: { col: 6.95, row: 0.95 },
    });
  }

  // Row 2: Department Title
  worksheet.mergeCells("A2:G2");
  const row2 = worksheet.getCell("A2");
  row2.value = departmentHeader;
  row2.font = { name: "Times New Roman", size: 12, bold: true };
  row2.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Period
  worksheet.mergeCells("A3:G3");
  const row3 = worksheet.getCell("A3");
  row3.value = `CONSOLIDATED ATTENDANCE: ${periodText.toUpperCase()}`;
  row3.font = { name: "Times New Roman", size: 11, bold: true };
  row3.alignment = { horizontal: "center", vertical: "middle" };

  // Row 5: Exact Degree Line & Batch
  worksheet.mergeCells("A5:E5");
  const yearCell = worksheet.getCell("A5");
  yearCell.value = yearDegreeLine;
  yearCell.font = { name: "Times New Roman", size: 9.5, bold: true };
  yearCell.alignment = { horizontal: "left", vertical: "middle" };

  worksheet.mergeCells("F5:G5");
  const batchCell = worksheet.getCell("F5");
  batchCell.value = `ACADEMIC YEAR: ${academicYear}`;
  batchCell.font = { name: "Times New Roman", size: 9.5, bold: true };
  batchCell.alignment = { horizontal: "right", vertical: "middle" };

  // Row 6: Column Headers
  const headerRow = worksheet.getRow(6);
  headerRow.values = [
    "SL. NO",
    "REG NO",
    "STUDENT NAME",
    "TOTAL NO.OF. DAYS CONDUCTED",
    "TOTAL DAYS ATTENDED",
    "TOTAL DAYS ABSENT",
    "OVER ALL ATTENDANCE PERCENTAGE",
  ];
  headerRow.font = { name: "Times New Roman", size: 9.5, bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  for (let c = 1; c <= 7; c++) {
    headerRow.getCell(c).border = thinBorder;
    headerRow.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F4F8" },
    };
  }

  // Rows 7+: Student Rows (Clean white background, sharp text)
  students.forEach((item, index) => {
    const rowNumber = 7 + index;
    const conducted = item.workingDays || 0;
    const attended = item.presentDays || 0;
    const absent = item.absentDays || 0;
    const percentageVal = Number(item.percentage.toFixed(1));

    const row = worksheet.getRow(rowNumber);
    row.height = 20;
    row.values = [
      index + 1,
      item.student?.registerNumber || item.student?.regNo || item.student?.rollNo || item.registerNumber || "-",
      (item.student?.fullName || item.student?.name || item.fullName || "Student").toUpperCase(),
      conducted,
      attended,
      absent,
      percentageVal,
    ];

    row.font = { name: "Times New Roman", size: 10 };
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = thinBorder;
      row.getCell(c).alignment = {
        horizontal: c === 3 ? "left" : "center",
        vertical: "middle",
      };
    }

    const percentCell = row.getCell(7);
    if (percentageVal < 75) {
      // Crisp bold dark-red text without muddy pink box
      percentCell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FFB30000" } };
    } else if (percentageVal < 85) {
      percentCell.font = { name: "Times New Roman", size: 10, bold: true, color: { argb: "FF8A5000" } };
    }
  });

  // Signatures
  const lastRow = 6 + students.length;
  worksheet.getRow(lastRow + 1).height = 25;
  worksheet.getRow(lastRow + 2).height = 35; // Physical sign height

  const signTitleRow = lastRow + 3;
  worksheet.getRow(signTitleRow).height = 25;

  worksheet.mergeCells(`A${signTitleRow}:B${signTitleRow}`);
  worksheet.getCell(`A${signTitleRow}`).value = "CLASS INCHARGE";

  worksheet.mergeCells(`C${signTitleRow}:D${signTitleRow}`);
  worksheet.getCell(`C${signTitleRow}`).value = "HOD";

  worksheet.getCell(`E${signTitleRow}`).value = "VP";

  worksheet.mergeCells(`F${signTitleRow}:G${signTitleRow}`);
  worksheet.getCell(`F${signTitleRow}`).value = "PRINCIPAL";

  [`A${signTitleRow}`, `C${signTitleRow}`, `E${signTitleRow}`, `F${signTitleRow}`].forEach((coord) => {
    const cell = worksheet.getCell(coord);
    cell.font = { name: "Times New Roman", size: 10.5, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}

// =========================================================
// 2. PDF EXPORT (.pdf) — Pure White Cells, Sharp Typography
// =========================================================
export async function exportToPDF({
  bannerUrl,
  students,
  departmentCode = "all",
  periodText,
  academicYear = "2026 - 2029",
  fileName = "Monthly_Attendance_Report.pdf",
}) {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const base64Data = await loadImageAsBase64(bannerUrl);
  const { departmentHeader, yearDegreeLine } = getDepartmentTitles(departmentCode);

  let startY = 18;

  if (base64Data) {
    const bannerWidth = pageWidth - 40;
    const bannerHeight = 68;
    const imgFormat = bannerUrl.toLowerCase().includes("png") ? "PNG" : "JPEG";
    doc.addImage(base64Data, imgFormat, 20, startY, bannerWidth, bannerHeight);
    startY += bannerHeight + 14;
  }

  // Header Title
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.text(departmentHeader, pageWidth / 2, startY, { align: "center" });
  startY += 18;

  doc.setFontSize(10.5);
  doc.text(`CONSOLIDATED ATTENDANCE: ${periodText.toUpperCase()}`, pageWidth / 2, startY, { align: "center" });
  startY += 18;

  // Exact Degree line
  doc.setFontSize(8.5);
  doc.text(yearDegreeLine, 20, startY);
  doc.text(`ACADEMIC YEAR: ${academicYear}`, pageWidth - 20, startY, { align: "right" });
  startY += 10;

  const tableHead = [[
    "SL. NO",
    "REG NO",
    "STUDENT NAME",
    "TOTAL DAYS\nCONDUCTED",
    "TOTAL DAYS\nATTENDED",
    "TOTAL DAYS\nABSENT",
    "ATTENDANCE\nPERCENTAGE",
  ]];

  const tableBody = students.map((item, index) => [
    index + 1,
    item.student?.registerNumber || item.student?.regNo || "-",
    (item.student?.fullName || item.student?.name || "").toUpperCase(),
    item.workingDays || 0,
    item.presentDays || 0,
    item.absentDays || 0,
    `${item.percentage.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: startY + 5,
    margin: { left: 20, right: 20 },
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [242, 244, 248],
      textColor: [20, 30, 45],
      font: "times",
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      valign: "middle",
      lineColor: [180, 185, 195],
      lineWidth: 0.5,
    },
    bodyStyles: {
      font: "times",
      fontSize: 8,
      textColor: [25, 30, 40],
      fillColor: [255, 255, 255], // Clean white background for razor-sharp printing
      lineColor: [200, 205, 215],
      lineWidth: 0.5,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 35 },
      1: { halign: "center", cellWidth: 90 },
      2: { halign: "left" },
      3: { halign: "center", cellWidth: 65 },
      4: { halign: "center", cellWidth: 65 },
      5: { halign: "center", cellWidth: 65 },
      6: { halign: "center", cellWidth: 75 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const rawVal = parseFloat(data.cell.raw);
        if (!isNaN(rawVal)) {
          // Keep background pure white: no halftoning or muddy gray boxes on paper!
          data.cell.styles.fillColor = [255, 255, 255];
          if (rawVal < 75) {
            data.cell.styles.textColor = [165, 0, 0]; // High-contrast bold crimson
            data.cell.styles.fontStyle = "bold";
          } else if (rawVal < 85) {
            data.cell.styles.textColor = [145, 75, 0]; // High-contrast dark amber
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [25, 30, 40];
          }
        }
      }
    },
  });

  let finalY = doc.lastAutoTable.finalY + 50;
  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 55;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(9.5);
  doc.text("CLASS INCHARGE", 40, finalY);
  doc.text("HOD", pageWidth * 0.38, finalY);
  doc.text("VP", pageWidth * 0.68, finalY);
  doc.text("PRINCIPAL", pageWidth - 80, finalY);

  doc.save(fileName);
}

// =========================================================
// 3. WORD EXPORT (.docx) — Clean Print-Optimized
// =========================================================
export async function exportToWord({
  bannerUrl,
  students,
  departmentCode = "all",
  periodText,
  academicYear = "2026 - 2029",
  fileName = "Monthly_Attendance_Report.docx",
}) {
  const base64Data = await loadImageAsBase64(bannerUrl);
  const { departmentHeader, yearDegreeLine } = getDepartmentTitles(departmentCode);
  const children = [];

  if (base64Data) {
    const rawBase64 = base64Data.split(",")[1];
    const imageBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
        children: [
          new ImageRun({
            data: imageBytes,
            transformation: { width: 590, height: 110 },
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
          text: departmentHeader,
          bold: true,
          font: "Times New Roman",
          size: 21,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `CONSOLIDATED ATTENDANCE: ${periodText.toUpperCase()}`,
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
          text: `${yearDegreeLine}                                                ACADEMIC YEAR: ${academicYear}`,
          bold: true,
          font: "Times New Roman",
          size: 17,
        }),
      ],
    })
  );

  const headerTitles = [
    "SL. NO",
    "REG NO",
    "STUDENT NAME",
    "TOTAL DAYS CONDUCTED",
    "TOTAL DAYS ATTENDED",
    "TOTAL DAYS ABSENT",
    "OVER ALL %",
  ];

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headerTitles.map(
        (t) =>
          new TableCell({
            shading: { fill: "F0F4F8" },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: t, bold: true, size: 16, font: "Times New Roman" })],
              }),
            ],
          })
      ),
    }),
  ];

  students.forEach((item, index) => {
    const percentageVal = item.percentage;
    const isLow = percentageVal < 75;
    const isWarning = percentageVal >= 75 && percentageVal < 85;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(index + 1), size: 16, font: "Times New Roman" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.student?.registerNumber || item.student?.regNo || "-", size: 16, font: "Times New Roman" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: (item.student?.fullName || item.student?.name || "").toUpperCase(), size: 16, font: "Times New Roman" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.workingDays || 0), size: 16, font: "Times New Roman" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.presentDays || 0), size: 16, font: "Times New Roman" })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.absentDays || 0), size: 16, font: "Times New Roman" })] })] }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${percentageVal.toFixed(1)}%`,
                    bold: isLow || isWarning,
                    color: isLow ? "A80000" : isWarning ? "8A5000" : "000000",
                    size: 16,
                    font: "Times New Roman",
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
      spacing: { before: 800, after: 400 },
      alignment: AlignmentType.BOTH,
      children: [
        new TextRun({
          text: "CLASS INCHARGE                     HOD                                VP                             PRINCIPAL",
          bold: true,
          font: "Times New Roman",
          size: 19,
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