const { responseData } = require('../../helpers/responseData')
const { filterByDateRange } = require('../../helpers/helper')
const User = require('../../models/user.model')

const Product = require('../../models/product.model')
const Admin = require('../../models/admin.model')
const Category = require('../../models/category.model')
module.exports = {
  dashboard: async (req, res) => {
    try {
      const { startDate, endDate } = req.query
      let condition = {}
      filterByDateRange(condition, startDate, endDate)

      const [
        totalNumberOfCustomers,
        totalActiveUsers,
        totalInactiveUsers,
        totalNumberOfSubAdmins,
        totalActiveSubAdmins,
        totalInactiveSubAdmin,
        totalNumberOfProducts,
        totalActiveProducts,
        totalInactiveProducts,
        totalNumberOfCategory,
        totalActiveCategory,
        totalInactiveCategory
      ] = await Promise.all([
        User.countDocuments({ ...condition }),
        User.countDocuments({ ...condition, status: "active" }),
        User.countDocuments({ ...condition, status: "inactive" }),
        Admin.countDocuments({ ...condition, role: "subAdmin" }),
        Admin.countDocuments({ ...condition, role: "subAdmin", status: "active" }),
        Admin.countDocuments({ ...condition, role: "subAdmin", status: "inactive" }),
        Product.countDocuments({ ...condition }),
        Product.countDocuments({ ...condition, status: 'active' }),
        Product.countDocuments({ ...condition, status: 'inactive' }),
        Category.countDocuments({ ...condition }),
        Category.countDocuments({ ...condition, status: 'active' }),
        Category.countDocuments({ ...condition, status: 'inactive' })
      ]);

      const totalEarnings = 0;
      const totalNumberOfOrders = 0;

      const dashboardObj = {
        totalNumberOfCustomers,
        totalNumberOfSubAdmins,
        totalActiveSubAdmins,
        totalInactiveSubAdmin,
        totalEarnings,
        totalNumberOfOrders,
        totalNumberOfProducts,
        totalActiveProducts,
        totalInactiveProducts,
        totalInactiveCategory,
        totalActiveCategory,
        totalNumberOfCategory,
        totalActiveUsers,
        totalInactiveUsers
      }
      return res.json(responseData('GET_LIST', dashboardObj, req, true))
    } catch (err) {
      return res.json(responseData('ERROR_OCCUR', err.message, req, false))
    }
  },
  graphManager: async (req, res) => {
    try {
      const { month, year } = req.query
      console.log('month: year:', month, year);

      const dashboardObj = {
        userRegistrationGraph: {
          xAxis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          yAxis: [12, 23, 45, 66, 76, 87, 89, 53, 84, 2, 45, 78, 342, 67, 234, 77, 53, 173, 53, 46, 43, 56, 34]
        },
        orderManagerGraph: {
          xAxis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          yAxis: [12, 23, 45, 66, 76, 87, 89, 53, 67, 2, 45, 78, 852, 67, 234, 77, 53, 173, 53, 46, 43, 56, 34]
        },
        earningsInEuroGraph: {
          xAxis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          yAxis: [12, 23, 45, 66, 76, 87, 89, 53, 67, 2, 45, 78, 342, 67, 234, 647, 53, 173, 53, 46, 43, 56, 34]
        },
        earningsInGBPGraph: {
          xAxis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          yAxis: [12, 23, 369, 66, 76, 87, 89, 53, 67, 2, 45, 78, 342, 67, 234, 77, 53, 173, 53, 46, 43, 56, 34]
        }
      }
      return res.json(responseData('GET_LIST', dashboardObj, req, true))
    } catch (err) {
      return res.json(responseData('ERROR_OCCUR', err.message, req, false))
    }
  }
}
