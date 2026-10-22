// ============================================
// Resources Controller - Phase 1 Core Study Experience
// ============================================

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Resource = require('../models/Resource');
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
 * @desc    Add resource to study group (link or uploaded file)
 * @route   POST /api/groups/:groupId/resources
 * @access  Private (Group member)
 */
const createResource = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { type, title, url, tags } = req.body;

  const group = await ensureGroupMember(groupId, req.user._id);
  if (group === null) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }
  if (group === false) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(403).json({ success: false, message: 'You must be a member of this group to share resources.' });
  }

  if (!title) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'Resource title is required.' });
  }

  const processedTags = Array.isArray(tags)
    ? tags.map(t => t.trim()).filter(Boolean)
    : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

  let resourceData = {
    group: group._id,
    addedBy: req.user._id,
    title: title.trim(),
    tags: processedTags
  };

  if (req.file) {
    resourceData.type = 'file';
    resourceData.file = {
      path: `/uploads/${path.basename(req.file.path)}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    };
  } else if (type === 'link' || url) {
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required for link resources.' });
    }
    resourceData.type = 'link';
    resourceData.url = url.trim();
  } else {
    return res.status(400).json({
      success: false,
      message: 'Please provide either a valid link URL or upload a file.'
    });
  }

  const resource = await Resource.create(resourceData);
  await resource.populate('addedBy', 'name avatar');

  res.status(201).json({
    success: true,
    message: 'Resource added successfully!',
    resource
  });
});

/**
 * @desc    Get all resources for a study group
 * @route   GET /api/groups/:groupId/resources
 * @access  Private (Group member)
 */
const getGroupResources = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await ensureGroupMember(groupId, req.user._id);
  if (group === null) {
    return res.status(404).json({ success: false, message: 'Study group not found.' });
  }
  if (group === false) {
    return res.status(403).json({ success: false, message: 'You must be a member of this group to view resources.' });
  }

  const resources = await Resource.find({ group: groupId })
    .sort({ createdAt: -1 })
    .populate('addedBy', 'name avatar');

  res.status(200).json({
    success: true,
    count: resources.length,
    resources
  });
});

/**
 * @desc    Delete a resource (Uploader or Group Creator)
 * @route   DELETE /api/resources/:id
 * @access  Private
 */
const deleteResource = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found.' });
  }

  const group = await StudyGroup.findById(resource.group);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Associated study group not found.' });
  }

  const isUploader = String(resource.addedBy) === String(req.user._id);
  const isGroupCreator = String(group.createdBy) === String(req.user._id);

  if (!isUploader && !isGroupCreator) {
    return res.status(403).json({
      success: false,
      message: 'Only the resource uploader or group creator can delete this resource.'
    });
  }

  // If local file, clean up from disk
  if (resource.type === 'file' && resource.file?.path) {
    const filename = path.basename(resource.file.path);
    const diskPath = path.join(__dirname, '..', 'uploads', filename);
    if (fs.existsSync(diskPath)) {
      fs.unlink(diskPath, () => {});
    }
  }

  await resource.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Resource deleted successfully.'
  });
});

module.exports = {
  createResource,
  getGroupResources,
  deleteResource
};
