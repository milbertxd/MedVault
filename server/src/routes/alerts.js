const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", alertController.getAll);
router.get("/unread-count", alertController.getUnreadCount);
router.patch("/:id/read", alertController.markAsRead);
router.patch("/read-all", alertController.markAllAsRead);

module.exports = router;
