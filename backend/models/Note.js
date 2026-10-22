// ============================================
// Note Model - Shared markdown notes per group
// ============================================

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup',
    required: [true, 'Group is required'],
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    default: ''
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  tags: {
    type: [String],
    default: []
  },
  pinned: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Text index on title, content, tags for search
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });
noteSchema.index({ group: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
