const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate, validate } = require("../middleware/auth");
const { registerSchema, loginSchema, passwordChangeSchema } = require("../validators/schemas");

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMe);
router.put("/change-password", authenticate, validate(passwordChangeSchema), authController.changePassword);
router.get("/health-centers", authController.getHealthCenters);

module.exports = router;
