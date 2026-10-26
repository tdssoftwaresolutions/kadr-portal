const helper = require('../../utils/helper')

const ZOOM_REF_PREFIX = 'zoom:'

/**
 * Side effects that must run whenever a case is closed (status flips to
 * CLOSED_SUCCESS/CLOSED_NO_SUCCESS). Currently only called from
 * generalController.markCaseResolved, the sole place a case is closed today.
 */

/**
 * Cancel any KADR meetings still scheduled in the future for a case that just
 * closed: cancels the Zoom meeting itself (if one is linked via
 * external_ref), emails the mediator/parties that it's been cancelled, then
 * removes the local event record. Each step is best-effort and independently
 * caught — a Zoom API hiccup or email failure must never block the others or
 * bubble up to the caller (case closure itself must still succeed). Safe to
 * call even if no meetings are scheduled.
 */
async function cancelFutureMeetingsForCase (prisma, caseId) {
  if (!caseId) return { cancelledCount: 0 }

  const meetings = await prisma.events.findMany({
    where: {
      case_id: caseId,
      type: 'KADR',
      start_datetime: { gt: new Date() }
    },
    select: {
      id: true,
      title: true,
      start_datetime: true,
      end_datetime: true,
      external_ref: true,
      cases: {
        select: {
          caseId: true,
          user_cases_mediatorTouser: { select: { name: true, email: true } },
          user_cases_first_partyTouser: { select: { name: true, email: true } },
          user_cases_second_partyTouser: { select: { name: true, email: true } }
        }
      }
    }
  })

  if (!meetings.length) return { cancelledCount: 0 }

  for (const meeting of meetings) {
    if (meeting.external_ref?.startsWith(ZOOM_REF_PREFIX)) {
      const zoomMeetingId = meeting.external_ref.slice(ZOOM_REF_PREFIX.length)
      try {
        await helper.cancelZoomMeeting(zoomMeetingId)
      } catch (error) {
        console.error(`Failed to cancel Zoom meeting for event ${meeting.id}:`, error.message)
      }
    }

    const scheduleRange = helper.formatMeetingRangeIST(meeting.start_datetime, meeting.end_datetime)
    const recipients = [
      meeting.cases?.user_cases_mediatorTouser,
      meeting.cases?.user_cases_first_partyTouser,
      meeting.cases?.user_cases_second_partyTouser
    ].filter((u) => u?.email)

    for (const recipient of recipients) {
      try {
        await helper.sendTemplatedEmail('meetingCancelledCaseClosed', recipient.email, {
          recipientName: recipient.name || 'there',
          caseId: meeting.cases?.caseId || '',
          title: meeting.title || 'Mediation meeting',
          scheduleRange
        }, [], { caseId })
      } catch (error) {
        console.error(`Failed to send meeting-cancelled email to ${recipient.email}:`, error.message)
      }
    }
  }

  const result = await prisma.events.deleteMany({
    where: {
      case_id: caseId,
      type: 'KADR',
      start_datetime: { gt: new Date() }
    }
  })
  return { cancelledCount: result.count }
}

module.exports = { cancelFutureMeetingsForCase }
