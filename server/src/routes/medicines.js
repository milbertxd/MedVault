const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const medicineController = require("../controllers/medicineController");
const { authenticate, authorize, validate } = require("../middleware/auth");
const { medicineSchema, medicineUpdateSchema, stockAdjustmentSchema, qrDispenseSchema } = require("../validators/schemas");

const qrDispenseLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 40,
	message: { message: "Too many QR dispense attempts, please slow down" },
	standardHeaders: true,
	legacyHeaders: false,
});

router.use(authenticate);

router.get("/", medicineController.getAll);
router.get("/stats", medicineController.getStats);
router.get("/:id", medicineController.getById);
router.post("/", authorize("barangay_staff", "cho_admin"), validate(medicineSchema), medicineController.create);
router.put("/:id", authorize("barangay_staff", "cho_admin"), validate(medicineUpdateSchema), medicineController.update);
router.patch("/:id/stock", authorize("barangay_staff", "cho_admin"), validate(stockAdjustmentSchema), medicineController.adjustStock);
router.post(
	"/dispense/qr",
	authorize("barangay_staff", "cho_admin"),
	qrDispenseLimiter,
	validate(qrDispenseSchema),
	medicineController.dispenseByQR
);
router.delete("/:id", authorize("barangay_staff", "cho_admin"), medicineController.remove);

module.exports = router;
