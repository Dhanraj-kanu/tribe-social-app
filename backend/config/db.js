import mongoose from 'mongoose';

const connectDB = async (retries = 3) => {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 MongoDB connection attempt ${i}/${retries}...`);
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`❌ Attempt ${i} failed: ${error.message}`);
      if (i < retries) {
        console.log(`⏳ Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  console.error(`\n❌ All connection attempts failed.`);
  process.exit(1);
};

export default connectDB;
