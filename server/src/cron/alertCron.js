const cron = require("node-cron");
const Medicine = require("../models/Medicine");
const Alert = require("../models/Alert");

const checkExpiryAndStock = async () => {
  try {
    const medicines = await Medicine.find({ isActive: true });
    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    for (const med of medicines) {
      const existingAlerts = await Alert.find({
        medicine: med._id,
        isRead: false,
      });

      const existingTypes = existingAlerts.map((a) => a.type);
      const newAlerts = [];

      // Check expiry
      if (med.expiryDate <= now && !existingTypes.includes("EXPIRED")) {
        newAlerts.push({
          type: "EXPIRED",
          medicine: med._id,
          healthCenter: med.healthCenter,
          message: `${med.name} (${med.dosageStrength}, Batch: ${med.batchNumber || "N/A"}) has expired`,
        });
      } else if (
        med.expiryDate > now &&
        med.expiryDate <= threeMonths &&
        !existingTypes.includes("EXPIRING_SOON")
      ) {
        newAlerts.push({
          type: "EXPIRING_SOON",
          medicine: med._id,
          healthCenter: med.healthCenter,
          message: `${med.name} (${med.dosageStrength}) expires on ${med.expiryDate.toLocaleDateString()}`,
        });
      }

      // Check stock
      if (med.quantity === 0 && !existingTypes.includes("OUT_OF_STOCK")) {
        newAlerts.push({
          type: "OUT_OF_STOCK",
          medicine: med._id,
          healthCenter: med.healthCenter,
          message: `${med.name} (${med.dosageStrength}) is out of stock`,
        });
      } else if (
        med.quantity > 0 &&
        med.quantity <= med.minimumStock &&
        !existingTypes.includes("LOW_STOCK")
      ) {
        newAlerts.push({
          type: "LOW_STOCK",
          medicine: med._id,
          healthCenter: med.healthCenter,
          message: `${med.name} (${med.dosageStrength}) is low on stock (${med.quantity} ${med.unit} remaining)`,
        });
      }

      if (newAlerts.length > 0) {
        await Alert.insertMany(newAlerts);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`Alert check completed at ${new Date().toISOString()}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Cron job error:", error.message);
    }
  }
};

const startCronJobs = () => {
  // Run every day at 6 AM
  cron.schedule("0 6 * * *", checkExpiryAndStock);

  // Also run on startup after a delay
  setTimeout(checkExpiryAndStock, 10000);

  if (process.env.NODE_ENV !== "production") {
    console.log("Cron jobs initialized");
  }
};

module.exports = { startCronJobs };
