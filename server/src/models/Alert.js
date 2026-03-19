const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["LOW_STOCK", "EXPIRED", "EXPIRING_SOON", "OUT_OF_STOCK"],
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    healthCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthCenter",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ healthCenter: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ type: 1 });

module.exports = mongoose.model("Alert", alertSchema);
