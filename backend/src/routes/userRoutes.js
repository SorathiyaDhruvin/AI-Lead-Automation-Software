const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const userController = require("../controllers/userController");

// Admin routes
router.get("/", adminMiddleware, userController.getAllUsers);

module.exports = router;
