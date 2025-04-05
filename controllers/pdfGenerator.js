const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const SVGtoPDF = require("svg-to-pdfkit");

class PDFGenerator {
  static generatePaymentConfirmation(
    res,
    inputData = {},
    invoiceNumber = "20126186"
  ) {
    // Default data structure
    const data = {
      customerName: inputData.customerName || "John Smith",
      items: inputData.items || [
        {
          description: "Property Management Services",
          cost: 1500.0,
        },
        {
          description: "Maintenance and Repairs",
          cost: 750.0,
        },
        {
          description: "Maintenance and Repairs",
          cost: 750.0,
        },
        {
          description: "Maintenance and Repairs",
          cost: 750.0,
        },
        {
          description: "Maintenance and Repairs",
          cost: 750.0,
        },
        {
          description: "Marketing and Advertising",
          cost: 500.0,
        },
      ],
      amountPaid: inputData.amountPaid || 2750.0,
      grossAmount: inputData.grossAmount || 2750.0,
      managementFee: inputData.managementFee || 275.0,
      totalAmount: inputData.totalAmount || 3025.0,
    };

    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");

      // Pipe the PDF to the response
      doc.pipe(res);

      // Add content to the PDF
      this.addHeader(doc, invoiceNumber);
      this.addBillingInfo(doc, data);
      this.addItemsTableWithSummary(doc, data);
      this.addPaymentMethod(doc);
      this.addFooter(doc);

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
          `$${item.cost.toFixed(2)}`,
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
        .text(`$${row.value.toFixed(2)}`, valueX + 10, currentY + 7, {
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
  }

  static addPaymentMethod(doc) {
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .font("Helvetica-Bold")
      .text("PAYMENT METHOD", 50, 650)
      .fillColor("#000000")
      .font("Helvetica")
      .text("Bank Name: Regions Bank–Wells Fargo–Zelle", 50, 670)
      .text("Account Number: Upon Request", 50, 685);
  }

  static addFooter(doc) {
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text("", {
      align: "center",
    });
  }
}

module.exports = PDFGenerator;
