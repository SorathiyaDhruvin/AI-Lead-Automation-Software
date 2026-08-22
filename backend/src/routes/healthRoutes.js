const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");

// Health check — no auth required
router.get("/", healthController.getHealth);
router.get("/email", healthController.getEmailHealth);

module.exports = router;
