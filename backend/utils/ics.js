// ============================================
// iCalendar (.ics) Generator
// ============================================

/**
 * Format date to iCalendar UTC string format: YYYYMMDDTHHMMSSZ
 * @param {Date} date
 * @returns {string}
 */
const formatDateToIcs = (date) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates an iCalendar (.ics) string for a study session
 * @param {object} session
 * @returns {string}
 */
const generateSessionIcs = (session) => {
  const start = session.scheduledAt ? new Date(session.scheduledAt) : new Date();
  // Duration: cycles * (focusMinutes + breakMinutes)
  const totalMinutes = (session.totalCycles || 4) * ((session.focusMinutes || 25) + (session.breakMinutes || 5));
  const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

  const uid = `${session._id || Date.now()}@smartstudy.platform`;
  const dtStamp = formatDateToIcs(new Date());
  const dtStart = formatDateToIcs(start);
  const dtEnd = formatDateToIcs(end);
  const title = (session.title || 'Smart Study Session').replace(/\n/g, ' ');
  const description = (session.description || `Study session for ${session.subject || 'Smart Study'}`).replace(/\n/g, '\\n');
  const groupName = session.group?.name || 'Smart Study Group';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Study//Study Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:📚 ${title} (${groupName})`,
    `DESCRIPTION:${description}`,
    `LOCATION:${groupName}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
};

module.exports = {
  formatDateToIcs,
  generateSessionIcs
};
