const express = require('express')
const generalController = require('../../controller/generalController')
const websiteContactController = require('../../controller/websiteContactController')
const pushController = require('../../controller/pushController')
const authMiddleware = require('../../middleware/authMiddleware')

const router = express.Router()

router.use(authMiddleware)

router.get('/getUserData', generalController.getUserData)
router.post('/verify-signature', generalController.verifySignature)
router.get('/getDashboardContent', generalController.getDashboardContent)
router.post('/updateUserProfile', generalController.updateUserProfile)
router.post('/deleteMyAccount', generalController.deleteMyAccount)

router.post('/push/register', pushController.register)
router.post('/push/unregister', pushController.unregister)

router.get('/portal/support/threads', websiteContactController.listPortalSupportThreads)
router.get('/portal/support/thread/:id', websiteContactController.getPortalSupportThread)
router.post('/portal/support/thread', websiteContactController.createPortalSupportThread)
router.post('/portal/support/thread/:id/messages', websiteContactController.postPortalUserMessage)

module.exports = router
