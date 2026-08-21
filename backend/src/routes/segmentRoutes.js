const express = require("express");
const router = express.Router();
const segmentController = require("../controllers/segmentController");
const authMiddleware = require("../middleware/authMiddleware");

// All segment routes are protected
router.use(authMiddleware);

router.get("/", segmentController.getSegments);
router.post("/auto-segment", segmentController.autoSegment);

module.exports = router;
