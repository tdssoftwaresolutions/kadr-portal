const apiController = require('../controller/apiController')

module.exports = async (req, res) => {
  return await apiController.newUserSignup(req, res)
}
