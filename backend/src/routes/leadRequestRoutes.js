const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const leadRequestController = require("../controllers/leadRequestController");

router.use(authMiddleware);

router.get("/", leadRequestController.getRequests);
router.post("/", leadRequestController.createRequest);
router.get("/:id", leadRequestController.getRequestById);

module.exports = router;
