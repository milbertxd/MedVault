const User = require("../models/User");
const HealthCenter = require("../models/HealthCenter");
const { createAuditLog } = require("../utils/auditLogger");

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 25, search, role, healthCenter: hcFilter } = req.query;

    const query = {};

    if (req.user.role !== "cho_admin") {
      query.healthCenter = req.user.healthCenter._id;
    } else if (hcFilter) {
      query.healthCenter = hcFilter;
    }

    if (search) {
      const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { firstName: { $regex: sanitized, $options: "i" } },
        { lastName: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
      ];
    }

    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate("healthCenter", "name barangay")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Get users error:", error);
    }
    res.status(500).json({ message: "Failed to retrieve users" });
  }
};

exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("healthCenter");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      req.user.role !== "cho_admin" &&
      user.healthCenter._id.toString() !== req.user.healthCenter._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve user" });
  }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      req.user.role !== "cho_admin" &&
      user.healthCenter.toString() !== req.user.healthCenter._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only CHO admin can change roles
    if (req.body.role && req.user.role !== "cho_admin") {
      delete req.body.role;
    }

    const previousValue = {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };

    Object.assign(user, req.body);
    await user.save();

    await createAuditLog({
      action: "USER_UPDATED",
      description: `User updated: ${user.firstName} ${user.lastName}`,
      user: req.user._id,
      healthCenter: req.user.healthCenter._id,
      previousValue,
      newValue: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      },
      ipAddress: req.ip,
    });

    const populated = await User.findById(user._id).populate("healthCenter");
    res.json({ message: "User updated successfully", user: populated });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Update user error:", error);
    }
    res.status(500).json({ message: "Failed to update user" });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot deactivate your own account" });
    }

    user.isActive = !user.isActive;
    await user.save();

    await createAuditLog({
      action: "USER_DEACTIVATED",
      description: `User ${user.isActive ? "activated" : "deactivated"}: ${user.firstName} ${user.lastName}`,
      user: req.user._id,
      healthCenter: req.user.healthCenter._id,
      ipAddress: req.ip,
    });

    const populated = await User.findById(user._id).populate("healthCenter");
    res.json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: populated,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user status" });
  }
};

exports.createHealthCenter = async (req, res) => {
  try {
    const center = await HealthCenter.create(req.body);
    res.status(201).json({ message: "Health center created", healthCenter: center });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Health center name already exists" });
    }
    res.status(500).json({ message: "Failed to create health center" });
  }
};
