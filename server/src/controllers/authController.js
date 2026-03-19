const jwt = require("jsonwebtoken");
const User = require("../models/User");
const HealthCenter = require("../models/HealthCenter");
const { createAuditLog } = require("../utils/auditLogger");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

exports.register = async (req, res) => {
  try {
    const { email, healthCenter: healthCenterId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const healthCenter = await HealthCenter.findById(healthCenterId);
    if (!healthCenter) {
      return res.status(400).json({ message: "Invalid health center" });
    }

    const user = await User.create(req.body);

    await createAuditLog({
      action: "USER_CREATED",
      description: `New user registered: ${user.firstName} ${user.lastName} (${user.role})`,
      user: user._id,
      healthCenter: user.healthCenter,
      ipAddress: req.ip,
    });

    const token = generateToken(user._id);

    const userResponse = await User.findById(user._id).populate("healthCenter");

    res.status(201).json({
      message: "Registration successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Registration error:", error);
    }
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password").populate("healthCenter");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    await createAuditLog({
      action: "USER_LOGIN",
      description: `User logged in: ${user.firstName} ${user.lastName}`,
      user: user._id,
      healthCenter: user.healthCenter._id,
      ipAddress: req.ip,
    });

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        healthCenter: user.healthCenter,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Login error:", error);
    }
    res.status(500).json({ message: "Login failed" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("healthCenter");
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve user" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Password change failed" });
  }
};

exports.getHealthCenters = async (req, res) => {
  try {
    const centers = await HealthCenter.find({ isActive: true }).sort({ name: 1 });
    res.json({ healthCenters: centers });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve health centers" });
  }
};
