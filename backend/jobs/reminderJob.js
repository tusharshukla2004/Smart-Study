// ============================================
// Scheduled Reminders Job (node-cron)
// ============================================

const cron = require('node-cron');
const StudySession = require('../models/StudySession');
const Task = require('../models/Task');
const User = require('../models/User');
const { createNotification } = require('../utils/notify');
const { sendEmail, getSessionReminderHtml, getTaskDeadlineHtml } = require('../utils/email');

/**
 * Process sessions starting in the next 15 minutes
 */
const processSessionReminders = async () => {
  const now = new Date();
  const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

  try {
    // Find sessions starting within 15 minutes that haven't sent reminders yet
    const sessions = await StudySession.find({
      status: 'scheduled',
      reminderSent: false,
      scheduledAt: { $gte: now, $lte: fifteenMinutesLater }
    }).populate('rsvps.user', 'name email').populate('group', 'name');

    for (const session of sessions) {
      // Mark reminderSent immediately to prevent race conditions
      session.reminderSent = true;
      await session.save();

      // Filter RSVP attendees with status 'going' or 'maybe'
      const attendees = (session.rsvps || []).filter(r => ['going', 'maybe'].includes(r.status));

      for (const rsvp of attendees) {
        const attendeeUser = rsvp.user;
        if (!attendeeUser) continue;

        // In-app notification
        await createNotification(attendeeUser._id, {
          type: 'session_starting',
          title: 'Session Starting in 15 Minutes',
          message: `"${session.title}" in ${session.group?.name || 'your group'} starts soon!`,
          link: `/sessions/${session._id}`,
          data: { sessionId: session._id }
        });

        // Email notification
        if (attendeeUser.email) {
          sendEmail({
            to: attendeeUser.email,
            subject: `Reminder: "${session.title}" starts in 15 minutes 📚`,
            html: getSessionReminderHtml(session, attendeeUser.name)
          }).catch(err => console.error('Error sending session reminder email:', err.message));
        }
      }
    }
  } catch (error) {
    console.error('❌ Error processing session reminders:', error.message);
  }
};

/**
 * Process tasks due in the next 24 hours
 */
const processTaskReminders = async () => {
  const now = new Date();
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const tasks = await Task.find({
      status: { $ne: 'completed' },
      deadlineNotified: false,
      deadline: { $gte: now, $lte: twentyFourHoursLater }
    }).populate('userId', 'name email');

    for (const task of tasks) {
      task.deadlineNotified = true;
      await task.save();

      const taskUser = task.userId;
      if (!taskUser) continue;

      // In-app notification
      await createNotification(taskUser._id, {
        type: 'task_deadline',
        title: 'Task Deadline Approaching',
        message: `Your task "${task.title}" is due within 24 hours.`,
        link: '/tasks',
        data: { taskId: task._id }
      });

      // Email notification
      if (taskUser.email) {
        sendEmail({
          to: taskUser.email,
          subject: `Task Deadline: "${task.title}" is due soon ⏳`,
          html: getTaskDeadlineHtml(task, taskUser.name)
        }).catch(err => console.error('Error sending task deadline email:', err.message));
      }
    }
  } catch (error) {
    console.error('❌ Error processing task reminders:', error.message);
  }
};

/**
 * Start the cron job to run every minute
 */
const startReminderJob = () => {
  // Run every minute: * * * * *
  const job = cron.schedule('* * * * *', async () => {
    await processSessionReminders();
    await processTaskReminders();
  });

  return job;
};

module.exports = {
  startReminderJob,
  processSessionReminders,
  processTaskReminders
};
