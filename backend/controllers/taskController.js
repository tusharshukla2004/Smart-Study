// ============================================
// Task Controller (Phase 1 & Phase 2 Gamification)
// ============================================

const Task = require('../models/Task');
const User = require('../models/User');
const { awardXp } = require('./gamificationController');
const { XP_RULES } = require('../config/gamification');
const { analyticsCache } = require('../utils/cache');
const { asyncHandler } = require('../utils/helpers');

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = asyncHandler(async (req, res) => {
  const { title, description, subject, priority, deadline } = req.body;

  const task = await Task.create({
    userId: req.user._id,
    title,
    description: description || '',
    subject: subject || '',
    priority: priority || 'medium',
    deadline: deadline || null
  });

  // Invalidate user analytics cache
  analyticsCache.invalidateUser(req.user._id);

  res.status(201).json({
    success: true,
    message: 'Task created successfully!',
    task
  });
});

/**
 * @desc    Get all tasks for the authenticated user
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, subject } = req.query;

  // Build filter
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (subject) filter.subject = { $regex: subject, $options: 'i' };

  const tasks = await Task.find(filter).sort({ deadline: 1, createdAt: -1 });

  // Calculate stats
  const allTasks = await Task.find({ userId: req.user._id });
  const stats = {
    total: allTasks.length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    inProgress: allTasks.filter(t => t.status === 'in-progress').length
  };

  res.status(200).json({
    success: true,
    count: tasks.length,
    stats,
    tasks
  });
});

/**
 * @desc    Update a task (status, title, etc.)
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found.'
    });
  }

  // Ensure user owns this task
  if (task.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this task.'
    });
  }

  const previousStatus = task.status;

  // Update allowed fields
  const allowedFields = ['title', 'description', 'subject', 'status', 'priority', 'deadline'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  }

  await task.save();

  // Phase 2: Award XP if transitioning to completed (idempotent)
  if (task.status === 'completed' && previousStatus !== 'completed') {
    const xpPoints = XP_RULES.calculateTaskXp(task.priority);
    await awardXp(req.user._id, 'task_completed', xpPoints, task._id);

    const completedCount = await Task.countDocuments({
      userId: req.user._id,
      status: 'completed'
    });
    await User.findByIdAndUpdate(req.user._id, { tasksCompleted: completedCount });
  }

  // Invalidate user analytics cache
  analyticsCache.invalidateUser(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Task updated successfully!',
    task
  });
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found.'
    });
  }

  // Ensure user owns this task
  if (task.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this task.'
    });
  }

  await Task.findByIdAndDelete(req.params.id);

  // Invalidate user analytics cache
  analyticsCache.invalidateUser(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully!'
  });
});

module.exports = { createTask, getTasks, updateTask, deleteTask };
