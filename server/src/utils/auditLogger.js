const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  action,
  description,
  medicine = null,
  user,
  healthCenter,
  previousValue = null,
  newValue = null,
  ipAddress = null,
}) => {
  try {
    await AuditLog.create({
      action,
      description,
      medicine,
      user,
      healthCenter,
      previousValue,
      newValue,
      ipAddress,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Audit log creation failed:", error.message);
    }
  }
};

module.exports = { createAuditLog };
