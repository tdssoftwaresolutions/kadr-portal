export function meetingEndDate (event) {
  if (!event) return null
  return event.end_datetime || event.end
}

export function isPastKadrCaseMeeting (event) {
  if (!event || (event.type && String(event.type).toUpperCase() !== 'KADR')) return false
  const end = meetingEndDate(event)
  if (!end) return false
  return new Date(end) < new Date()
}

export function mediatorMeetingFeedbackComplete (event) {
  const s = (event && event.meeting_summary ? String(event.meeting_summary) : '').trim()
  const n = (event && event.mediator_next_steps ? String(event.mediator_next_steps) : '').trim()
  return s.length > 0 && n.length > 0
}

export function mediatorNeedsMeetingFeedback (event) {
  return isPastKadrCaseMeeting(event) && !mediatorMeetingFeedbackComplete(event)
}

export function firstPartyNeedsRating (event) {
  return isPastKadrCaseMeeting(event) && (event.first_party_rating === null || event.first_party_rating === '')
}

export function secondPartyNeedsRating (event) {
  return isPastKadrCaseMeeting(event) && (event.second_party_rating === null || event.second_party_rating === '')
}

export function clientNeedsMeetingFeedback (event, userId, selectedCase) {
  if (!selectedCase || !userId) return false
  if (selectedCase.user_cases_first_partyTouser && selectedCase.user_cases_first_partyTouser.id === userId) {
    return firstPartyNeedsRating(event)
  }
  if (selectedCase.user_cases_second_partyTouser && selectedCase.user_cases_second_partyTouser.id === userId) {
    return secondPartyNeedsRating(event)
  }
  return false
}
