const express = require("express");
const router = express.Router();
const { authMiddleware, adminMiddleware } = require("../middleware/auth");
const userController = require("../controllers/userController");

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected routes
router.get("/profile", authMiddleware, userController.getProfile);

// Admin routes
router.get("/", adminMiddleware, userController.getAllUsers);

module.exports = router;
