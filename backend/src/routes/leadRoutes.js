const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authMiddleware } = require("../middleware/auth");
const leadController = require("../controllers/leadController");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// All lead routes require authentication
router.use(authMiddleware);

// CSV Export (Must be before /:id to prevent param matching collision)
router.get("/export", leadController.exportCsv);

// CSV Import
router.post("/import", upload.single("file"), leadController.importCsv);

// Standard CRUD
router.get("/", leadController.getLeads);
router.get("/:id", leadController.getLeadById);
router.post("/", leadController.createLead);
router.put("/:id", leadController.updateLead);
router.delete("/:id", leadController.deleteLead);

// AI Scoring
router.post("/:id/score", leadController.scoreLead);

// Notes
router.get("/:id/notes", leadController.getNotes);
router.post("/:id/notes", leadController.createNote);

// Activities
router.get("/:id/activity", leadController.getLeadActivities);

// Send Email
router.post("/:id/send-email", leadController.sendLeadEmail);

module.exports = router;
