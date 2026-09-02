const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const aiSuggestionController = require("../controllers/aiSuggestionController");

// All AI suggestion routes require authentication
router.use(authMiddleware);

router.get("/", aiSuggestionController.getSuggestions);
router.post("/generate-email", aiSuggestionController.generateEmail);
router.post("/generate-followup", aiSuggestionController.generateFollowUp);
router.post("/analyze-reply", aiSuggestionController.analyzeReply);
router.post("/:leadId", aiSuggestionController.generateSuggestion);

module.exports = router;

