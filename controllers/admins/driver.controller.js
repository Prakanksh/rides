// const adminServices = require("../../services/admins/admin.services")
const driverService = require("../../services/admins/driver.services")

module.exports = {

    changeStatus: async (req, res) => {
    try {
      await driverService.changeStatus(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }   
}
}