// ============================================
// Notes Controller - Phase 1 Core Study Experience
// ============================================

const mongoose = require('mongoose');
const Note = require('../models/Note');
const StudyGroup = require('../models/StudyGroup');
const { asyncHandler } = require('../utils/helpers');

/**
 * Helper to verify group membership
 */
const ensureGroupMember = async (groupId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
  const group = await StudyGroup.findById(groupId);
  if (!group) return null;
  const isMember = (group.members || []).some(m => String(m._id || m) === String(userId));
  return isMember ? group : false;
};

/**
 * @desc    Create a new note in a study group
 * @route   POST /api/groups/:groupId/notes
 * @access  Private (Group member)
 */
const createNote = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { title, content, subject, tags } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: 'Title and content are required for a note.'
    });
  }

  const group = await ensureGroupMember(groupId, req.user._id);
  if (group === null) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }
  if (group === false) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to create a note.' });
  }

  const processedTags = Array.isArray(tags)
    ? tags.map(t => t.trim()).filter(Boolean)
    : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

  const note = await Note.create({
    group: group._id,
    author: req.user._id,
    title: title.trim(),
    content,
    subject: subject ? subject.trim() : group.subject,
    tags: processedTags,
    pinned: false
  });

  await note.populate('author', 'name avatar');

  res.status(201).json({
    success: true,
    message: 'Note created successfully!',
    note
  });
});

/**
 * @desc    Get all notes for a group (with optional search & tag filter)
 * @route   GET /api/groups/:groupId/notes
 * @access  Private (Group member)
 */
const getGroupNotes = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { search, tag } = req.query;

  const group = await ensureGroupMember(groupId, req.user._id);
  if (group === null) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }
  if (group === false) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to view notes.' });
  }

  const query = { group: groupId };

  if (tag) {
    query.tags = { $in: [tag] };
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }

  // Sort pinned notes to top, then newest first
  const notes = await Note.find(query)
    .sort({ pinned: -1, createdAt: -1 })
    .populate('author', 'name avatar');

  res.status(200).json({
    success: true,
    count: notes.length,
    notes
  });
});

/**
 * @desc    Get note by ID
 * @route   GET /api/notes/:id
 * @access  Private (Group member)
 */
const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id).populate('author', 'name avatar');
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  const group = await ensureGroupMember(note.group, req.user._id);
  if (!group) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to view this note.' });
  }

  res.status(200).json({
    success: true,
    note
  });
});

/**
 * @desc    Update a note (Author or Group Creator)
 * @route   PUT /api/notes/:id
 * @access  Private
 */
const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  const group = await StudyGroup.findById(note.group);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Associated study group not found.' });
  }

  const isAuthor = String(note.author) === String(req.user._id);
  const isGroupCreator = String(group.createdBy) === String(req.user._id);

  if (!isAuthor && !isGroupCreator) {
    return res.status(403).json({
      success: false,
      message: 'Only the note author or group creator can edit this note.'
    });
  }

  const { title, content, subject, tags } = req.body;
  if (title) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (subject !== undefined) note.subject = subject.trim();
  if (tags !== undefined) {
    note.tags = Array.isArray(tags)
      ? tags.map(t => t.trim()).filter(Boolean)
      : typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
  }

  await note.save();
  await note.populate('author', 'name avatar');

  res.status(200).json({
    success: true,
    message: 'Note updated successfully.',
    note
  });
});

/**
 * @desc    Delete a note (Author or Group Creator)
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  const group = await StudyGroup.findById(note.group);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Associated study group not found.' });
  }

  const isAuthor = String(note.author) === String(req.user._id);
  const isGroupCreator = String(group.createdBy) === String(req.user._id);

  if (!isAuthor && !isGroupCreator) {
    return res.status(403).json({
      success: false,
      message: 'Only the note author or group creator can delete this note.'
    });
  }

  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully.'
  });
});

/**
 * @desc    Pin or unpin a note (Group Creator only)
 * @route   PATCH /api/notes/:id/pin
 * @access  Private (Group Creator)
 */
const togglePinNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }

  const group = await StudyGroup.findById(note.group);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Associated study group not found.' });
  }

  const isGroupCreator = String(group.createdBy) === String(req.user._id);
  if (!isGroupCreator) {
    return res.status(403).json({
      success: false,
      message: 'Only the group creator can pin or unpin notes.'
    });
  }

  note.pinned = !note.pinned;
  await note.save();

  res.status(200).json({
    success: true,
    message: note.pinned ? 'Note pinned to top.' : 'Note unpinned.',
    pinned: note.pinned
  });
});

module.exports = {
  createNote,
  getGroupNotes,
  getNoteById,
  updateNote,
  deleteNote,
  togglePinNote
};
