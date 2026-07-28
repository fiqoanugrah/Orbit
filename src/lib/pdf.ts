type PdfTextOptions = {
  align?: "left" | "right";
  color?: string;
  font?: "bold" | "regular";
  size?: number;
};

type PdfLineItem = {
  code: string;
  description: string;
  quantity: number;
  total: string;
  unit: string;
  unitPrice: string;
};

type PdfInvoicePayment = {
  amount: string;
  date: string;
  method: string;
  reference: string;
  status: string;
};

export type PdfInvoiceData = {
  adjustmentAmount: string;
  balance: string;
  dueAt: string;
  invoiceNumber: string;
  issuedAt: string;
  lines: PdfLineItem[];
  organization: {
    address: string;
    email: string;
    logo: PdfImageData | null;
    name: string;
    phone: string;
  };
  paid: string;
  payments: PdfInvoicePayment[];
  student: {
    alternateName: string;
    code: string;
    level: string;
    name: string;
    parent: string;
  };
  status: string;
  subtotal: string;
  total: string;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const regularFont = "F1";
const boldFont = "F2";

export type PdfImageData = {
  data: Buffer;
  height: number;
  width: number;
};

function sanitizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return sanitizeText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function textWidth(value: string, size: number) {
  return sanitizeText(value).length * size * 0.52;
}

function wrapText(value: string, maxWidth: number, size: number) {
  const words = sanitizeText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (textWidth(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) {
        lines.push(line);
      }
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [""];
}

class PdfDocument {
  private commands: string[] = [];

  rect(x: number, y: number, width: number, height: number, color: string) {
    this.commands.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  }

  strokeRect(x: number, y: number, width: number, height: number, color: string) {
    this.commands.push(`${color} RG ${x} ${y} ${width} ${height} re S`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color = "0 0 0") {
    this.commands.push(`${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  image(x: number, y: number, width: number, height: number) {
    this.commands.push(`q ${width} 0 0 ${height} ${x} ${y} cm /Im1 Do Q`);
  }

  text(value: string, x: number, y: number, options: PdfTextOptions = {}) {
    const size = options.size ?? 10;
    const font = options.font === "bold" ? boldFont : regularFont;
    const color = options.color ?? "0 0 0";
    const resolvedX =
      options.align === "right" ? x - textWidth(value, size) : x;
    const safeText = escapePdfText(value);

    this.commands.push(
      `${color} rg BT /${font} ${size} Tf ${resolvedX.toFixed(2)} ${y.toFixed(2)} Td (${safeText}) Tj ET`,
    );
  }

  output() {
    return this.commands.join("\n");
  }
}

function buildPdf(content: string, logo: PdfImageData | null) {
  const imageObjectNumber = logo ? 7 : null;
  const imageResource = imageObjectNumber
    ? ` /XObject << /Im1 ${imageObjectNumber} 0 R >>`
    : "";
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>\n", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n", "ascii"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /${regularFont} 4 0 R /${boldFont} 5 0 R >>${imageResource} >> /Contents 6 0 R >>\n`,
      "ascii",
    ),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n", "ascii"),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n",
      "ascii",
    ),
    Buffer.from(
      `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream\n`,
      "ascii",
    ),
  ];

  if (logo) {
    objects.push(
      Buffer.concat([
        Buffer.from(
          `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n`,
          "ascii",
        ),
        logo.data,
        Buffer.from("\nendstream\n", "ascii"),
      ]),
    );
  }

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "ascii")];
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`, "ascii"));
    chunks.push(object);
    chunks.push(Buffer.from("endobj\n", "ascii"));
  });

  const xrefOffset = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n`, "ascii"));
  chunks.push(Buffer.from("0000000000 65535 f \n", "ascii"));
  offsets.slice(1).forEach((offset) => {
    chunks.push(Buffer.from(`${String(offset).padStart(10, "0")} 00000 n \n`, "ascii"));
  });
  chunks.push(Buffer.from(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
    "ascii",
  ));

  return Buffer.concat(chunks);
}

export function createJpegPdfImage(data: Buffer): PdfImageData | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = data[offset + 1];
    const blockLength = data.readUInt16BE(offset + 2);

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      return {
        data,
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + blockLength;
  }

  return null;
}

