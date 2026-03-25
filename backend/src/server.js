const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const logger = require("./config/logger");
const {
  requestLogger,
  errorLogger,
} = require("./middleware/logging.middleware");
const {
  globalRateLimiter,
  authRateLimiter,
} = require("./middleware/rateLimit.middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(globalRateLimiter);
app.use("/api/auth", authRateLimiter);

// Routes
app.use("/api/docs", require("./routes/docs.routes"));
app.use("/api/triggers", require("./routes/trigger.routes"));
app.use("/api/stats", require("./routes/stats.routes"));
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Confirm that the API process is running and able to serve requests.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Connected to MongoDB", {
      database: "MongoDB",
      status: "connected",
      uri: process.env.MONGO_URI?.replace(/\/\/.*@/, "//***@"), // Hide credentials in logs
    });
    app.listen(PORT, () => {
      logger.info("Server started successfully", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        pid: process.pid,
      });
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection failed", {
      error: err.message,
      stack: err.stack,
      database: "MongoDB",
    });
    process.exit(1);
  });

// TODO: Initialize Workers
// const eventPoller = require('./worker/poller');
// eventPoller.start();

// Error handling middleware (should be last)
app.use(errorLogger);
