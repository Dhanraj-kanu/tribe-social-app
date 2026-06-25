import mongoose from 'mongoose';

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  media: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  caption: {
    type: String,
    default: ''
  },
  // Text overlay on the story
  textOverlay: {
    text: { type: String, default: '' },
    fontFamily: { type: String, default: 'Inter' },
    color: { type: String, default: '#ffffff' },
    fontSize: { type: Number, default: 24 },
    position: { type: String, default: 'center' }, // top, center, bottom
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
    showBackground: { type: Boolean, default: false }
  },
  // Emoji stickers placed on the story
  stickers: [{
    emoji: { type: String },
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 }
  }],
  // Music info
  music: {
    name: { type: String, default: '' },
    artist: { type: String, default: '' },
    url: { type: String, default: '' },
    mood: { type: String, default: '' },
    x: { type: Number, default: 4 },
    y: { type: Number, default: 70 }
  },
  // Emoji reactions (beyond just likes)
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String }
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24*60*60*1000) // 24 hours from now
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Add TTL index to automatically delete stories after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);
export default Story;
