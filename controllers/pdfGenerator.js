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
    doc.fontSize(35).font("Helvetica-Bold").text("INVOICE", 50, 50);

    // Add StrikeRealty company name in red at the top right with extra bold effect
    doc.fontSize(30).fillColor("#b01e23").font("Helvetica-BoldOblique");

    // Draw text multiple times with tiny offset for bolder appearance
    doc.text("StrikeRealty", 350, 50);
    doc.text("StrikeRealty", 350.5, 50);
    doc.text("StrikeRealty", 350, 50.5);
    doc.text("StrikeRealty", 350.5, 50.5);

    // Add the white "eraser" effect line
    doc
      .strokeColor("#FFFFFF")
      .lineWidth(1)
      .moveTo(350, 70)
      .lineTo(520, 70)
      .stroke();

    // Add company address under StrikeRealty
    doc
      .fontSize(10)
      .fillColor("#000000") // Changed to black color
      .font("Helvetica") // Reset to regular font
      .text("13831 SW 50th St", 400, 85)
      .text("Suite 201 Miami, FL 33183", 400, 100)
      .text("(305) 330-2305", 400, 115);

    // Add invoice details below INVOICE
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("INVOICE", 50, 100)
      .fillColor("#000000");

    // Add gray background for invoice number
    doc
      .fillColor("#F5F5F5")
      .rect(120, 95, 100, 16)
      .fill()
      .fillColor("#000000")
      .font("Helvetica")
      .text(`#${invoiceNumber}`, 120, 100);

    doc.fontSize(12).font("Helvetica-Bold").text("DATE:", 50, 120);

    // Add gray background for date
    doc
      .fillColor("#F5F5F5")
      .rect(120, 115, 100, 16)
      .fill()
      .fillColor("#000000")
      .font("Helvetica")
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
    const rowHeight = 60;

    // Add background for entire section
    doc
      .fillColor("#EEEEEE")
      .rect(tableLeft, startY, tableWidth, 25 + rowHeight)
      .fill();

    // Add header row with red background
    doc.fillColor("#B01E23").rect(tableLeft, startY, tableWidth, 25).fill();

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
      .fontSize(11)
      .font("Helvetica")
      .text(
        "Strike Realty LLC\n13831 SW 59th St\nMiami, FL 33183\n(305) 330-2305",
        tableLeft + 10,
        contentY + 7
      )
      .font("Helvetica-Bold")
      .text(data.customerName, tableLeft + columnWidth + 10, contentY + 7);

    // Store the end position of billing info for the separator line
    doc.billingEndY = startY + 25 + rowHeight;
  }

  static formatNumber(number) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  static addItemsTableWithSummary(doc, data) {
    const startY = 270;
    const tableLeft = 50;
    const tableWidth = 500;
    const descriptionWidth = 380;
    const costWidth = 120;
    const rowHeight = 20;

    // Add header
    doc.fillColor("#B01E23").rect(tableLeft, startY, tableWidth, 25).fill();

    doc
      .fillColor("#FFFFFF")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("DESCRIPTION", tableLeft + 10, startY + 7)
      .text("COST", tableLeft + descriptionWidth + 25, startY + 7);

    let currentY = startY + 25;

    // Add items without horizontal lines
    data.items.forEach((item) => {
      doc
        .fillColor("#000000")
        .fontSize(10)
        .font("Helvetica")
        .text(item.description, tableLeft + 10, currentY + 5)
        .text(
          `$${this.formatNumber(item.cost)}`,
          tableLeft + descriptionWidth + 10,
          currentY + 5,
          {
            width: costWidth - 20,
            align: "right",
          }
        );

      currentY += rowHeight;
    });

    // Draw main table borders
    doc.strokeColor("#000000").lineWidth(1);

    // Left border
    doc.moveTo(tableLeft, startY).lineTo(tableLeft, currentY).stroke();

    // Right border
    doc
      .moveTo(tableLeft + tableWidth, startY)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Column separator
    doc
      .moveTo(tableLeft + descriptionWidth, startY)
      .lineTo(tableLeft + descriptionWidth, currentY)
      .stroke();

    // Bottom border for main items table
    doc
      .moveTo(tableLeft, currentY)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Calculate middle point between billing info and table
    const separatorY = doc.billingEndY + (startY - doc.billingEndY) / 2;

    // Add separator line between billing info and table
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(tableLeft, separatorY)
      .lineTo(tableLeft + tableWidth, separatorY)
      .stroke();

    // Add summary rows with adjusted spacing
    const summaryData = [
      {
        label: "GROSS AMOUNT",
        value: data.grossAmount,
        align: "right",
        isRed: false,
        boldValue: false,
        prefix: "$",
      },
      {
        label: "PROJECT MANAGEMENT FEE (10%)",
        value: data.managementFee,
        align: "right",
        isRed: false,
        boldValue: false,
        prefix: "+ $",
      },
      {
        label: "TOTAL",
        value: data.totalAmount,
        align: "right",
        isRed: false,
        boldValue: true,
        prefix: "$",
      },
      {
        label: "PAID",
        value: data.amountPaid,
        align: "right",
        isRed: false,
        boldValue: false,
        prefix: "- $",
      },
      {
        label: "TOTAL",
        value: data.totalAmount - data.amountPaid,
        align: "right",
        isRed: true,
        boldValue: true,
        prefix: "$",
      },
    ];

    summaryData.forEach((row, index) => {
      // Draw row border
      doc
        .strokeColor("#000000")
        .lineWidth(0.5)
        .moveTo(tableLeft + descriptionWidth, currentY)
        .lineTo(tableLeft + tableWidth, currentY)
        .stroke();

      // Draw left border for amount column
      if (index === 0) {
        doc
          .strokeColor("#000000")
          .lineWidth(1)
          .moveTo(tableLeft + descriptionWidth, currentY)
          .lineTo(
            tableLeft + descriptionWidth,
            currentY + summaryData.length * rowHeight
          )
          .stroke();
      }

      // Add label
      doc
        .fillColor(row.isRed ? "#B01E23" : "#000000")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(row.label, tableLeft + 10, currentY + 5, {
          width: descriptionWidth - 20,
          align: "right",
        });

      // Add value with prefix
      doc
        .font(row.boldValue ? "Helvetica-Bold" : "Helvetica")
        .text(
          `${row.prefix}${this.formatNumber(row.value)}`,
          tableLeft + descriptionWidth + 10,
          currentY + 5,
          {
            width: costWidth - 20,
            align: "right",
          }
        );

      currentY += rowHeight;
    });

    // Draw final borders for summary section
    doc.strokeColor("#000000").lineWidth(1);

    // Right border
    doc
      .moveTo(tableLeft + tableWidth, currentY - summaryData.length * rowHeight)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Bottom border
    doc
      .moveTo(tableLeft + descriptionWidth, currentY)
      .lineTo(tableLeft + tableWidth, currentY)
      .stroke();

    // Add payment methods section with 30px spacing from table
    this.addPaymentMethod(doc, currentY + 30);
  }

  static addPaymentMethod(doc, startY) {
    const sectionWidth = 350;
    const sectionHeight = 100;
    const pageHeight = doc.page.height - 50;
    const bottomPadding = 50;
    const newPageTopMargin = 30;
    const contentPadding = 25;

    // Check if payment section will fit on current page
    if (startY + sectionHeight + bottomPadding > pageHeight) {
      doc.addPage();
      startY = newPageTopMargin;
    }

    // Add light gray background
    doc
      .fillColor("#F5F5F5")
      .rect(0, startY, sectionWidth, sectionHeight)
      .fill();

    // Add title
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("Payment Methods", contentPadding, startY + 15);

    // Bank deposit info
    doc
      .fontSize(10)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text("Bank for Walk-in Deposit:", contentPadding, startY + 35, {
        continued: true,
      })
      .font("Helvetica")
      .text(" Regions Bank, Wells Fargo");

    // Account number info
    doc
      .font("Helvetica-Bold")
      .text("Account Number:", contentPadding, startY + 50, { continued: true })
      .font("Helvetica")
      .text(" Upon Request");

    // Online payments info
    doc
      .font("Helvetica-Bold")
      .text("Online Payments Accepted:", contentPadding, startY + 65, {
        continued: true,
      })
      .font("Helvetica")
      .text(" ACH, Zelle, Credit Card (with fee)");
  }

  static addFooter(doc) {
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("", {
      align: "center",
    });
  }
}

module.exports = PDFGenerator;
