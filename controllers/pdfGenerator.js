const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const SVGtoPDF = require("svg-to-pdfkit");

class PDFGenerator {
  static generatePaymentConfirmation(req, res) {
    try {
      // Read the invoice tracker file
      const trackerPath = path.join(
        __dirname,
        "../public/invoide_tracker.json"
      );
      let trackerData = JSON.parse(fs.readFileSync(trackerPath, "utf8"));

      // Get last invoice number and increment it
      const lastInvoice = trackerData[trackerData.length - 1];
      const nextInvoiceNumber = (
        parseInt(lastInvoice.invoiceNumber) + 1
      ).toString();

      // Create new invoice data
      const newInvoiceData = {
        ...req.body,
        invoiceNumber: nextInvoiceNumber,
        paymentDate: new Date().toISOString().split("T")[0],
      };

      // Add to tracker
      trackerData.push(newInvoiceData);

      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");

      // Pipe the PDF to the response
      doc.pipe(res);

      // Add content to the PDF using request body data and new invoice number
      this.addHeader(doc, nextInvoiceNumber);
      this.addBillingInfo(doc, req.body);
      this.addItemsTableWithSummary(doc, req.body);
      this.addFooter(doc);

      // Save updated tracker data
      fs.writeFileSync(trackerPath, JSON.stringify(trackerData, null, 2));

      // Finalize the PDF
      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({
        error: "Failed to generate PDF",
        message: error.message,
      });
    }
}

