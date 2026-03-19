const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize, validate } = require("../middleware/auth");
const { userUpdateSchema } = require("../validators/schemas");

router.use(authenticate);

router.get("/", authorize("cho_admin"), userController.getAll);
router.get("/:id", userController.getById);
router.put("/:id", authorize("cho_admin"), validate(userUpdateSchema), userController.update);
router.patch("/:id/toggle-status", authorize("cho_admin"), userController.deactivate);
router.post("/health-centers", authorize("cho_admin"), userController.createHealthCenter);

module.exports = router;
