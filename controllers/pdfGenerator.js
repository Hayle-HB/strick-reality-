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
    // Add header text instead of SVG
    doc.fontSize(48).font("Helvetica-Bold").text("INVOICE", 50, 50);

    doc
      .fontSize(48)
      .fillColor("#b01e23") // Red color matching the original SVG
      .text("Strike Realty", 250, 50);

    // Add line
    doc.moveTo(50, 130).lineTo(550, 130).stroke();

    // Add invoice details
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .text("INVOICE", 50, 150)
      .fillColor("#000000")
      .text(`#${invoiceNumber}`, 120, 150);

    doc
      .fontSize(12)
      .text("DATE:", 50, 170)
      .text(
        new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        }),
        120,
        170
      );
  }

  static addBillingInfo(doc, data) {
    // Bill From section
    doc
      .fontSize(12)
      .fillColor("#B01E23")
      .text("BILL FROM:", 50, 210)
      .fillColor("#000000")
      .font("Helvetica")
      .text("Strike Realty LLC", 50, 230)
      .text("13831 SW 59th St", 50, 245)
      .text("Miami, FL 33183", 50, 260)
      .text("(305) 330-2305", 50, 275);

    // Bill To section
    doc
      .fillColor("#B01E23")
      .text("BILL TO:", 300, 210)
      .fillColor("#000000")
      .text(data.customerName, 300, 230);
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
