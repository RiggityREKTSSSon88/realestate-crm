import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadPDF(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(16);
  doc.setTextColor(15, 41, 66); // navy-800
  doc.text(title, 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`EstateIQ · Generated ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((r) => r.map((v) => (v == null ? "" : String(v)))),
    headStyles: {
      fillColor: [15, 41, 66],
      textColor: 255,
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8, textColor: 50 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}
