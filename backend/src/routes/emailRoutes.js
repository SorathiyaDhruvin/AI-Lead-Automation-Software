const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const emailController = require("../controllers/emailController");

// Mount the test route (protect with adminMiddleware to prevent abuse)
router.post("/test", adminMiddleware, emailController.sendTestEmail);

// Health check route (does not require auth)
router.get("/health", emailController.getEmailHealth);

// Public email tracking pixel and click redirect routes
router.get("/track/open/:logId", emailController.trackOpen);
router.get("/track/click/:logId", emailController.trackClick);

// Bulk email routes
router.post("/bulk", authMiddleware, emailController.sendBulkEmail);
router.get("/bulk/:id/progress", authMiddleware, emailController.getBulkJobProgress);
router.post("/bulk/:id/retry", authMiddleware, emailController.retryBulkJob);

module.exports = router;

