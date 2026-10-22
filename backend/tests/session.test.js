// ============================================
// Session Controller & Permissions Unit Tests
// ============================================

const mongoose = require('mongoose');
const StudySession = require('../models/StudySession');
const StudyGroup = require('../models/StudyGroup');
const SessionLog = require('../models/SessionLog');
const User = require('../models/User');
const sessionController = require('../controllers/sessionController');

describe('Session Controller Permissions & Workflows', () => {
  let req, res, next;
  const mockUserId = new mongoose.Types.ObjectId();
  const mockGroupId = new mongoose.Types.ObjectId();
  const mockNonMemberId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('createSession permissions', () => {
    test('rejects session creation when user is not a member of the group (403)', async () => {
      req = {
        user: { _id: mockNonMemberId, name: 'Non Member' },
        body: {
          groupId: mockGroupId.toString(),
          title: 'Algorithms Sprint',
          scheduledAt: new Date(Date.now() + 3600000).toISOString()
        }
      };

      jest.spyOn(StudyGroup, 'findById').mockResolvedValue({
        _id: mockGroupId,
        name: 'Math Group',
        members: [new mongoose.Types.ObjectId()] // other member
      });

      await sessionController.createSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/member of this group/i)
        })
      );
    });

    test('creates session successfully when user is a group member (201)', async () => {
      req = {
        user: { _id: mockUserId, name: 'Alice Member' },
        body: {
          groupId: mockGroupId.toString(),
          title: 'Calculus Deep Dive',
          scheduledAt: new Date(Date.now() + 7200000).toISOString(),
          focusMinutes: 25,
          breakMinutes: 5,
          totalCycles: 4
        }
      };

      jest.spyOn(StudyGroup, 'findById').mockResolvedValue({
        _id: mockGroupId,
        name: 'Calculus Club',
        subject: 'Calculus',
        members: [mockUserId]
      });

      const mockCreatedSession = {
        _id: new mongoose.Types.ObjectId(),
        group: mockGroupId,
        host: mockUserId,
        title: 'Calculus Deep Dive',
        populate: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(StudySession, 'create').mockResolvedValue(mockCreatedSession);

      await sessionController.createSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringMatching(/scheduled successfully/i)
        })
      );
    });
  });

  describe('RSVP workflow', () => {
    test('allows group members to set RSVP to "going" or "maybe"', async () => {
      const mockSessionId = new mongoose.Types.ObjectId();
      req = {
        user: { _id: mockUserId },
        params: { id: mockSessionId.toString() },
        body: { status: 'going' }
      };

      const mockSession = {
        _id: mockSessionId,
        group: mockGroupId,
        rsvps: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(StudySession, 'findById').mockResolvedValue(mockSession);
      jest.spyOn(StudyGroup, 'findById').mockResolvedValue({
        _id: mockGroupId,
        members: [mockUserId]
      });

      await sessionController.setSessionRsvp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockSession.rsvps).toHaveLength(1);
      expect(mockSession.rsvps[0].status).toBe('going');
    });

    test('rejects invalid RSVP status with 400', async () => {
      req = {
        user: { _id: mockUserId },
        params: { id: new mongoose.Types.ObjectId().toString() },
        body: { status: 'invalid_status' }
      };

      await sessionController.setSessionRsvp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Session log & streak update workflow', () => {
    test('prevents duplicate study log submissions for same session (400)', async () => {
      const mockSessionId = new mongoose.Types.ObjectId();
      req = {
        user: { _id: mockUserId },
        params: { id: mockSessionId.toString() },
        body: {
          topicsStudied: ['Integration by parts'],
          focusRating: 5,
          minutesStudied: 50
        }
      };

      jest.spyOn(StudySession, 'findById').mockResolvedValue({
        _id: mockSessionId,
        group: mockGroupId
      });

      jest.spyOn(StudyGroup, 'findById').mockResolvedValue({
        _id: mockGroupId,
        members: [mockUserId]
      });

      jest.spyOn(SessionLog, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId()
      });

      await sessionController.submitSessionLog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/already submitted/i)
        })
      );
    });

    test('updates user studyHours and streak when new session log is submitted', async () => {
      const mockSessionId = new mongoose.Types.ObjectId();
      req = {
        user: { _id: mockUserId },
        params: { id: mockSessionId.toString() },
        body: {
          topicsStudied: ['Matrix Eigenvalues'],
          focusRating: 4,
          minutesStudied: 60,
          summary: 'Solved 10 problems on diagonalization.'
        }
      };

      jest.spyOn(StudySession, 'findById').mockResolvedValue({
        _id: mockSessionId,
        group: mockGroupId
      });

      jest.spyOn(StudyGroup, 'findById').mockResolvedValue({
        _id: mockGroupId,
        members: [mockUserId]
      });

      jest.spyOn(SessionLog, 'findOne').mockResolvedValue(null);
      jest.spyOn(SessionLog, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        minutesStudied: 60
      });

      const mockUserDoc = {
        _id: mockUserId,
        studyHours: 2.5,
        streak: 2,
        lastStudyDate: new Date('2026-10-21T10:00:00Z'),
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(User, 'findById').mockResolvedValue(mockUserDoc);

      await sessionController.submitSessionLog(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockUserDoc.studyHours).toBe(3.5); // 2.5 + 1.0 hour
      expect(mockUserDoc.save).toHaveBeenCalled();
    });
  });
});
