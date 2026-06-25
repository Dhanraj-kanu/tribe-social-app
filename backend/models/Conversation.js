import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: ''
  },
  groupPhoto: {
    type: String,
    default: ''
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  activeMeeting: {
    isActive: { type: Boolean, default: false },
    type: { type: String, enum: ['voice', 'video', null], default: null },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date }
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
