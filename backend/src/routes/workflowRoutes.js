const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const workflowController = require("../controllers/workflowController");

router.use(authMiddleware);

// Workflow CRUD
router.get("/", workflowController.getWorkflows);
router.get("/executions", workflowController.getExecutionHistory);
router.get("/stats", workflowController.getExecutionStats);
router.get("/:id", workflowController.getWorkflowById);
router.post("/", workflowController.createWorkflow);
router.put("/:id", workflowController.updateWorkflow);
router.delete("/:id", workflowController.deleteWorkflow);
router.patch("/:id/toggle", workflowController.toggleWorkflow);
router.post("/:id/run", workflowController.runWorkflow);

module.exports = router;
