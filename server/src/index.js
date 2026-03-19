const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { startCronJobs } = require("./cron/alertCron");

const app = express();

const allowedOrigins = new Set(
  [
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
      : []),
  ].filter(Boolean)
);

const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const renderOriginRegex = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  if (process.env.NODE_ENV !== "production" && localhostRegex.test(origin)) {
    return true;
  }

  if (renderOriginRegex.test(origin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin || "unknown"}`));
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  optionsSuccessStatus: 204,
};

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith("CORS blocked")) {
    return res.status(403).json({ message: "Origin is not allowed by CORS policy" });
  }
  return next(err);
});

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

// Prevent upstream gateway timeouts when DB is not connected yet.
app.use((req, res, next) => {
  if (req.path === "/api/health") return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is reconnecting. Please retry in a few seconds.",
    });
  }
  next();
});

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
  const readyState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  res.json({
    status: "ok",
    database: dbStatusMap[readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
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
