const emailTemplateModel = require("../models/emailTemplateModel");
const { asyncHandler } = require("../middleware/errorHandler");

const getTemplates = asyncHandler(async (req, res) => {
    const templates = await emailTemplateModel.getAll(req.userId);
    res.json({ success: true, data: templates });
});

const getTemplateById = asyncHandler(async (req, res) => {
    const template = await emailTemplateModel.getById(req.params.id);
    if (!template) {
        return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, data: template });
});

const createTemplate = asyncHandler(async (req, res) => {
    const { name, subject, bodyHtml, variables } = req.body;

    if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ success: false, message: "Name, subject, and body are required" });
    }

    const template = await emailTemplateModel.create({
        userId: req.userId,
        name,
        subject,
        bodyHtml,
        variables: variables || [],
    });

    res.status(201).json({ success: true, data: template });
});

const updateTemplate = asyncHandler(async (req, res) => {
    const template = await emailTemplateModel.update(req.params.id, req.userId, req.body);
    if (!template) {
        return res.status(404).json({ success: false, message: "Template not found" });
    }
    res.json({ success: true, data: template });
});

const deleteTemplate = asyncHandler(async (req, res) => {
    const deleted = await emailTemplateModel.delete(req.params.id, req.userId);
    if (!deleted) {
        return res.status(404).json({ success: false, message: "Template not found or is a system template" });
    }
    res.status(204).send();
});

/**
 * POST /api/email-templates/:id/preview
 * Preview a rendered template with sample data.
 */
const previewTemplate = asyncHandler(async (req, res) => {
    const template = await emailTemplateModel.getById(req.params.id);
    if (!template) {
        return res.status(404).json({ success: false, message: "Template not found" });
    }

    const sampleVariables = {
        "lead.name": "John Doe",
        "lead.email": "john@example.com",
        "lead.company": "Acme Corp",
        "lead.score": "85",
        "lead.status": "qualified",
        "lead.source": "website",
        "lead.category": "Hot",
        "company.name": "LeadFlow AI",
        ...(req.body.variables || {}),
    };

    const rendered = emailTemplateModel.renderTemplate(template, sampleVariables);
    res.json({ success: true, data: rendered });
});

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
};
