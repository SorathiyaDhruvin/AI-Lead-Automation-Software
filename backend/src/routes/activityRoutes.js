const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const activityController = require("../controllers/activityController");

// All activity routes require authentication
router.use(authMiddleware);

router.get("/", activityController.getActivities);
router.get("/lead/:leadId", activityController.getActivitiesByLead);

module.exports = router;
