const { z } = require("zod");

const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less")
    .trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or less")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["barangay_staff", "cho_admin", "cho_monitor"]).optional(),
  healthCenter: z.string().min(1, "Health center is required"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

const medicineSchema = z.object({
  name: z.string().min(1, "Medicine name is required").max(200).trim(),
  genericName: z.string().max(200).trim().optional(),
  brandName: z.string().max(200).trim().optional(),
  category: z.enum([
    "National TB",
    "Immunization",
    "Maternal/Child Health",
    "Rabies",
    "Dental",
    "Family Planning",
    "Nutrition",
    "Non-Communicable Diseases",
  ]),
  dosageForm: z.enum([
    "Tablet",
    "Capsule",
    "Syrup",
    "Injection",
    "Cream",
    "Ointment",
    "Drops",
    "Inhaler",
    "Powder",
    "Other",
  ]),
  dosageStrength: z.string().min(1, "Dosage strength is required").max(100).trim(),
  unit: z.enum(["pcs", "bottles", "boxes", "vials", "tubes", "sachets", "rolls", "packs"]),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  minimumStock: z.number().int().min(0, "Minimum stock cannot be negative"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  batchNumber: z.string().max(100).trim().optional(),
  qrCode: z
    .string()
    .min(3, "QR code is required")
    .max(180, "QR code must be 180 characters or less")
    .regex(/^[A-Za-z0-9_\-:.|/]+$/, "QR code contains invalid characters")
    .transform((value) => value.trim().toUpperCase()),
  supplier: z.string().max(200).trim().optional(),
  location: z.string().max(200).trim().optional(),
  notes: z.string().max(500).trim().optional(),
});

const medicineUpdateSchema = medicineSchema.partial();

const stockAdjustmentSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  type: z.enum(["add", "remove"]),
  reason: z.string().min(1, "Reason is required").max(500).trim(),
});

const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  role: z.enum(["barangay_staff", "cho_admin", "cho_monitor"]).optional(),
  isActive: z.boolean().optional(),
  healthCenter: z.string().optional(),
});

const qrDispenseSchema = z.object({
  qrString: z
    .string()
    .min(3, "QR string is required")
    .max(220, "QR string must be 220 characters or less")
    .regex(/^[A-Za-z0-9_\-:.|/]+$/, "QR string contains invalid characters")
    .transform((value) => value.trim().toUpperCase()),
  quantity: z.number().int().min(1, "Dispense quantity must be at least 1").default(1),
  notes: z.string().max(300).trim().optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

module.exports = {
  registerSchema,
  loginSchema,
  medicineSchema,
  medicineUpdateSchema,
  stockAdjustmentSchema,
  qrDispenseSchema,
  userUpdateSchema,
  passwordChangeSchema,
};
