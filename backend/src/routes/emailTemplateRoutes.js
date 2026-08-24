const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const emailTemplateController = require("../controllers/emailTemplateController");

router.use(authMiddleware);

router.get("/", emailTemplateController.getTemplates);
router.get("/:id", emailTemplateController.getTemplateById);
router.post("/", emailTemplateController.createTemplate);
router.put("/:id", emailTemplateController.updateTemplate);
router.delete("/:id", emailTemplateController.deleteTemplate);
router.post("/:id/preview", emailTemplateController.previewTemplate);

module.exports = router;
