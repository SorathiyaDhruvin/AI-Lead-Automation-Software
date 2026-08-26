const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const automationController = require("../controllers/automationController");

router.use(authMiddleware);

router.get("/rules", automationController.getRules);
router.post("/rules", automationController.createRule);
router.delete("/rules/:id", automationController.deleteRule);
router.patch("/rules/:id/toggle", automationController.toggleRule);

module.exports = router;
