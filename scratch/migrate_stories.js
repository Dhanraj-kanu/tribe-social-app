import mongoose from 'mongoose';
import Story from './server/models/Story.js';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/tribe';

const URL_MAPPING = {
  'https://cdn.pixabay.com/audio/2022/05/27/audio_1808f3030e.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://cdn.pixabay.com/audio/2022/01/21/audio_31b392470d.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e01f9.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73456.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://cdn.pixabay.com/audio/2021/08/04/audio_06259f8164.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://cdn.pixabay.com/audio/2021/11/24/audio_83036d9742.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://cdn.pixabay.com/audio/2022/02/22/audio_d0c2668a9c.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://cdn.pixabay.com/audio/2021/09/06/audio_2766352934.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://cdn.pixabay.com/audio/2022/01/18/audio_6234f23432.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  'https://cdn.pixabay.com/audio/2022/03/10/audio_f324424342.mp3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
};

async function migrate() {
  try {
    await mongoose.connect(dbUrl);
    console.log('Connected to database for migration...');
    const stories = await Story.find({ 'music.url': { $exists: true } });
    console.log(`Checking ${stories.length} stories for broken music links...`);
    
    let updatedCount = 0;
    for (const story of stories) {
      const oldUrl = story.music.url;
      if (URL_MAPPING[oldUrl]) {
        story.music.url = URL_MAPPING[oldUrl];
        await story.save();
        updatedCount++;
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} stories.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
