const workflowModel = require("../models/workflowModel");
const executionModel = require("../models/executionModel");
const leadModel = require("../models/leadModel");
const automationEngine = require("../services/automationEngine");
const { asyncHandler } = require("../middleware/errorHandler");

const getWorkflows = asyncHandler(async (req, res) => {
    const workflows = await workflowModel.getByUser(req.userId);
    res.json({ success: true, data: workflows });
});

const getWorkflowById = asyncHandler(async (req, res) => {
    const workflow = await workflowModel.getById(req.params.id);
    if (!workflow) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    if (workflow.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    res.json({ success: true, data: workflow });
});

const createWorkflow = asyncHandler(async (req, res) => {
    const { name, description, triggerType, conditions, actions, isActive } = req.body;

    if (!name || !triggerType) {
        return res.status(400).json({ success: false, message: "Name and trigger type are required" });
    }

    const workflow = await workflowModel.create({
        userId: req.userId,
        name,
        description,
        triggerType,
        conditions: conditions || [],
        actions: actions || [],
        isActive: isActive !== false,
    });

    res.status(201).json({ success: true, data: workflow });
});

const updateWorkflow = asyncHandler(async (req, res) => {
    const workflow = await workflowModel.update(req.params.id, req.userId, req.body);
    if (!workflow) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    res.json({ success: true, data: workflow });
});

const deleteWorkflow = asyncHandler(async (req, res) => {
    const deleted = await workflowModel.delete(req.params.id, req.userId);
    if (!deleted) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    res.status(204).send();
});

const toggleWorkflow = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const workflow = await workflowModel.toggle(req.params.id, Boolean(isActive), req.userId);
    if (!workflow) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    res.json({ success: true, data: workflow });
});

/**
 * POST /api/workflows/:id/run
 * Manually trigger a workflow on all matching leads.
 */
const runWorkflow = asyncHandler(async (req, res) => {
    const workflow = await workflowModel.getById(req.params.id);
    if (!workflow) {
        return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    if (workflow.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Get user's leads and run the workflow on each
    const leads = await leadModel.getByUser(req.userId);
    let executed = 0;
    let failed = 0;
    const errors = [];

    for (const lead of leads) {
        try {
            const result = await automationEngine.executeWorkflow(
                workflow, lead, req.userId, "manual_run", {}
            );
            if (!result.skipped) {
                executed++;
            }
        } catch (err) {
            failed++;
            errors.push(`Lead "${lead.name}": ${err.message}`);
        }
    }

    res.json({
        success: true,
        data: { executed, failed, total: leads.length, errors: errors.slice(0, 10) },
    });
});

const getExecutionHistory = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const executions = await executionModel.getByUser(req.userId, limit);
    res.json({ success: true, data: executions });
});

const getExecutionStats = asyncHandler(async (req, res) => {
    const stats = await executionModel.getStatsByUser(req.userId);
    const workflowCounts = await workflowModel.countByUser(req.userId);
    res.json({
        success: true,
        data: {
            ...stats,
            totalWorkflows: workflowCounts.total,
            activeWorkflows: workflowCounts.active,
        },
    });
});

module.exports = {
    getWorkflows,
    getWorkflowById,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    runWorkflow,
    getExecutionHistory,
    getExecutionStats,
};
