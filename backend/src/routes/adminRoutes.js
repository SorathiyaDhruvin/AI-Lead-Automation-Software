const express = require("express");
const router = express.Router();
const { adminMiddleware } = require("../middleware/auth");
const leadRequestController = require("../controllers/leadRequestController");

router.use(adminMiddleware);

router.get("/lead-requests", leadRequestController.adminGetRequests);
router.patch("/lead-requests/:id", leadRequestController.adminUpdateStatus);
router.get("/stats", leadRequestController.adminGetStats);

module.exports = router;
