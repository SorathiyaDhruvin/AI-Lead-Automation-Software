const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const leadController = require("../controllers/leadController");

// All lead routes require authentication
router.use(authMiddleware);

router.get("/", leadController.getLeads);
router.get("/:id", leadController.getLeadById);
router.post("/", leadController.createLead);
router.put("/:id", leadController.updateLead);
router.post("/:id/score", leadController.scoreLead);
router.delete("/:id", leadController.deleteLead);

module.exports = router;
