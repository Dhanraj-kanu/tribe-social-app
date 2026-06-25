import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './server/models/User.js';

dotenv.config({ path: './server/.env' });

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find users with "Unknown" name or missing username
    const suspiciousUsers = await User.find({
      $or: [
        { fullName: /Unknown/i },
        { username: '' },
        { username: { $exists: false } },
        { fullName: '' }
      ]
    });

    console.log(`Found ${suspiciousUsers.length} suspicious users`);
    
    if (suspiciousUsers.length > 0) {
      const ids = suspiciousUsers.map(u => u._id);
      console.log('Deleting users:', suspiciousUsers.map(u => u.username || 'NO_USERNAME'));
      
      const result = await User.deleteMany({ _id: { $in: ids } });
      console.log(`Deleted ${result.deletedCount} users`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

cleanup();
