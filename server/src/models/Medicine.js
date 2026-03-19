const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "National TB",
        "Immunization",
        "Maternal/Child Health",
        "Rabies",
        "Dental",
        "Family Planning",
        "Nutrition",
        "Non-Communicable Diseases",
      ],
    },
    dosageForm: {
      type: String,
      required: true,
      enum: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Inhaler", "Powder", "Other"],
    },
    dosageStrength: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["pcs", "bottles", "boxes", "vials", "tubes", "sachets", "rolls", "packs"],
      default: "pcs",
    },
    quantity: {
      type: Number,
      alias: "currentQuantity",
      required: true,
      min: 0,
      default: 0,
    },
    minimumStock: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    qrCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 180,
    },
    supplier: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    healthCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HealthCenter",
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 1, healthCenter: 1 });
medicineSchema.index({ qrCode: 1, healthCenter: 1 }, { unique: true });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ category: 1 });

medicineSchema.virtual("isLowStock").get(function () {
  return this.quantity <= this.minimumStock;
});

medicineSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiryDate;
});

medicineSchema.virtual("isExpiringSoon").get(function () {
  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);
  return !this.isExpired && this.expiryDate <= threeMonths;
});

medicineSchema.set("toJSON", { virtuals: true });
medicineSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Medicine", medicineSchema);
