const Medicine = require("../models/Medicine");
const Alert = require("../models/Alert");
const DispensingHistory = require("../models/DispensingHistory");
const { createAuditLog } = require("../utils/auditLogger");

const hasCentralReadAccess = (role) => role === "cho_admin" || role === "cho_monitor";

const checkAndCreateAlerts = async (medicine) => {
  // Remove old unread alerts for this medicine
  await Alert.deleteMany({ medicine: medicine._id, isRead: false });

  const alerts = [];

  if (medicine.quantity === 0) {
    alerts.push({
      type: "OUT_OF_STOCK",
      medicine: medicine._id,
      healthCenter: medicine.healthCenter,
      message: `${medicine.name} (${medicine.dosageStrength}) is out of stock`,
    });
  } else if (medicine.quantity <= medicine.minimumStock) {
    alerts.push({
      type: "LOW_STOCK",
      medicine: medicine._id,
      healthCenter: medicine.healthCenter,
      message: `${medicine.name} (${medicine.dosageStrength}) is low on stock (${medicine.quantity} ${medicine.unit} remaining)`,
    });
  }

  const now = new Date();
  if (medicine.expiryDate <= now) {
    alerts.push({
      type: "EXPIRED",
      medicine: medicine._id,
      healthCenter: medicine.healthCenter,
      message: `${medicine.name} (${medicine.dosageStrength}, Batch: ${medicine.batchNumber || "N/A"}) has expired`,
    });
  } else {
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    if (medicine.expiryDate <= threeMonths) {
      alerts.push({
        type: "EXPIRING_SOON",
        medicine: medicine._id,
        healthCenter: medicine.healthCenter,
        message: `${medicine.name} (${medicine.dosageStrength}, Batch: ${medicine.batchNumber || "N/A"}) expires on ${medicine.expiryDate.toLocaleDateString()}`,
      });
    }
  }

  if (alerts.length > 0) {
    await Alert.insertMany(alerts);
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      category,
      sortBy = "name",
      sortOrder = "asc",
      status,
    } = req.query;

    const query = { isActive: true };

    // CHO admins/monitors can see all centers, staff only their own
    if (hasCentralReadAccess(req.user.role)) {
      if (req.query.healthCenter) {
        query.healthCenter = req.query.healthCenter;
      }
    } else {
      query.healthCenter = req.user.healthCenter._id;
    }

    if (search) {
      const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { genericName: { $regex: sanitized, $options: "i" } },
        { brandName: { $regex: sanitized, $options: "i" } },
        { batchNumber: { $regex: sanitized, $options: "i" } },
        { qrCode: { $regex: sanitized, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status === "low_stock") {
      query.$expr = { $lte: ["$quantity", "$minimumStock"] };
      query.quantity = { $gt: 0 };
    } else if (status === "out_of_stock") {
      query.quantity = 0;
    } else if (status === "expired") {
      query.expiryDate = { $lt: new Date() };
    } else if (status === "expiring_soon") {
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      query.expiryDate = { $gt: new Date(), $lte: threeMonths };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [medicines, total] = await Promise.all([
      Medicine.find(query)
        .populate("healthCenter", "name barangay")
        .populate("addedBy", "firstName lastName")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Medicine.countDocuments(query),
    ]);

    res.json({
      medicines,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Get medicines error:", error);
    }
    res.status(500).json({ message: "Failed to retrieve medicines" });
  }
};

exports.getById = async (req, res) => {
  try {
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate("healthCenter", "name barangay")
      .populate("addedBy", "firstName lastName");

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    // Authorization check
    if (!hasCentralReadAccess(req.user.role) && medicine.healthCenter._id.toString() !== req.user.healthCenter._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ medicine });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve medicine" });
  }
};

exports.create = async (req, res) => {
  try {
    if (req.user.role === "cho_monitor") {
      return res.status(403).json({ message: "Read-only role cannot create medicines" });
    }

    const medicineData = {
      ...req.body,
      healthCenter: req.user.role === "cho_admin" && req.body.healthCenter
        ? req.body.healthCenter
        : req.user.healthCenter._id,
      addedBy: req.user._id,
    };

    const medicine = await Medicine.create(medicineData);

    await checkAndCreateAlerts(medicine);

    await createAuditLog({
      action: "MEDICINE_CREATED",
      description: `Added new medicine: ${medicine.name} (${medicine.dosageStrength}), Qty: ${medicine.quantity}`,
      medicine: medicine._id,
      user: req.user._id,
      healthCenter: medicine.healthCenter,
      newValue: { name: medicine.name, quantity: medicine.quantity },
      ipAddress: req.ip,
    });

    const populated = await Medicine.findById(medicine._id)
      .populate("healthCenter", "name barangay")
      .populate("addedBy", "firstName lastName");

    res.status(201).json({ message: "Medicine added successfully", medicine: populated });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.qrCode) {
      return res.status(400).json({ message: "QR code already exists for this health center" });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Create medicine error:", error);
    }
    res.status(500).json({ message: "Failed to add medicine" });
  }
};

exports.update = async (req, res) => {
  try {
    if (req.user.role === "cho_monitor") {
      return res.status(403).json({ message: "Read-only role cannot update medicines" });
    }

    const medicine = await Medicine.findOne({ _id: req.params.id, isActive: true });

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (!hasCentralReadAccess(req.user.role) && medicine.healthCenter.toString() !== req.user.healthCenter._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const previousValue = {
      name: medicine.name,
      quantity: medicine.quantity,
      expiryDate: medicine.expiryDate,
    };

    Object.assign(medicine, req.body);
    await medicine.save();

    await checkAndCreateAlerts(medicine);

    await createAuditLog({
      action: "MEDICINE_UPDATED",
      description: `Updated medicine: ${medicine.name}`,
      medicine: medicine._id,
      user: req.user._id,
      healthCenter: medicine.healthCenter,
      previousValue,
      newValue: { name: medicine.name, quantity: medicine.quantity, expiryDate: medicine.expiryDate },
      ipAddress: req.ip,
    });

    const populated = await Medicine.findById(medicine._id)
      .populate("healthCenter", "name barangay")
      .populate("addedBy", "firstName lastName");

    res.json({ message: "Medicine updated successfully", medicine: populated });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.qrCode) {
      return res.status(400).json({ message: "QR code already exists for this health center" });
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("Update medicine error:", error);
    }
    res.status(500).json({ message: "Failed to update medicine" });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    if (req.user.role === "cho_monitor") {
      return res.status(403).json({ message: "Read-only role cannot adjust stock" });
    }

    const { quantity, type, reason } = req.body;
    const medicine = await Medicine.findOne({ _id: req.params.id, isActive: true });

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (!hasCentralReadAccess(req.user.role) && medicine.healthCenter.toString() !== req.user.healthCenter._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const previousQty = medicine.quantity;

    if (type === "add") {
      medicine.quantity += quantity;
    } else {
      if (medicine.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock for removal" });
      }
      medicine.quantity -= quantity;
    }

    await medicine.save();
    await checkAndCreateAlerts(medicine);

    const action = type === "add" ? "STOCK_ADDED" : "STOCK_REMOVED";
    await createAuditLog({
      action,
      description: `${type === "add" ? "Added" : "Removed"} ${quantity} ${medicine.unit} of ${medicine.name}. Reason: ${reason}`,
      medicine: medicine._id,
      user: req.user._id,
      healthCenter: medicine.healthCenter,
      previousValue: { quantity: previousQty },
      newValue: { quantity: medicine.quantity },
      ipAddress: req.ip,
    });

    const populated = await Medicine.findById(medicine._id)
      .populate("healthCenter", "name barangay")
      .populate("addedBy", "firstName lastName");

    res.json({
      message: `Stock ${type === "add" ? "added" : "removed"} successfully`,
      medicine: populated,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Adjust stock error:", error);
    }
    res.status(500).json({ message: "Failed to adjust stock" });
  }
};

exports.remove = async (req, res) => {
  try {
    if (req.user.role === "cho_monitor") {
      return res.status(403).json({ message: "Read-only role cannot remove medicines" });
    }

    const medicine = await Medicine.findOne({ _id: req.params.id, isActive: true });

    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (!hasCentralReadAccess(req.user.role) && medicine.healthCenter.toString() !== req.user.healthCenter._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    medicine.isActive = false;
    await medicine.save();

    await Alert.deleteMany({ medicine: medicine._id, isRead: false });

    await createAuditLog({
      action: "MEDICINE_DELETED",
      description: `Removed medicine: ${medicine.name} (${medicine.dosageStrength})`,
      medicine: medicine._id,
      user: req.user._id,
      healthCenter: medicine.healthCenter,
      previousValue: { name: medicine.name, quantity: medicine.quantity },
      ipAddress: req.ip,
    });

    res.json({ message: "Medicine removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove medicine" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const query = { isActive: true };

    if (hasCentralReadAccess(req.user.role)) {
      if (req.query.healthCenter) {
        query.healthCenter = req.query.healthCenter;
      }
    } else {
      query.healthCenter = req.user.healthCenter._id;
    }

    const now = new Date();
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    const [
      totalMedicines,
      totalQuantity,
      lowStockCount,
      outOfStockCount,
      expiredCount,
      expiringSoonCount,
      categoryStats,
    ] = await Promise.all([
      Medicine.countDocuments(query),
      Medicine.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]),
      Medicine.countDocuments({
        ...query,
        $expr: { $lte: ["$quantity", "$minimumStock"] },
        quantity: { $gt: 0 },
      }),
      Medicine.countDocuments({ ...query, quantity: 0 }),
      Medicine.countDocuments({ ...query, expiryDate: { $lt: now } }),
      Medicine.countDocuments({
        ...query,
        expiryDate: { $gt: now, $lte: threeMonths },
      }),
      Medicine.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      stats: {
        totalMedicines,
        totalQuantity: totalQuantity[0]?.total || 0,
        lowStockCount,
        outOfStockCount,
        expiredCount,
        expiringSoonCount,
        categoryStats,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Get stats error:", error);
    }
    res.status(500).json({ message: "Failed to retrieve statistics" });
  }
};

exports.dispenseByQR = async (req, res) => {
  try {
    if (req.user.role === "cho_monitor") {
      return res.status(403).json({ message: "Read-only role cannot dispense medicines" });
    }

    const { qrString, quantity = 1, notes } = req.body;
    const normalizedQR = qrString.trim().toUpperCase();

    const baseQuery = {
      qrCode: normalizedQR,
      isActive: true,
    };

    if (!hasCentralReadAccess(req.user.role)) {
      baseQuery.healthCenter = req.user.healthCenter._id;
    } else if (req.body.healthCenter) {
      baseQuery.healthCenter = req.body.healthCenter;
    }

    const medicine = await Medicine.findOne(baseQuery);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine for QR code not found" });
    }

    const previousQty = medicine.quantity;
    if (previousQty < quantity) {
      if (previousQty <= medicine.minimumStock) {
        await checkAndCreateAlerts(medicine);
      }

      await createAuditLog({
        action: "DISPENSE_ATTEMPT_BLOCKED",
        description: `Blocked dispense via QR for ${medicine.name}: requested ${quantity} ${medicine.unit}, available ${previousQty}`,
        medicine: medicine._id,
        user: req.user._id,
        healthCenter: medicine.healthCenter,
        previousValue: { quantity: previousQty },
        newValue: { quantity: previousQty },
        ipAddress: req.ip,
      });

      return res.status(409).json({
        message: "Insufficient stock",
        medicine: {
          _id: medicine._id,
          name: medicine.name,
          quantity: medicine.quantity,
          minimumStock: medicine.minimumStock,
          unit: medicine.unit,
        },
      });
    }

    const updatedMedicine = await Medicine.findOneAndUpdate(
      {
        _id: medicine._id,
        quantity: { $gte: quantity },
      },
      {
        $inc: { quantity: -quantity },
      },
      { new: true }
    )
      .populate("healthCenter", "name barangay")
      .populate("addedBy", "firstName lastName");

    if (!updatedMedicine) {
      return res.status(409).json({ message: "Stock changed, please scan again" });
    }

    await checkAndCreateAlerts(updatedMedicine);

    const dispensingRecord = await DispensingHistory.create({
      medicine: updatedMedicine._id,
      healthCenter: updatedMedicine.healthCenter._id,
      dispensedBy: req.user._id,
      qrString: normalizedQR,
      quantity,
      previousQuantity: previousQty,
      resultingQuantity: updatedMedicine.quantity,
      notes,
    });

    await createAuditLog({
      action: "DISPENSED_VIA_QR",
      description: `Dispensed ${quantity} ${updatedMedicine.unit} of ${updatedMedicine.name} via QR scan`,
      medicine: updatedMedicine._id,
      user: req.user._id,
      healthCenter: updatedMedicine.healthCenter._id,
      previousValue: { quantity: previousQty },
      newValue: { quantity: updatedMedicine.quantity },
      ipAddress: req.ip,
    });

    res.json({
      message: "Medicine dispensed successfully",
      medicine: updatedMedicine,
      dispensingRecord,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Dispense by QR error:", error);
    }
    res.status(500).json({ message: "Failed to process QR dispense" });
  }
};
