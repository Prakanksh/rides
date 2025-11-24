const { default: mongoose } = require('mongoose');
const commonAggregationPipeline = require('../../helpers/commonAggregationPipeline');
const { responseData } = require('../../helpers/responseData');
const { filterByKeyword, filterByDynamicKey, filterByDateRange, sortData, getPaginationArray, modifyDateTimeWithOffset, uploadFileToS3, sanitizeKeyword } = require('../../helpers/helper');
const Transaction = require('../../models/transactions.model');
const constant = require('../../helpers/constant');
const { Parser } = require('json2csv')

module.exports = {
  listEarning: async (req, res) => {
    try {
      let { page, pageSize, keyword, startDate, endDate, sortKey, sortType, currency, paymentType, timezone } = req.query

      const condition = {
        isCancelled: false
      };
      const whereStatement = {}

      filterByKeyword(whereStatement, sanitizeKeyword(keyword))
      filterByDynamicKey(whereStatement, 'currency', currency)
      filterByDynamicKey(whereStatement, 'paymentType', paymentType)

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      filterByDateRange(condition, startDate, endDate)
      const finalCondition = {
        ...whereStatement,
        ...condition
      }
      const sortPattern = { createdAt: -1 }
      sortData(sortPattern, sortKey, sortType)

      const commonPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern },
        commonAggregationPipeline.userLookupPipeline,
        commonAggregationPipeline.userUnwindPipeline,
        {
          $project: {
            transactionID: "$transactionId",
            transactionType: 1,
            type: {
              $cond: {
                if: { $eq: ["$type", 'buy']},
                then: "Buying Product",
                else: "Hiring Product",
              }
            },
            createdAt: 1,
            currency: 1,
            amount: "$transactionAmount",
            discountPrice: "$discountedPrice",
            adminCommission: 1,
            paymentType: 1,
            supplierEarning: "$supplierCommission",
            VAT: "$VATAmount",
            name: "$userDetails.fullName",
            orderId: 1
          }
        },
      ]

      const aggregationQuery = [...commonPipeline, ...getPaginationArray(parseInt(page), limit)]


      const queryResult = await Transaction.aggregate(aggregationQuery)
      const queryResultCSV = await Transaction.aggregate(commonPipeline)
      const headerKeysArrayAdminEarning = [
        {
          label: 'S/No.',
          value: 'srNo'
        },
        {
          label: 'Transaction ID',
          value: 'transactionID'
        },
        {
          label: 'Order ID',
          value: 'orderId'
        },
        {
          label: 'Customer name',
          value: 'name'
        },
        {
          label: 'Type of transaction',
          value: 'type'
        },
        {
          label: 'Transaction amount',
          value: 'amount'
        },
        {
          label: 'Discount price',
          value: 'discountPrice'
        },
        {
          label: 'VAT',
          value: 'VAT'
        },
        {
          label: 'Admin commission',
          value: 'adminCommission'
        },
        {
          label: 'Supplier earnings',
          value: 'supplierCommission'
        },
        {
          label: 'Type of payment',
          value: 'paymentType'
        },
        {
          label: 'Created at',
          value: 'createdAt'
        },
      ]
      const reportDataArr = queryResultCSV.map((item, i) => {
        return {
          srNo: i + 1,
          transactionID: item?.transactionID,
          orderId: item?.orderId,
          name: item?.name,
          type: item?.type,
          amount: item?.amount + ' ' + item?.currency,
          discountPrice: item?.discountPrice + ' ' + item?.currency,
          VAT: item?.VAT + ' ' + item?.currency,
          adminCommission: item?.adminCommission + ' ' + item?.currency,
          supplierCommission: item?.supplierEarning + ' ' + item?.currency,
          paymentType:  item?.paymentType === "payByAccount" ? "Pay By Account" : "	Immediate Payment",
          createdAt: modifyDateTimeWithOffset(
            item?.createdAt,
            timezone,
            'DD-MM-YYYY hh:mm A'
          ),
        }
      })

      const json2csvParserAdminEarning = new Parser({ fields: headerKeysArrayAdminEarning })
      const csvAdminEarning = json2csvParserAdminEarning.parse(reportDataArr)
      const csvFileAdminEarning = 'default/admin/earnings-' + Date.now() + '.csv'
      await uploadFileToS3(csvAdminEarning, csvFileAdminEarning, 'csv')
      let filePathDataAdminEarning = process.env.AWS_MEDIA_URL + `${csvFileAdminEarning}`
      return res.json(
        responseData(
          'GET_LIST',
          queryResult.length > 0
            ? {...queryResult[0], csvFilePath: filePathDataAdminEarning}
            : constant.staticResponseForEmptyResult,
          req,
          true
        )
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  }
}
