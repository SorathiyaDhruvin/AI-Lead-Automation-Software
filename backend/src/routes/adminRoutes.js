const express = require("express");
const router = express.Router();
const { adminMiddleware } = require("../middleware/auth");
const leadRequestController = require("../controllers/leadRequestController");
const adminController = require("../controllers/adminController");

router.use(adminMiddleware);

// Lead Requests
router.get("/lead-requests", leadRequestController.adminGetRequests);
router.patch("/lead-requests/:id", leadRequestController.adminUpdateStatus);

// Platform Admin Routes
router.get("/stats", adminController.getPlatformStats);
router.get("/users", adminController.getUsers);
router.get("/activity", adminController.getActivity);
router.get("/automations", adminController.getAutomations);
router.get("/emails", adminController.getEmails);
router.get("/settings", adminController.getPlatformSettings);
router.put("/settings", adminController.updatePlatformSettings);

module.exports = router;
