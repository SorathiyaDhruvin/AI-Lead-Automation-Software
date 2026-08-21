const automationModel = require("../models/automationModel");
const { asyncHandler } = require("../middleware/errorHandler");

const getRules = asyncHandler(async (req, res) => {
    const rules = await automationModel.getByUser(req.userId);
    res.json({ success: true, data: rules });
});

const createRule = asyncHandler(async (req, res) => {
    const { name, triggerType, triggerValue, actionType, actionValue } = req.body;
    
    if (!name || !triggerType || triggerValue === undefined || !actionType || !actionValue) {
        return res.status(400).json({ success: false, message: "Missing required rule parameters" });
    }

    const existing = await automationModel.getByUser(req.userId);
    const duplicate = existing.find(r => r.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
        return res.status(409).json({ success: false, message: `A rule named "${name}" already exists. Please use a different name.` });
    }

    const rule = await automationModel.create({
        userId: req.userId,
        name,
        triggerType,
        triggerValue: parseInt(triggerValue),
        actionType,
        actionValue
    });

    res.status(201).json({ success: true, data: rule });
});

const deleteRule = asyncHandler(async (req, res) => {
    const deleted = await automationModel.delete(req.params.id, req.userId);
    if (!deleted) {
        return res.status(404).json({ success: false, message: "Rule not found" });
    }
    res.status(204).send();
});

const toggleRule = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const rule = await automationModel.toggle(req.params.id, Boolean(isActive), req.userId);
    if (!rule) {
        return res.status(404).json({ success: false, message: "Rule not found" });
    }
    res.json({ success: true, data: rule });
});

module.exports = {
    getRules,
    createRule,
    deleteRule,
    toggleRule
};
