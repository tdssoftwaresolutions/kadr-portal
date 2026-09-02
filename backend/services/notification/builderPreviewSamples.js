/**
 * Sample data for admin preview of code-built templates.
 */
function dailyDigestSample () {
  const now = new Date()
  const start = new Date(now)
  start.setHours(10, 0, 0, 0)
  const end = new Date(now)
  end.setHours(11, 0, 0, 0)

  return {
    recipientName: 'Alex Kumar',
    sections: {
      pendingApprovals: { clients: 2, mediators: 1 },
      pendingPayments: [
        { caseId: 'CASE-1001', reason: 'Mediation fee' },
        { caseId: 'CASE-1002', reason: 'Court filing fee' }
      ],
      pendingCaseAcceptance: [
        { caseId: 'CASE-2001', firstPartyName: 'Priya Sharma' }
      ],
      todayMeetings: [
        {
          title: 'Mediation session',
          caseId: 'CASE-1001',
          description: 'Joint session with both parties',
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          meeting_link: 'https://meet.example.com/abc'
        }
      ],
      pendingFeedback: [
        {
          title: 'Follow-up meeting',
          caseId: 'CASE-0999',
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString()
        }
      ],
      pendingSignatures: [
        { caseId: 'CASE-3001' }
      ]
    }
  }
}

const SAMPLES = {
  dailyDigest: dailyDigestSample
}

function getBuilderPreviewSample (templateKey, extra = {}) {
  const fn = SAMPLES[templateKey]
  const base = fn ? fn() : {}
  return { ...base, ...extra }
}

module.exports = {
  getBuilderPreviewSample,
  BUILDER_PREVIEW_KEYS: Object.keys(SAMPLES)
}
