const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const HealthCenter = require("../models/HealthCenter");
const User = require("../models/User");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create health centers
    const centers = await HealthCenter.insertMany([
      {
        name: "Barangay Cupang Health Center",
        address: "Cupang, Muntinlupa City",
        barangay: "Cupang",
        city: "Muntinlupa City",
        contactNumber: "02-8123-4567",
      },
      {
        name: "City Health Office - Muntinlupa",
        address: "National Road, Muntinlupa City",
        barangay: "Poblacion",
        city: "Muntinlupa City",
        contactNumber: "02-8765-4321",
      },
    ]);

    console.log("Health centers created");

    // Create default users
    await User.create([
      {
        firstName: "Admin",
        lastName: "CHO",
        email: "admin@cho.gov.ph",
        password: "Admin@123",
        role: "cho_admin",
        healthCenter: centers[1]._id,
      },
      {
        firstName: "Staff",
        lastName: "Cupang",
        email: "staff@cupang.gov.ph",
        password: "Staff@123",
        role: "barangay_staff",
        healthCenter: centers[0]._id,
      },
      {
        firstName: "Monitor",
        lastName: "CHO",
        email: "monitor@cho.gov.ph",
        password: "Monitor@123",
        role: "cho_monitor",
        healthCenter: centers[1]._id,
      },
    ]);

    console.log("Default users created");
    console.log("\nLogin Credentials:");
    console.log("CHO Admin    -> admin@cho.gov.ph / Admin@123");
    console.log("Brgy Staff   -> staff@cupang.gov.ph / Staff@123");
    console.log("CHO Monitor  -> monitor@cho.gov.ph / Monitor@123");

    await mongoose.disconnect();
    console.log("\nSeed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seed();
