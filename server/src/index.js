const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { startCronJobs } = require("./cron/alertCron");

const app = express();

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, "");
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const renderOriginPattern = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (
      allowedOrigins.includes(normalized)
      || renderOriginPattern.test(normalized)
      || process.env.NODE_ENV === "production"
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${normalized}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many authentication attempts, please try again later" },
});

// Body parser
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Disable x-powered-by
app.disable("x-powered-by");

// Routes
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/medicines", require("./routes/medicines"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/users", require("./routes/users"));
app.use("/api/reports", require("./routes/reports"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

let cronStarted = false;

const initDatabaseWithRetry = async () => {
  try {
    await connectDB();
    if (!cronStarted) {
      startCronJobs();
      cronStarted = true;
    }
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    setTimeout(initDatabaseWithRetry, 10000);
  }
};

const start = async () => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  initDatabaseWithRetry();
};

start();
