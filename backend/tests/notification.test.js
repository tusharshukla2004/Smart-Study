// ============================================
// Notification Controller Unit Tests
// ============================================

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const notificationController = require('../controllers/notificationController');

describe('Notification Controller Unit Tests', () => {
  let req, res, next;
  const mockUserId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  test('getNotifications returns user notifications and unread count', async () => {
    req = {
      user: { _id: mockUserId },
      query: { page: '1', limit: '10' }
    };

    const mockNotifications = [
      { _id: new mongoose.Types.ObjectId(), title: 'Session Starting', read: false },
      { _id: new mongoose.Types.ObjectId(), title: 'Task Deadline', read: true }
    ];

    jest.spyOn(Notification, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockNotifications)
        })
      })
    });

    jest.spyOn(Notification, 'countDocuments')
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(1); // unread

    await notificationController.getNotifications(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        totalNotifications: 2,
        unreadCount: 1,
        notifications: mockNotifications
      })
    );
  });

  test('getUnreadCount returns correct unread count', async () => {
    req = {
      user: { _id: mockUserId }
    };

    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(5);

    await notificationController.getUnreadCount(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      unreadCount: 5
    });
  });

  test('markAsRead updates notification status to read: true', async () => {
    const mockNotifId = new mongoose.Types.ObjectId();
    req = {
      user: { _id: mockUserId },
      params: { id: mockNotifId.toString() }
    };

    const mockNotifDoc = {
      _id: mockNotifId,
      user: mockUserId,
      read: false,
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(Notification, 'findOne').mockResolvedValue(mockNotifDoc);
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(0);

    await notificationController.markAsRead(req, res, next);

    expect(mockNotifDoc.read).toBe(true);
    expect(mockNotifDoc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringMatching(/marked as read/i),
        unreadCount: 0
      })
    );
  });

  test('markAllAsRead sets read: true for all user notifications', async () => {
    req = {
      user: { _id: mockUserId }
    };

    jest.spyOn(Notification, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

    await notificationController.markAllAsRead(req, res, next);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { user: mockUserId, read: false },
      { $set: { read: true } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        unreadCount: 0
      })
    );
  });
});
