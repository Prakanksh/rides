const Subscription = require('../../models/subscription.model')
const { responseData } = require('../../helpers/responseData')
const {
  filterByStatus,
  filterByDateRange,
  getPaginationArray,
  filterByKeyword,
  sortData,
  filterByUserType,
} = require('../../helpers/helper')
const constant = require('../../helpers/constant')
const { default: mongoose } = require('mongoose')
const subscriptionModel = require('../../models/subscription.model')
const adminSettingModel = require('../../models/adminSetting.model')

module.exports = {
 
  createSubscription : async (req, res) => {
  try {
    const { name, validityDays, price, benefits } = req.body;

    const existing = await subscriptionModel.findOne({ name: name });
    if (existing) {
     
       return res.json(responseData('PLAN_ALREADY_EXISTS', {}, req, false));
    }
  const adminSetting = await adminSettingModel
      .findOne()
      .select('commissionPercentage -_id');

    if (!adminSetting) {
      return res.json(responseData('ADMIN_SETTING_NOT_FOUND', {}, req, false));
    }

    const adminCommission = Number(adminSetting.commissionPercentage);

    // Validate discount percentage must be LESS than admin commission
    if (Number( benefits.rideDiscountPercent) >= adminCommission)
     {
      return res.json(
        responseData(
          'INVALID_DISCOUNT_VALUE',
          { message: `Discount must be less than admin commission (${adminCommission}%)` },
          req,
          false
        )
      );
    }

      // if(admin)
    const plan = await subscriptionModel.create({
      name,
      validityDays,
      price,
      benefits
    });

  
     return res.json(responseData('PLAN_CREATED', plan, req, true));
  } catch (err) {
     return res.json(responseData("ERROR_OCCUR", err.message, req, false));
  }
},
  

subscriptionList: async (req, res) => {
  try {
    let {
      page,
      pageSize,
      keyword,
      status,
      sortKey,
      sortType,
      startDate,
      endDate
    } = req.query;

    page = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 10;

    let whereStatement = {};
    let condition = {};

    if (keyword) {
      whereStatement.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }

    // if (status === "active") whereStatement.active = true;
    // if (status === "inactive") whereStatement.active = false;
    
if (status) {
      whereStatement.status = status;
    }
    if (startDate || endDate) {
      condition.createdAt = {};
      if (startDate) condition.createdAt.$gte = new Date(startDate);
      if (endDate) condition.createdAt.$lte = new Date(endDate);
    }

    const finalCondition = {
      ...whereStatement,
      ...condition
    };


    const sortPattern = {};
    const allowedSortKeys = ["createdAt", "price", "validityDays", "name"];

    if (allowedSortKeys.includes(sortKey)) {
      sortPattern[sortKey] = sortType === "asc" ? 1 : -1;
    } else {
      sortPattern.createdAt = -1; 
    }

    const skip = (page - 1) * limit;

    const aggregationPipeline = [
      { $match: finalCondition },
      { $sort: sortPattern },
      {
        $facet: {
          meta: [
            { $count: "total" },
            {
              $addFields: {
                page,
                pageSize: limit
              }
            }
          ],
          data: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ];

    const result = await Subscription.aggregate(aggregationPipeline);

    const response = {
      meta: result[0].meta[0] || { total: 0, page, pageSize: limit },
      data: result[0].data
    };

    return res.json(responseData("GET_LIST", response, req, true));
  } catch (error) {
    console.log("error", error);
    return res.json(responseData("ERROR_OCCUR", error.message, req, false));
  }
},

  editSubscription: async (req, res) => {
  try {
    const { id } = req.params;
    const { benefits } = req.body;
const adminSetting = await adminSettingModel
      .findOne()
      .select('commissionPercentage -_id');

    if (!adminSetting) {
      return res.json(responseData('ADMIN_SETTING_NOT_FOUND', {}, req, false));
    }

    const adminCommission = Number(adminSetting.commissionPercentage);

    // Validate discount percentage must be LESS than admin commission
    if (Number( benefits.rideDiscountPercent) >= adminCommission)
     {
      return res.json(
        responseData(
          'INVALID_DISCOUNT_VALUE',
          { message: `Discount must be less than admin commission (${adminCommission}%)` },
          req,
          false
        )
      );
    }
    const updated = await subscriptionModel.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updated) {
       return res.json(responseData("PLAN_NOT_FOUND", error.message, req, false));
   
    }
return res.json(responseData("PLAN_UPDATED",updated, req, true));
  
  } catch (err) {
      return res.json(responseData('ERROR_OCCUR', err.message, req, false));
  }
},
  viewSubscription: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json(responseData('SUBSCRIPTION_NOT_FOUND', {}, req, false));
      }
      const subscription = await Subscription.findById(id);

      if (!subscription) {
        return res.json(responseData('SUBSCRIPTION_NOT_FOUND', {}, req, false));
      }

      return res.json(responseData('SUBSCRIPTION_FOUND', subscription, req, true));
    } catch (error) {
      console.log('error', error);
      return res.json(responseData('ERROR_OCCUR', error.message, req, false));
    }
  },
  statusChange: async (req, res) => {
    try {
      const { status } = req.body
      if (!['active', 'inactive'].includes(status)) {
        return res
          .status(400)
          .json(responseData('INVALID_STATUS', {}, req, false))
      }
      await Subscription.updateOne(
        { _id: req.params.id },
        { $set: { status } }
      )
      return res.json(responseData('STATUS_UPDATE', {}, req, true))

    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
};
