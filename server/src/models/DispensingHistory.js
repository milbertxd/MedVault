const mongoose = require("mongoose");

const dispensingHistorySchema = new mongoose.Schema(
  {
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
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    qrString: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    resultingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

dispensingHistorySchema.index({ medicine: 1, createdAt: -1 });
dispensingHistorySchema.index({ healthCenter: 1, createdAt: -1 });
dispensingHistorySchema.index({ dispensedBy: 1, createdAt: -1 });

module.exports = mongoose.model("DispensingHistory", dispensingHistorySchema);
