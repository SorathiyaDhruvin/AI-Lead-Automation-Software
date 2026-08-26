const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authMiddleware } = require("../middleware/auth");
const profileController = require("../controllers/profileController");

// Configure multer for memory storage (we upload buffer to Supabase)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// All profile routes require authentication
router.use(authMiddleware);

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);
router.patch("/photo", upload.single("photo"), profileController.uploadPhoto);
router.delete("/account", profileController.deleteAccount);

module.exports = router;
