const { success } = require('../utils/responses')
const { createError } = require('../utils/errors')
const errorCodes = require('../utils/errors/errorCodes')
const { assertAdminPage } = require('../utils/adminPermissionHelpers')
const websiteContentService = require('../services/website/websiteContentService')

async function assertWebsiteAdmin (req) {
  if (req.user.type !== 'ADMIN') throw createError(errorCodes.FORBIDDEN)
  await assertAdminPage(req, 'website-content')
}

module.exports = {
  getContent: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const content = await websiteContentService.getAdminContent()
      success(res, content)
    } catch (err) {
      next(err)
    }
  },

  getPublicFaq: async function (req, res, next) {
    try {
      const categories = await websiteContentService.getPublicFaq()
      success(res, { categories })
    } catch (err) {
      next(err)
    }
  },

  saveSettings: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const settings = await websiteContentService.saveSettings(req.body)
      success(res, { settings }, 'Contact settings saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  saveBanner: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const banner = await websiteContentService.saveBanner(req.body)
      success(res, { banner }, 'Banner saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  saveTestimonial: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const testimonial = await websiteContentService.saveTestimonial(req.body)
      success(res, { testimonial }, 'Testimonial saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  deleteTestimonial: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      await websiteContentService.deleteTestimonial(req.params.id)
      success(res, {}, 'Testimonial deleted and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  savePricingPlan: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const plan = await websiteContentService.savePricingPlan(req.body)
      success(res, { plan }, 'Pricing plan saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  deletePricingPlan: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      await websiteContentService.deletePricingPlan(req.params.id)
      success(res, {}, 'Pricing plan deleted and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  saveFaqCategory: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const category = await websiteContentService.saveFaqCategory(req.body)
      success(res, { category }, 'FAQ category saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  deleteFaqCategory: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      await websiteContentService.deleteFaqCategory(req.params.id)
      success(res, {}, 'FAQ category deleted and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  saveFaqItem: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const item = await websiteContentService.saveFaqItem(req.body)
      success(res, { item }, 'FAQ item saved and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  deleteFaqItem: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      await websiteContentService.deleteFaqItem(req.params.id)
      success(res, {}, 'FAQ item deleted and website pages updated')
    } catch (err) {
      next(err)
    }
  },

  regenerate: async function (req, res, next) {
    try {
      await assertWebsiteAdmin(req)
      const content = await websiteContentService.regenerateFromDb()
      success(res, content, 'Website pages regenerated')
    } catch (err) {
      next(err)
    }
  }
}
