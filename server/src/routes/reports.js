const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate, authorize } = require("../middleware/auth");

router.use(authenticate);
router.use(authorize("cho_admin", "cho_monitor"));

router.get("/inventory-pdf", reportController.generateInventoryReport);
router.get("/logs-pdf", reportController.generateLogsReport);
router.get("/audit-logs", reportController.getAuditLogs);
router.get("/dispensing-history", reportController.getDispensingHistory);
router.get("/forecast-60-day", reportController.getForecast60Day);

module.exports = router;
