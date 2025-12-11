const User = require('../../models/user.model')
const AwsUrlsModel = require('../../models/awsUrls.model')
const { isEmpty, startCase } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')
const { Parser } = require('json2csv')

const {
  filterByStatus,
  filterByDateRange,
  sortData,
  getPaginationArray,
  filterByKeyword,
  uploadFileToS3,
  modifyDateTimeWithOffset
} = require('../../helpers/helper')
const moment = require('moment')
const { deleteImageFromS3 } = require('../../configs/aws_delete')


module.exports = {
  adminUserList: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        status,
        startDate,
        endDate,
        sortKey,
        sortType,
        keyword,
        timezone
      } = req.query
      const whereStatement = {}
      const condition = {}

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      filterByKeyword(whereStatement, keyword)
      if (status) {
        if (status === 'deleted') {
          whereStatement.isDeleted = true
        } else {
          whereStatement.status = status
          whereStatement.isDeleted = false
        }
      }
      filterByDateRange(condition, startDate, endDate)
      const finalCondition = {
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)
      const aggregationPipeline = [
        { $addFields: { orders: 4 } },
        { $match: finalCondition },
        { $sort: sortPattern },
        ...getPaginationArray(parseInt(page), limit)
      ]
      const aggregationPipelineCSVFile = [
        { $addFields: { orders: 4 } },
        { $match: finalCondition },
        { $sort: sortPattern }
      ]
      const queryResult = await User.aggregate(aggregationPipeline)
      const queryResultCSV = await User.aggregate(aggregationPipelineCSVFile)
      const headerKeys = [
        {
          label: 'S.No.',
          value: 'srNo'
        },
        {
          label: 'Customer name',
          value: 'fullName'
        },
        {
          label: 'Mobile Number',
          value: 'mobile'
        },
        {
          label: 'Email ID',
          value: 'email'
        },
        {
          label: 'No. of orders', 
          value: 'orders'
        },
        {
          label: 'Added by',
          value: 'addedBy'
        },
        {
          label: 'Created date',
          value: 'createdAt'
        },
        {
          label: 'Status',
          value: 'status'
        }
      ]

      const reportData = queryResultCSV.map((item, i) => {
        return {
          srNo: i + 1,
          fullName: item?.fullName,
          mobile: item?.countryCode + '-' + item?.mobile,
          email: item?.email,
          orders: item?.orders,
          addedBy: 'Own',
          createdAt: modifyDateTimeWithOffset(
            item?.createdAt,
            timezone,
            'DD-MM-YYYY hh:mm A'
          ),
          status: startCase(item?.isDeleted ? "deleted" : item?.status)
        }
      })

      const json2csvParser = new Parser({ fields: headerKeys })
      const csv = json2csvParser.parse(reportData)
      const csvFilename = 'default/admin/customers-' + Date.now() + '.csv'
      await uploadFileToS3(csv, csvFilename, 'csv')
      let filePath = process.env.AWS_MEDIA_URL + `${csvFilename}`

      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? { ...queryResult[0], csvFilePath: filePath }
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  keywordFilter: async (req, res) => {
    try {
      let { keyword } = req.query

      if (isEmpty(keyword)) {
        return res.json(responseData('NOT_FOUND', {}, req, false))
      }
      let whereStatement = {}

      filterByKeyword(whereStatement, keyword)

      const finalCondition = {
        ...whereStatement
      }

      const aggregationPipelineUser = [
        { $addFields: { name: { $concat: ['$firstName', ' ', '$lastName'] } } },
        { $match: finalCondition },
        {
          $project: {
            email: 1,
            countryCode: 1,
            mobile: 1,
            firstName: 1,
            lastName: 1,
            userId: 1,
            userName: 1,
            name: 1,
            role: 'User'
          }
        }
      ]
      let queryResult = await User.aggregate(aggregationPipelineUser)
      return res.json(
        responseData(
          'GET_LIST',
          [...queryResult],
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  userDetail: async (req, res) => {
    try {
      let { userId } = req.query
      console.log('userId: ', userId)
      let whereStatement = {}
      if (isEmpty(userId)) {
        return res.json(responseData('NOT_FOUND', {}, req, false))
      }
      if (!isEmpty(userId)) {
        whereStatement._id = mongoose.Types.ObjectId(userId)
      }
      const finalCondition = {
        ...whereStatement
      }

      const aggregationPipeline = [
        // { $addFields: { name: { $concat: ['$firstName', ' ', '$lastName'] } } },
        { $match: finalCondition },
        {
          $addFields: {
            profilePic: {
              $cond: {
                if: { $ne: ['$profilePic', null] },
                then: {
                  $concat: [process.env.AWS_MEDIA_URL, '$profilePic']
                },
                else: ''
              }
            }
          }
        }
      ]
      let queryResult = await User.aggregate(aggregationPipeline)

      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0 ? queryResult[0] : {},
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  userOrderList: async (req, res) => {
    try {
      let { userId, sortKey, sortType, startDate, endDate } = req.query
      console.log('userId: ', userId, sortKey, sortType, startDate, endDate)
      const docs = [
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          productDetails: {
            name: 'stones',
            image:
              'https://ui-avatars.com/api/?name=Crude%oil&background=483fd5&color=fff&size=512',
            category: 'Crude oil',
            subCategory: 'oil',
            unit: 'litre'
          },
          pricePerUnit: 1000,
          quantity: 1000,
          totalAmount: 4500,
          totalMRP: 5000,
          discountOnMRP: 1000,
          vat: 500,
          createdAt: '2024-08-12T09:11:38.157Z',
          status: 'Completed'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          productDetails: {
            name: 'stones',
            image:
              'https://ui-avatars.com/api/?name=Crude%oil&background=483fd5&color=fff&size=512',
            category: 'Crude oil',
            subCategory: 'oil',
            unit: 'litre'
          },
          pricePerUnit: 1000,
          quantity: 1000,
          totalAmount: 4500,
          totalMRP: 5000,
          discountOnMRP: 1000,
          vat: 500,
          createdAt: '2024-08-12T09:11:38.157Z',
          status: 'Completed'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          productDetails: {
            name: 'stones',
            image:
              'https://ui-avatars.com/api/?name=Crude%oil&background=483fd5&color=fff&size=512',
            category: 'Crude oil',
            subCategory: 'oil',
            unit: 'litre'
          },
          pricePerUnit: 1000,
          quantity: 1000,
          totalAmount: 4500,
          totalMRP: 5000,
          discountOnMRP: 1000,
          vat: 500,
          createdAt: '2024-08-12T09:11:38.157Z',
          status: 'Completed'
        },
        {
          _id: '66b9d1ca874b1c1f2e616c52',
          productDetails: {
            name: 'stones',
            image:
              'https://ui-avatars.com/api/?name=Crude%oil&background=483fd5&color=fff&size=512',
            category: 'Crude oil',
            subCategory: 'oil',
            unit: 'litre'
          },
          pricePerUnit: 1000,
          quantity: 1000,
          totalAmount: 4500,
          totalMRP: 5000,
          discountOnMRP: 1000,
          vat: 500,
          createdAt: '2024-08-12T09:11:38.157Z',
          status: 'Completed'
        }
      ]
      const queryResult = [
        {
          docs: docs,
          totalDocsCount: 73,
          limit: 10,
          page: 1,
          totalPages: 8
        }
      ]
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? queryResult[0]
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
   
      const resp = await User.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      if (resp.modifiedCount) {
        return res.json(responseData('STATUS_UPDATE', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  awsUrl: async (req, res) => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const documentsToDelete = await AwsUrlsModel.find({
        status: 'unused',
        createdAt: { $lt: thirtyMinutesAgo }
      });

      await AwsUrlsModel.deleteMany({
        status: 'unused',
        createdAt: { $lt: thirtyMinutesAgo }
      });

      for (const document of documentsToDelete) {
        await deleteImageFromS3(process.env.AWS_BUCKET_NAME, document?.key)
      }

      console.log(' Unused aws urls documents has been deleted successfully.')
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
//   tempDelete: async(req,res)=>{


//  try {
//     const { id} = req.body;
//     console.log(id,"edc")   
//       // const resp = await User.updateOne(
//       //   { _id: id },
//       //   { $set: { isDeleted : true } }
//       // )
//       const resp = await User.findByIdAndUpdate({_id:id},{isDeleted:true},{new:true})
//       console.log(resp)
//       if (resp?.modifiedCount) {
//         return res.json(responseData('STATUS_UPDATE', {}, req, true))
//       } else {
//         return res.json(responseData('ERROR_OCCUR', {}, req, false))
//       }
//     } catch (error) {
//       return res.json(responseData('ERROR_OCCUR', error.message, req, false))
//     }
//   }
tempDelete: async (req, res) => {
  try {
    const { id } = req.body;   
 
    if (!id) {
      return res.json(responseData("ID_REQUIRED", {}, req, false));
    }

 
    const resp = await User.updateOne(
      { _id: id },
      { $set: { isDeleted: true } }
    );

    if (resp.modifiedCount > 0) {
      return res.json(responseData("USER_SOFT_DELETED", {}, req, true));
    }

    return res.json(responseData("NO_CHANGES_APPLIED", {}, req, false));

  } catch (error) {
    return res.json(
      responseData("ERROR_OCCUR", { error: error.message }, req, false)
    );
  }
}

}
