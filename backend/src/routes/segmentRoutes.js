const express = require("express");
const router = express.Router();
const segmentController = require("../controllers/segmentController");
const { authMiddleware } = require("../middleware/auth");

// All segment routes are protected
router.use(authMiddleware);

router.get("/", segmentController.getSegments);
router.post("/", segmentController.createSegment);
router.patch("/:id", segmentController.updateSegment);
router.delete("/:id", segmentController.deleteSegment);
router.post("/auto-segment", segmentController.autoSegment);

module.exports = router;
