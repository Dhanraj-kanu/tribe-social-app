import mongoose from 'mongoose';
import Story from './server/models/Story.js';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/tribe';

async function check() {
  try {
    await mongoose.connect(dbUrl);
    const stories = await Story.find();
    console.log('Total stories:', stories.length);
    const withMusic = stories.filter(s => s.music && s.music.url);
    console.log('Stories with music URL:', withMusic.length);
    if (withMusic.length > 0) {
      console.log('Sample music URL:', withMusic[0].music.url);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
