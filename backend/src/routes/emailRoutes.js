const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const emailController = require("../controllers/emailController");

// Mount the test route (protect with adminMiddleware to prevent abuse)
router.post("/test", adminMiddleware, emailController.sendTestEmail);

module.exports = router;
