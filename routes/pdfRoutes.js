const express = require("express");
const router = express.Router();
const PDFGenerator = require("../controllers/pdfGenerator");

// Home page route
router.get("/", (req, res) => {
  res.render("Home");
});

// PDF generation route
router.get("/generate-payment-confirmation", (req, res) => {
  PDFGenerator.generatePaymentConfirmation(res);
});

module.exports = router;
