const apiController = require('../controller/apiController')
const helper = require('../helper')

module.exports = async (req, res) => {
  await helper.checkTokenAndFetch(req, res)
  return await apiController.getUserData(req, res)
}
