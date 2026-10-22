// ============================================
// Resource Model - Shared links and files per group
// ============================================

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyGroup',
    required: [true, 'Group is required'],
    index: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['link', 'file'],
    required: [true, 'Resource type is required']
  },
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  url: {
    type: String,
    trim: true,
    default: null
  },
  file: {
    path: { type: String, default: null },
    originalName: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null }
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

resourceSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
