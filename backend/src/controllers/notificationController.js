const notificationModel = require("../models/notificationModel");
const { asyncHandler } = require("../middleware/errorHandler");

const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await notificationModel.getByUser(req.userId);
    const unreadCount = await notificationModel.getUnreadCount(req.userId);
    
    // UI expects { notifications, unreadCount } directly wrapped in data
    res.json({
        success: true,
        data: {
            notifications,
            unreadCount
        }
    });
});

const markRead = asyncHandler(async (req, res) => {
    const notif = await notificationModel.markRead(req.params.id, req.userId);
    if (!notif) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, data: notif });
});

const markAllRead = asyncHandler(async (req, res) => {
    await notificationModel.markAllRead(req.userId);
    res.json({ success: true, message: "All notifications marked as read" });
});

module.exports = {
    getNotifications,
    markRead,
    markAllRead
};
