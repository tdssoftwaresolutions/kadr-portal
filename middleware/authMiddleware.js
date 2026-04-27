const errorCodes = require('../utils/errors/errorCodes')
const helper = require('../utils/helper')

const verifyToken = async (req, res, next) => {
  try {
    const error = await helper.checkTokenAndFetch(req, res)
    if (error) {
      return res.status(error.status || 401).json({
        success: false,
        error: error.message
      })
    }
    next()
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: errorCodes.INTERNAL_SERVER_ERROR
    })
  }
}

module.exports = verifyToken