export function createInvoicePdf(data: PdfInvoiceData) {
  const pdf = new PdfDocument();
  const left = 44;
  const right = pageWidth - 44;
  let y = pageHeight - 42;

  if (data.organization.logo) {
    const ratio = data.organization.logo.width / data.organization.logo.height;
    const boxSize = 54;
    const imageWidth = ratio >= 1 ? boxSize : boxSize * ratio;
    const imageHeight = ratio >= 1 ? boxSize / ratio : boxSize;
    pdf.image(
      left + (boxSize - imageWidth) / 2,
      y - 65 + (boxSize - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  } else {
    pdf.strokeRect(left, y - 65, 54, 54, "0.80 0.80 0.80");
    pdf.text("ORBIT", left + 27, y - 43, {
      align: "right",
      color: "0.05 0.16 0.35",
      font: "bold",
      size: 13,
    });
  }
  pdf.text(data.organization.name || "Orbit", left + 64, y - 15, {
    font: "bold",
    size: 19,
  });
  wrapText(data.organization.address || "-", 315, 9.5)
    .slice(0, 2)
    .forEach((line, index) => {
      pdf.text(line, left + 64, y - 32 - index * 13, {
        size: 9.5,
      });
    });
  pdf.text(
    `TEL : ${data.organization.phone || "-"}, EMAIL : ${data.organization.email || "-"}`,
    left + 64,
    y - 60,
    { size: 9.5 },
  );
  pdf.text("Invoice", right, y - 38, {
    align: "right",
    color: "0.02 0.45 0.12",
    font: "bold",
    size: 27,
  });
  pdf.line(left, y - 88, right, y - 88);

  y -= 110;
  const detailRows = [
    ["Student Code", data.student.code],
    ["Student Name", data.student.name],
    ["Alternate Name", data.student.alternateName],
    ["Student Level", data.student.level],
  ];
  const invoiceRows = [
    ["Invoice No", data.invoiceNumber],
    ["Invoice Date", data.issuedAt],
    ["Agent Name", ""],
    ["Parent Name", data.student.parent],
  ];

  detailRows.forEach(([label, value], index) => {
    const rowY = y - index * 18;
    pdf.text(label, left, rowY, { size: 10.5 });
    pdf.text(":", left + 74, rowY, { size: 10.5 });
    pdf.text(value || "-", left + 84, rowY, {
      font: index === 1 ? "bold" : "regular",
      size: 10.5,
    });
  });
  invoiceRows.forEach(([label, value], index) => {
    const rowY = y - index * 18;
    pdf.text(label, 340, rowY, { size: 10.5 });
    pdf.text(":", 402, rowY, { size: 10.5 });
    pdf.text(value || "-", 412, rowY, {
      font: index === 0 ? "bold" : "regular",
      size: 10.5,
    });
  });

  y -= 70;
  const tableWidth = right - left;
  pdf.rect(left, y - 16, tableWidth, 22, "0.94 0.94 0.94");
  pdf.strokeRect(left, y - 16, tableWidth, 22, "0 0 0");
  pdf.text("No", left + 6, y - 8, { font: "bold", size: 10.5 });
  pdf.text("Code", left + 28, y - 8, { font: "bold", size: 10.5 });
  pdf.text("Item", left + 118, y - 8, { font: "bold", size: 10.5 });
  pdf.text("Qty", left + 315, y - 8, { font: "bold", size: 10.5 });
  pdf.text("Unit", left + 338, y - 8, { font: "bold", size: 10.5 });
  pdf.text("Unit Price", left + 426, y - 8, {
    align: "right",
    font: "bold",
    size: 10.5,
  });
  pdf.text("Sub Total", right - 6, y - 8, {
    align: "right",
    font: "bold",
    size: 10.5,
  });

  y -= 34;
  data.lines.forEach((line, index) => {
    const wrappedDescription = wrapText(line.description, 210, 10.5).slice(0, 4);
    pdf.text(String(index + 1), left + 14, y, { size: 10.5 });
    pdf.text(line.code || "-", left + 28, y, { size: 10.5 });
    wrappedDescription.forEach((text, lineIndex) => {
      pdf.text(text, left + 118, y - lineIndex * 14, { size: 10.5 });
    });
    pdf.text(String(line.quantity), left + 316, y, {
      align: "right",
      size: 10.5,
    });
    pdf.text(line.unit || "term", left + 338, y, { size: 10.5 });
    pdf.text(line.unitPrice.replace(/^Rp\s?/, ""), left + 426, y, {
      align: "right",
      size: 10.5,
    });
    pdf.text(line.total.replace(/^Rp\s?/, ""), right - 6, y, {
      align: "right",
      size: 10.5,
    });
    y -= Math.max(54, wrappedDescription.length * 14 + 12);
  });

  const totalLeft = 385;
  const totalRight = right - 4;
  pdf.line(totalLeft, y + 18, totalRight, y + 18);
  pdf.text("Total (IDR) :", totalLeft + 76, y + 4, {
    align: "right",
    font: "bold",
    size: 10.5,
  });
  pdf.text(data.total.replace(/^Rp\s?/, ""), totalRight, y + 4, {
    align: "right",
    font: "bold",
    size: 10.5,
  });
  pdf.line(totalLeft, y - 10, totalRight, y - 10);

  if (data.paid !== "Rp 0") {
    y -= 30;
    pdf.text(`Paid: ${data.paid}`, totalRight, y, {
      align: "right",
      size: 10,
    });
    y -= 15;
    pdf.text(`Balance: ${data.balance}`, totalRight, y, {
      align: "right",
      font: "bold",
      size: 10,
    });
  }

  pdf.text("Description:", left, 128, { font: "bold", size: 10.5 });
  pdf.strokeRect(left, 42, 430, 72, "0 0 0");
  wrapText(
    "This document is system-generated and does not require a signature. For any questions, please contact our support team.",
    400,
    10,
  ).forEach((line, index) => {
    pdf.text(line, left + 9, 94 - index * 14, { size: 10 });
  });

  pdf.text("Page", left, 24, { size: 10.5 });
  pdf.text(":", left + 32, 24, { size: 10.5 });
  pdf.text("1 / 1", left + 42, 24, { size: 10.5 });
  pdf.text("Powered by Orbit", right - 4, 24, {
    align: "right",
    font: "bold",
    size: 10.5,
  });

  return buildPdf(pdf.output(), data.organization.logo);
}
