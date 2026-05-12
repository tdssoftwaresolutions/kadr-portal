const legacyCustomContent = require('./legacyCustomContent')
const dailyDigest = require('./dailyDigest')
const authTemplates = require('./authTemplates')
const paymentTemplates = require('./paymentTemplates')
const signatureTemplates = require('./signatureTemplates')
const meetingTemplates = require('./meetingTemplates')
const adminTemplates = require('./adminTemplates')
const blogTemplates = require('./blogTemplates')
const caseCorrespondenceTemplates = require('./caseCorrespondenceTemplates')
const websiteContactTemplates = require('./websiteContactTemplates')

module.exports = {
  legacyCustomContent,
  dailyDigest,
  ...authTemplates,
  ...paymentTemplates,
  ...signatureTemplates,
  ...meetingTemplates,
  ...adminTemplates,
  ...blogTemplates,
  ...caseCorrespondenceTemplates,
  ...websiteContactTemplates
}
