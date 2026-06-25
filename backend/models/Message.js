import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  file: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    enum: ['', 'image', 'video', 'audio', 'pdf', 'other'],
    default: ''
  },
  // Call history info (only present for call log messages)
  callInfo: {
    callType: {
      type: String,
      enum: ['voice', 'video'],
    },
    callStatus: {
      type: String,
      enum: ['missed', 'rejected', 'ended', 'failed'],
    },
    duration: {
      type: Number, // in seconds
      default: 0
    }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
