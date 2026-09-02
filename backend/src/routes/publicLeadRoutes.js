const express = require("express");
const router = express.Router();
const leadController = require("../controllers/leadController");
const rateLimit = require("express-rate-limit");

// Rate limit public submissions: max 15 requests per 15 minutes per IP
const publicFormLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, message: "Too many form submissions from this IP. Please try again later." }
});

router.post("/public-capture", publicFormLimiter, leadController.createPublicLead);

module.exports = router;
