const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Database connection error: ${error.message}`);
    }
    process.exit(1);
  }
};

module.exports = connectDB;
