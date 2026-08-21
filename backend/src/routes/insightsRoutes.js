const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const insightsController = require("../controllers/insightsController");

router.use(authMiddleware);

router.post("/generate", insightsController.generateInsights);

module.exports = router;
