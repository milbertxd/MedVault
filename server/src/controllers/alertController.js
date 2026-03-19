const Alert = require("../models/Alert");
const { createAuditLog } = require("../utils/auditLogger");

const hasCentralReadAccess = (role) => role === "cho_admin" || role === "cho_monitor";

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 25, type, isRead } = req.query;

    const query = {};

    if (hasCentralReadAccess(req.user.role)) {
      if (req.query.healthCenter) {
        query.healthCenter = req.query.healthCenter;
      }
    } else {
      query.healthCenter = req.user.healthCenter._id;
    }

    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [alerts, total, unreadCount] = await Promise.all([
      Alert.find(query)
        .populate("medicine", "name dosageStrength category quantity unit expiryDate")
        .populate("healthCenter", "name barangay")
        .populate("readBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Alert.countDocuments(query),
      Alert.countDocuments({
        ...query,
        isRead: false,
      }),
    ]);

    res.json({
      alerts,
      unreadCount,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Get alerts error:", error);
    }
    res.status(500).json({ message: "Failed to retrieve alerts" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (!hasCentralReadAccess(req.user.role) && alert.healthCenter.toString() !== req.user.healthCenter._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    alert.isRead = true;
    alert.readBy = req.user._id;
    alert.readAt = new Date();
    await alert.save();

    await createAuditLog({
      action: "ALERT_ACKNOWLEDGED",
      description: `Alert acknowledged: ${alert.message}`,
      medicine: alert.medicine,
      user: req.user._id,
      healthCenter: alert.healthCenter,
      ipAddress: req.ip,
    });

    res.json({ message: "Alert marked as read", alert });
  } catch (error) {
    res.status(500).json({ message: "Failed to update alert" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const query = { isRead: false };

    if (!hasCentralReadAccess(req.user.role)) {
      query.healthCenter = req.user.healthCenter._id;
    }

    await Alert.updateMany(query, {
      isRead: true,
      readBy: req.user._id,
      readAt: new Date(),
    });

    res.json({ message: "All alerts marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update alerts" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const query = { isRead: false };

    if (!hasCentralReadAccess(req.user.role)) {
      query.healthCenter = req.user.healthCenter._id;
    }

    const count = await Alert.countDocuments(query);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve alert count" });
  }
};
