const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const HealthCenter = require("../models/HealthCenter");
const User = require("../models/User");
const Medicine = require("../models/Medicine");

const upsertHealthCenter = async (payload) => {
  let center = await HealthCenter.findOne({ name: payload.name });
  if (!center) {
    center = await HealthCenter.create(payload);
    return center;
  }
  Object.assign(center, payload);
  await center.save();
  return center;
};

const upsertUser = async (payload) => {
  let user = await User.findOne({ email: payload.email }).select("+password");
  if (!user) {
    user = new User(payload);
    await user.save();
    return user;
  }
  Object.assign(user, payload);
  user.isActive = true;
  await user.save();
  return user;
};

const upsertMedicine = async (payload) => {
  const query = { qrCode: payload.qrCode, healthCenter: payload.healthCenter };
  let med = await Medicine.findOne(query);
  if (!med) {
    med = new Medicine(payload);
    await med.save();
    return med;
  }
  Object.assign(med, payload);
  med.isActive = true;
  await med.save();
  return med;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const cupangCenter = await upsertHealthCenter({
      name: "Barangay Cupang Health Center",
      address: "Cupang, Muntinlupa City",
      barangay: "Cupang",
      city: "Muntinlupa City",
      contactNumber: "02-8123-4567",
      isActive: true,
    });

    const choCenter = await upsertHealthCenter({
      name: "City Health Office - Muntinlupa",
      address: "National Road, Muntinlupa City",
      barangay: "Poblacion",
      city: "Muntinlupa City",
      contactNumber: "02-8765-4321",
      isActive: true,
    });

    console.log("Health centers upserted");

    const adminUser = await upsertUser({
      firstName: "Admin",
      lastName: "CHO",
      email: "admin@cho.gov.ph",
      password: "Admin@123",
      role: "cho_admin",
      healthCenter: choCenter._id,
    });

    const staffUser = await upsertUser({
      firstName: "Staff",
      lastName: "Cupang",
      email: "staff@cupang.gov.ph",
      password: "Staff@123",
      role: "barangay_staff",
      healthCenter: cupangCenter._id,
    });

    await upsertUser({
      firstName: "Monitor",
      lastName: "CHO",
      email: "monitor@cho.gov.ph",
      password: "Monitor@123",
      role: "cho_monitor",
      healthCenter: choCenter._id,
    });

    console.log("Default users upserted");

    await upsertMedicine({
      name: "Isoniazid",
      genericName: "Isoniazid",
      brandName: "Nydrazid",
      category: "National TB",
      dosageForm: "Tablet",
      dosageStrength: "300mg",
      unit: "pcs",
      quantity: 120,
      minimumStock: 30,
      expiryDate: new Date("2027-06-30"),
      batchNumber: "TB-2027-001",
      qrCode: "MED|TB|TB-2027-001",
      supplier: "DOH Central Supply",
      location: "Cabinet A2 - TB Section",
      notes: "Starter seeded medicine",
      healthCenter: choCenter._id,
      addedBy: adminUser._id,
    });

    await upsertMedicine({
      name: "Ferrous Sulfate + Folic Acid",
      genericName: "Ferrous Sulfate + Folic Acid",
      brandName: "IFA Tablet",
      category: "Maternal/Child Health",
      dosageForm: "Tablet",
      dosageStrength: "60mg + 400mcg",
      unit: "pcs",
      quantity: 250,
      minimumStock: 60,
      expiryDate: new Date("2027-09-15"),
      batchNumber: "MCH-IFA-2709",
      qrCode: "MED|MCH|MCH-IFA-2709",
      supplier: "DOH Maternal Program",
      location: "Cabinet B1",
      notes: "Starter seeded medicine",
      healthCenter: cupangCenter._id,
      addedBy: staffUser._id,
    });

    console.log("Default medicines upserted");
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
