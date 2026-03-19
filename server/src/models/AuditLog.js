const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "STOCK_ADDED",
        "STOCK_REMOVED",
        "STOCK_ADJUSTED",
        "DISPENSED_VIA_QR",
        "DISPENSE_ATTEMPT_BLOCKED",
        "MEDICINE_CREATED",
        "MEDICINE_UPDATED",
        "MEDICINE_DELETED",
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_CREATED",
        "USER_UPDATED",
        "USER_DEACTIVATED",
        "REPORT_GENERATED",
        "ALERT_ACKNOWLEDGED",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    healthCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthCenter",
      required: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ healthCenter: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ medicine: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