  static addHeader(doc, invoiceNumber) {
    // Add header text
    doc.fontSize(48).font("Helvetica-Bold").text("INVOICE", 50, 50);

    // Add StrikeRealty company name in red at the top right
    doc
      .fontSize(30)
      .fillColor("#b01e23") // Red color matching the original SVG
      .text("StrikeRealty", 350, 50); // x: 400 pixels from left, y: 50 pixels from top

    // Add company address under StrikeRealty
    doc
      .fontSize(10)
      .text("13831 SW 50th St", 400, 85)
      .text("Suite 201 Miami, FL 33183", 400, 100)
      .text("(305) 330-2305", 400, 115);

    // Add invoice details below INVOICE
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .text("INVOICE", 50, 100)
      .fillColor("#000000")
      .text(`#${invoiceNumber}`, 120, 100);

    doc
      .fontSize(12)
      .text("DATE:", 50, 120)
      .text(
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        }),
        120,
        120
      );
  }

  static addBillingInfo(doc, data) {
    const startY = 160;
    const tableLeft = 50;
    const tableWidth = 500;
    const columnWidth = 250;

    // Add header row with red background
    doc.fillColor("#B01E23").rect(tableLeft, startY, tableWidth, 25).fill();

    // Add header text in white
    doc
      .fillColor("#FFFFFF")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("BILL FROM", tableLeft + 10, startY + 7)
      .text("BILL TO", tableLeft + columnWidth + 10, startY + 7);

    // Add content row
    const contentY = startY + 25;
    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica")
      .text(
        "Strike Realty LLC\n13831 SW 59th St\nMiami, FL 33183\n(305) 330-2305",
        tableLeft + 10,
        contentY + 7
      )
      .text(data.customerName, tableLeft + columnWidth + 10, contentY + 7);

    // Draw table borders
    doc.strokeColor("#000000").lineWidth(1);

    // Outer borders
    doc
      .moveTo(tableLeft, startY)
      .lineTo(tableLeft + tableWidth, startY)
      .lineTo(tableLeft + tableWidth, contentY + 60)
      .lineTo(tableLeft, contentY + 60)
      .lineTo(tableLeft, startY)
      .stroke();

    // Middle vertical line
    doc
      .moveTo(tableLeft + columnWidth, startY)
      .lineTo(tableLeft + columnWidth, contentY + 60)
      .stroke();

    // Horizontal line after header
    doc
      .moveTo(tableLeft, startY + 25)
      .lineTo(tableLeft + tableWidth, startY + 25)
      .stroke();
  }

  static formatNumber(number) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  static addItemsTableWithSummary(doc, data) {
    const startY = 310;
    const tableLeft = 50;
    const tableWidth = 500;
    const descriptionWidth = 380;
    const costWidth = 120;

    // Add header
    doc.fillColor("#B01E23").rect(tableLeft, startY, tableWidth, 25).fill();

    doc
      .fillColor("#FFFFFF")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("DESCRIPTION", tableLeft + 10, startY + 7)
      .text("COST", tableLeft + descriptionWidth + 25, startY + 7);

    let currentY = startY + 25;

    // Add items
    data.items.forEach((item) => {
      // Draw row border
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(tableLeft, currentY)
        .lineTo(tableLeft + tableWidth, currentY)
        .stroke();

      // Add item content
      doc
        .fillColor("#000000")
        .fontSize(10)
        .font("Helvetica")
        .text(item.description, tableLeft + 10, currentY + 7)
        .text(
          `$${this.formatNumber(item.cost)}`,
          tableLeft + descriptionWidth + 10,
          currentY + 7,
          {
            width: costWidth - 20,
            align: "right",
          }
        );

      currentY += 25;
    });

    // Add summary rows
    const summaryData = [
      {
        label: "GROSS AMOUNT",
        value: data.grossAmount,
        align: "right",
        isRed: false,
        boldValue: false,
      },
      {
        label: "PROJECT MANAGEMENT FEE (10%)",
        value: data.managementFee,
        align: "right",
        isRed: false,
        boldValue: false,
      },
      {
        label: "TOTAL",
        value: data.totalAmount,
        align: "right",
        isRed: false,
        boldValue: true,
      },
      {
        label: "PAID",
        value: data.amountPaid,
        align: "right",
        isRed: false,
        boldValue: false,
      },
      {
        label: "TOTAL",
        value: data.totalAmount - data.amountPaid,
        align: "right",
        isRed: true,
        boldValue: true,
      },
    ];

    summaryData.forEach((row) => {
      // Draw row border
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(tableLeft, currentY)
        .lineTo(tableLeft + tableWidth, currentY)
        .stroke();

      // Calculate positions for right-aligned text
      const labelX = tableLeft + descriptionWidth - 10;
      const valueX = tableLeft + descriptionWidth;

      // Add label (always bold, right-aligned in description column)
      doc
        .fillColor(row.isRed ? "#B01E23" : "#000000")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(row.label, tableLeft + 10, currentY + 7, {
          width: descriptionWidth - 20,
          align: "right",
        });

      // Add value (bold only for totals, right-aligned in cost column)
      doc
        .font(row.boldValue ? "Helvetica-Bold" : "Helvetica")
        .text(`$${this.formatNumber(row.value)}`, valueX + 10, currentY + 7, {
          width: costWidth - 20,
          align: "right",
        });

      currentY += 25;
    });

    // Draw table borders
    doc.strokeColor("#000000").lineWidth(1);

    // Left border
    doc.moveTo(tableLeft, startY).lineTo(tableLeft, currentY).stroke();

    // Right border
    doc
      .moveTo(tableLeft + tableWidth, startY)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Vertical line between description and cost
    doc
      .moveTo(tableLeft + descriptionWidth, startY)
      .lineTo(tableLeft + descriptionWidth, currentY)
      .stroke();

    // Bottom border
    doc
      .moveTo(tableLeft, currentY)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Add payment methods section with 30px spacing from table
    this.addPaymentMethod(doc, currentY + 30);
  }

  static addPaymentMethod(doc, startY) {
    const startX = 50;
    const sectionWidth = 500;
    const sectionHeight = 120;
    const pageHeight = doc.page.height - 50; // Account for margin

    // Check if payment section will fit on current page
    if (startY + sectionHeight > pageHeight) {
      doc.addPage(); // Add new page if it won't fit
      startY = 50; // Reset startY to top of new page with margin
    }

    // Add light red background with rounded corners
    doc
      .fillColor("#fde8e8")
      .roundedRect(startX, startY, sectionWidth, sectionHeight, 8)
      .fill();

    // Add border
    doc
      .strokeColor("#B01E23")
      .lineWidth(0.5)
      .roundedRect(startX, startY, sectionWidth, sectionHeight, 8)
      .stroke();

    // Add all content in one continuous block to prevent page breaks
    doc.save(); // Save the current graphics state
    doc.rect(startX, startY, sectionWidth, sectionHeight).clip(); // Clip to payment section

    // Add title
    doc
      .fontSize(14)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("Payment Methods", startX + 15, startY + 15);

    // Add payment options with better spacing
    const leftMargin = startX + 20;
    let currentY = startY + 45;

    // Bank Deposits section
    doc
      .fontSize(11)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("Bank Deposits:", leftMargin, currentY);

    currentY += 20;
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica")
      .text("Regions Bank • Wells Fargo", leftMargin, currentY);

    // Online Payments section
    currentY += 25;
    doc
      .fontSize(11)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("Online Payments:", leftMargin, currentY);

    currentY += 20;
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica")
      .text(
        "ACH Transfer • Zelle • Credit Card (with fee)",
        leftMargin,
        currentY,
        {
          continued: true, // Keep text together
        }
      );

    // Add note about account number at the bottom with proper spacing
    doc
      .fontSize(9)
      .fillColor("#666666")
      .font("Helvetica-Oblique")
      .text(
        "Account numbers available upon request",
        leftMargin,
        startY + sectionHeight - 25,
        {
          continued: true, // Keep text together
        }
      );

    doc.restore(); // Restore the graphics state
  }

  static addFooter(doc) {
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("", {
      align: "center",
    });
  }
}

module.exports = PDFGenerator;
