const { responseData } = require('./responseData')
const { validationResult } = require('express-validator')
const crypto = require('crypto')
const _ = require('lodash')
const dotenv = require('dotenv')
const nodemailer = require('nodemailer')
const adminSetting = require('../models/setting.model')
const constant = require('./constant')
dotenv.config()
const bcrypt = require('bcryptjs')
const moment = require('moment')
const sendNotification = require('../helpers/firebase-admin')
const fs = require('fs')
const ejs = require('ejs')
const User = require('../models/user.model')
const dayjs = require('dayjs')
const EmailTemplate = require('../models/emailTemplate')
const Faq = require('../models/faq.model')
const Country = require('../models/countries.model')
const StaticContent = require('../models/staticcontent.model')
const Admin = require('../models/admin.model')
const UserNotificationModel = require('../models/userNotifications.model')
const Notification = require('../models/notification.model')
const { default: axios } = require('axios')
const { s3 } = require('../configs/aws_config')
const {S3Client, DeleteObjectCommand} = require('@aws-sdk/client-s3')
const TempUser = require('../models/tempUser.model')
const Subscription = require('../models/subscription.model')

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);


// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_KEY
//   }
// })

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    let temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
  return array
}

const createTransport = () => {
  try {
    return nodemailer.createTransport({
      pool: true,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } catch (error) {
    console.log("error in create transport in helper.js createTransport function=>>>>>>", error);
  }
};

const sendEmailCommon = async (subject, renderedTemplate, dataBody) => {
  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: dataBody.email,
      subject: subject,
      html: renderedTemplate,
    });
    console.log(`*******************mail send to user ${dataBody.email}***************`);
  } catch (error) {
    console.log("err in send mail in helper.js-> sendEmailCommon function ", error);
  }
};

module.exports = {
  getFileNameFromUrl: (urlString) => {
    // Create a new URL object from the string
    const parsedUrl = new URL(urlString)
    // Extract and return the file name from the pathname
    return parsedUrl.pathname.split('/').pop()
  },
  generateSecureReferralCode(length) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let referralCode = ''

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charactersLength)
      referralCode += characters.charAt(randomIndex)
    }

    return referralCode
  },
  generateRandomAlphanumericId(length) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let randomId = ''

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charactersLength)
      randomId += characters.charAt(randomIndex)
    }

    return randomId
  },
  generatePutPresignedUrl: async (
    bucketName,
    objectKey,
    ContentType,
    expiresIn = 60
  ) => {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
      ContentType: ContentType,
      Expires: expiresIn
    }

    try {
      return s3.getSignedUrl('putObject', params)
    } catch (err) {
      console.error('Error generating presigned URL:', err)
    }
  },

  generateSevenRandomNumber() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const charactersLength = characters.length
    let randomString = ''

    for (let i = 0; i < 7; i++) {
      const randomIndex = crypto.randomInt(0, charactersLength)
      randomString += characters.charAt(randomIndex)
    }
    return randomString
  },
  generateRandomScratchCardNumber() {
    const currentDate = dayjs().format('YYYYMMDD')
    const randomString = module.exports.generateSevenRandomNumber()
    return currentDate + randomString
  },
  sendNotificationAndroidIos: async function (
    receiverUser,
    title,
    description
  ) {
    await Notification.create({
      userId: receiverUser?._id,
      userType: 'user',
      title,
      description
    })
    if (receiverUser?.deviceType === 'android' && receiverUser?.notifications) {
      if (!_.isEmpty(receiverUser?.deviceToken)) {
        const messages = [
          {
            data: {
              title: title,
              body: description
              // type: type,
              // data: JSON.stringify(payload)
            },
            token: receiverUser?.deviceToken,
            android: { ttl: 10, priority: 'high' }
          }
        ]
        await sendNotification.sendNotifications(messages)
      }
    }
    if (receiverUser?.deviceType === 'ios' && receiverUser?.notifications) {
      if (!_.isEmpty(receiverUser?.deviceToken)) {
        const messages = [
          {
            notification: {
              title: title,
              body: description
            },
            // data: {
            //   type: type,
            //   ...obj,
            //   ...payload
            // },
            apns: {
              payload: {
                aps: {
                  sound: 'default'
                }
              }
            },
            token: receiverUser?.deviceToken,
            android: { ttl: 10, priority: 'high' }
          }
        ]
        await sendNotification.sendNotifications(messages)
      }
    }
  },
  handleListRequest: async function (data) {
    let {
      page,
      pageSize,
      keyword,
      status,
      startDate,
      endDate,
      sortKey ='sequence',
      sortType = 'desc'
    } = data
    const whereStatement = {}
    const condition = {}

    page = parseInt(page) || 1
    const limit = parseInt(pageSize) || 10
    module.exports.filterByKeyword(whereStatement, keyword)
    module.exports.filterByStatus(whereStatement, status)
    module.exports.filterByDateRange(condition, startDate, endDate)
    const finalCondition = {
      ...whereStatement,
      ...condition
    }
    const sortPattern = { createdAt: -1 }
    module.exports.sortData(sortPattern, sortKey, sortType)
    return [
      { $match: finalCondition },
      { $sort: sortPattern },
      ...module.exports.getPaginationArray(parseInt(page), limit)
    ]
  },
  getModelByType: (type) => {
    const typeToModelMapping = {
      [constant.type.admin]: Admin,
      [constant.type.subAdmin]: Admin,
      [constant.type.user]: User,
      [constant.type.faq]: Faq,
      [constant.type.country]: Country,
      [constant.staticKeywords.email]: EmailTemplate,
      [constant.staticKeywords.staticContent]: StaticContent,
      [constant.staticKeywords.subscription]: Subscription
    }

    return type in typeToModelMapping ? typeToModelMapping[type] : null
  },
  generateUniquePersonalCode(length) {
    const characters = '0123456789'
    const charactersLength = characters.length
    let personalCode = ''

    // Generate the desired length of the code
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength)
      personalCode += characters.charAt(randomIndex)
    }

    return personalCode
  },
  generateRandomAlphanumeric(length) {
    const passwordLength = length
    const numberChars = '0123456789'
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz'
    const specialChars = '#?@$%&'
    const allChars = numberChars + upperChars + lowerChars + specialChars
    let randPasswordArray = Array(passwordLength)
    randPasswordArray[0] = numberChars
    randPasswordArray[1] = upperChars
    randPasswordArray[2] = lowerChars
    randPasswordArray[3] = specialChars
    randPasswordArray = randPasswordArray.fill(allChars, 4)
    return shuffleArray(
      randPasswordArray.map((x) => x[Math.floor(Math.random() * x.length)])
    ).join('')
  },
  generateRandomPassword: async () => {
    const length = 10
    async function generateRandomBytes(byteLength) {
      const array = new Uint8Array(byteLength)
      crypto.getRandomValues(array)
      return array
    }

    const randomBytes = await generateRandomBytes(length)
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes[i] % charset.length
      password += charset.charAt(randomIndex)
    }
    return password
  },

  createNotificationsForLocalUsers: async (
    localUsers,
    requestObject,
    generatedSymbolAmount
  ) => {
    localUsers?.map(async (data) => {
      const theLocalUserId = data._id
      const paymentDetails = await paymentRequest
        .findOne({ acceptedBy: theLocalUserId })
        .sort({ createdAt: -1 })

      const notificationObject = {
        title: 'New payment request ',
        description: `A new payment request for ${generatedSymbolAmount} is created by tourist.`,
        userId: data?._id,
        type: 'paymentRequest',
        requestId: requestObject?._id,
        requestStatus: constant.status.pending
      }
      const currentDate = dayjs()
      const acceptedAtDateTime = dayjs(paymentDetails?.acceptedAt)

      const secondsDifference = currentDate.diff(acceptedAtDateTime, 'second')

      if (secondsDifference > 90) {
        await UserNotificationModel.create(notificationObject)
        if (data?.notifications) {
          await module.exports.sendNotificationAndroidIos(
            data,
            notificationObject?.title,
            notificationObject?.description,
            'newPaymentRequest'
          )
        }
      } else {
        if (!data.isBusy) {
          await UserNotificationModel.create(notificationObject)
          if (data?.notifications) {
            await module.exports.sendNotificationAndroidIos(
              data,
              notificationObject?.title,
              notificationObject?.description,
              'newPaymentRequest'
            )
          }
        }
      }
    })
  },
  generateRandomNumber(length) {
    const minLength = Math.pow(10, length - 1)
    const maxLength = Math.pow(10, length) - 1
    return Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
  },
  validatorMiddleware: (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res
        .status(200)
        .json(responseData(errors.errors[0].msg, {}, req, false))
    } else {
      next()
    }
  },
  sendEmail: async (slug, dataBody) => {
    let emailTempRecord = await EmailTemplate.findOne({ slug });
    if (!_.isEmpty(emailTempRecord)) {
      dataBody.title = `${emailTempRecord?.title}`;
      dataBody.subject = `${emailTempRecord?.subject}`;
      dataBody.logo = process.env.API_BASE_URL + "/images/logo.svg";

      const content = emailTempRecord?.description;
      const replacedContent = content.replace(/\[(\w+)\]/g, (match, p1) => {
        return dataBody[p1] || match;
      });

      dataBody.content = replacedContent;
      console.log('dataBody: ', dataBody);

      const template = fs.readFileSync("view/template/email.ejs", "utf8");
      const renderedTemplate = ejs.render(template, dataBody);
      await sendEmailCommon(dataBody?.subject, renderedTemplate, dataBody);
    } else {
      console.log("email template not found==>>>>>", slug);
    }
  },
  sendDynamicEmail: async (subject, email, content) => {
    const transporter = nodemailer.createTransport({
      pool: true,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // Specify the TLS version(s) your server supports
        // For example, use 'TLSv1.2' or 'TLSv1.3'
        // Adjust this based on your server's supported TLS versions
        minVersion: 'TLSv1.2'
      }
    })
    const template = fs.readFileSync('view/template/email.ejs', 'utf8')
    const params = { content }
    const renderedTemplate = ejs.render(template, params)
    const email_response = await transporter.sendMail({
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: subject,
      html: renderedTemplate
    })
    console.log({ email_response })
  },
  generateOTP: async (length) => {
    if (process.env.NODE_ENV === constant.type.production) {
      const minLength = Math.pow(10, length - 1)
      const maxLength = Math.pow(10, length) - 1
      return Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
    }
    return 1234
  },
  generateEmailOTP: async () => {
    let otp
    do {
      const buffer = crypto.randomBytes(2)
      otp = buffer.readUInt16BE(0)
    } while (otp < 1000 || otp > 9999)
    return 1234
  },
  capitalizeFirstLetter: (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase()
  },
  filterByStatus: function (whereStatement, status) {
    if (status) {
      whereStatement.status = status
    }
  },
  filterBySlug: function (whereStatement, slug) {
    if (slug) {
      whereStatement.slug = slug
    }
  },
  filterByDynamicKey: function (whereStatement, dynamicKey, value) {
    if (value) {
      whereStatement[dynamicKey] = value
    }
  },
  filterByAddedBy: function (whereStatement, addedBy) {
    if (addedBy) {
      whereStatement.addedBy = addedBy
    }
  },
  filterByKeyword: function (whereStatement, keyword) {
    if (keyword) {
      keyword = keyword.trim()
      whereStatement.$or = [
        'firstName',
        'lastName',
        'email',
        'mobile',
        'userId',
        'name',
        'title',
        'address',
        'fullName',
        'userDetail.name',
        'userDetail.firstName',
        'senderRecord.fullName',
        'productId',
        'rating'
      ].map((field) =>
        !['walletAmount'].includes(field)
          ? {
              [field]: { $regex: keyword, $options: 'i' }
            }
          : {
              [field]: { $eq: parseFloat(keyword) }
            }
      )
    }
  },
  filterByUserType: function (userTypeStatement, userType) {
    if (userType) {
      userTypeStatement.userType = { $regex: userType, $options: 'i' }
    }
  },
  filterByTitle: function (whereStatement, keyword) {
    if (keyword) {
      whereStatement.$or = ['title'].map((field) => ({
        [field]: { $regex: keyword, $options: 'i' }
      }))
    }
  },
  filterByKeywordEmail: function (whereStatementForEmail, keyword) {
    if (keyword) {
      whereStatementForEmail.$or = [
        { 'user.email': { $regex: keyword, $options: 'i' } }
      ]
    }
  },
  filterByDateRange: function (condition, startDate, endDate) {
    if (startDate && endDate) {
      const enddate = moment(endDate).endOf('day')
      condition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(enddate)
      }
    } else if (startDate && !endDate) {
      condition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(Date.now())
      }
    } else if (!startDate && endDate) {
      const enddate = moment(endDate).endOf('day')
      condition.createdAt = {
        $lte: new Date(enddate)
      }
    }
  },
  filterByDateRangeForDateCount: function (startDate, endDate) {
    const dateArray = []
    let currentDate = moment(startDate)
    const lastDate = moment(endDate)

    while (currentDate <= lastDate) {
      dateArray.push(moment(currentDate).format('YYYY-MM-DD'))
      currentDate = moment(currentDate).add(1, 'days')
    }

    return dateArray
  },
  sortData: function (sortPattern, sortBy, sortType) {
    if (sortBy && sortType) {
      delete sortPattern.createdAt
      sortPattern[sortBy] = sortType === 'asc' ? 1 : -1
    }
  },

  getPaginationArray: function (page, limit) {
    return [
      {
        $facet: {
          paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [
            {
              $count: 'value'
            }
          ]
        }
      },
      {
        $unwind: '$totalCount'
      },
      {
        $addFields: {
          docs: '$paginatedResults',
          totalDocs: '$totalCount.value',
          limit,
          page,
          totalPages: {
            $ceil: {
              $divide: ['$totalCount.value', limit]
            }
          }
        }
      },
      {
        $project: {
          paginatedResults: 0,
          totalCount: 0
        }
      }
    ]
  },
  getEmailTemplateDynamically: async (emailSlug) => {
    const emailTemplateRecord = await EmailTemplate.find({ slug: emailSlug })
    return emailTemplateRecord[0]
  },
  genSalt: async (saltRounds) => {
    return bcrypt.genSalt(saltRounds)
  },
  genHash: async (password, salt) => {
    return bcrypt.hash(password, salt)
  },
  convertCurrency: async (from, to, amount) => {
    console.log(process.env.CURRENCY_CONVERTER_ACCESS_KEY)
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://api.exchangeratesapi.io/v1/convert?access_key=${process.env.CURRENCY_CONVERTER_ACCESS_KEY}&from=${from}&to=${to}&amount=${amount}&format=1`,
      headers: {}
    }
    const currencyResult = await axios.request(config)
    return currencyResult.data?.result
  },
  getAllMonthsRecord(allMonths, finalArr, result) {
    for (const month of allMonths) {
      const foundItem = result.find((i) => {
        return i?.month === month
      })
      if (foundItem) {
        finalArr.push(foundItem)
      } else {
        finalArr.push({
          month: month,
          count: 0
        })
      }
    }
    return finalArr
  },
  filterUserRecord: (array, type) => {
    let result
    if (!array || array.length === 0) {
      return result
    }
    switch (type) {
      case constant.status.active: {
        result = array.filter((data) => data.status == constant.status.active)
        return result
      }
      case constant.status.inactive: {
        result = array.filter((data) => data.status == constant.status.active)
        return result.length || 0
      }
      case constant.accountType.paid: {
        result = array.filter(
          (data) => data.accountType === constant.accountType.paid
        )
        return result.length || 0
      }
      case constant.accountType.trial: {
        result = array.filter(
          (data) => data.accountType == constant.accountType.trial
        )
        return result.length
      }
      case 'cancelled': {
        result = array.filter((data) => data.isPlanCancelled === true)
        return result.length
      }

      case 30: {
        result = array.filter((data) => data?.createdDaysBefore <= 30)
        return result.length
      }
    }
  },
  sendResMessageOnCondition: function (
    condition,
    message,
    req,
    res,
    next,
    successStatus
  ) {
    return new Promise((resolve, reject) => {
      if (condition) {
        return res.json(responseData(`${message}`, {}, req, successStatus))
      } else {
        resolve()
      }
    })
  },
  createObjectFromParameter: function (req, array) {
    let object = {}
    array.map((data) => {
      if (
        req.body &&
        (req.body[data] || req.body[data] === '') &&
        req.body[data] !== undefined &&
        req.body[data] !== null
      ) {
        object[data] = req.body[data]
      } else {
        // parameter condition here fail hence do nothing with object
      }
    })
    return object
  },
  findRecordByType: async (table, type, value) => {
    let filter = {}
    if (type === constant.staticKeywords.email) {
      filter.email = value
    }
    return table.findOne(filter)
  },
  generatePassword: async (length) => {
    const passwordLength = length
    const numberChars = '0123456789'
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz'
    const specialChars = '#?!@$%^&*-'
    const allChars = numberChars + upperChars + lowerChars + specialChars
    const randPasswordArray = Array(passwordLength)
    randPasswordArray[0] = numberChars
    randPasswordArray[1] = upperChars
    randPasswordArray[2] = lowerChars
    randPasswordArray[3] = specialChars
    randPasswordArray.fill(allChars, 4)

    const randomBytes = crypto.randomBytes(passwordLength) // Generate all random bytes at once
    let randomBytesIndex = 0 // Track the current position in randomBytes
    return shuffleArray(
      randPasswordArray.map(function (x) {
        const randomIndex = randomBytes.readUInt8(randomBytesIndex) % x.length
        randomBytesIndex = (randomBytesIndex + 1) % passwordLength
        return x[randomIndex]
      })
    ).join('')
  },
  sendOtp: (countryCode, mobile, otp) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const client = require('twilio')(accountSid, authToken)
    const message =
      'Use ' +
      otp +
      ' as the One Time Password (OTP) to sign in to your Quotes For It Account. Do not share this OTP with anyone.'
    if (countryCode.toString()[0] === '+') countryCode = countryCode.slice(1)
    client.messages
      .create({
        body: message,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        to: `+${countryCode}${mobile}`
      })
      .then((resp) => {
        console.log('SMS Sent Successfully. ' + `+${countryCode}${mobile}`)
        return `SMS Sent Successfully. +${countryCode}${mobile}`
      })
      .catch((err) => {
        console.log('SMS Fails err', err)
        return 'SMS Fails Successfully.' + ' ' + err.toString()
      })
  },
  getArrayMaxMinCount: (array) => {
    let maxCount = -Infinity
    let minCount = Infinity
    let result = {}
    array.forEach((item) => {
      if (item.count > maxCount) {
        maxCount = item.count
        result.topUsedSubscriptionName = item
      }
    })
    array.forEach((item) => {
      if (item.count < minCount) {
        minCount = item.count
        result.leastUsedSubscriptionName = item
      }
    })
    return result
  },
  getCompleteMonthDetails(year, allMonths) {
    let arrayOfMonths = []
    for (let months of allMonths) {
      let monthObject = {}
      monthObject.monthNumber = JSON.parse(moment().month(months).format('M'))
      monthObject.monthName = months
      let yearMonth = `${year}-${months}`
      monthObject.startDate = moment(yearMonth, 'YYYY-MMM')
        .startOf('month')
        .format('YYYY-MM-DD')
      monthObject.endDate = moment(yearMonth, 'YYYY-MMM')
        .endOf('month')
        .format('YYYY-MM-DD')
      arrayOfMonths.push(monthObject)
    }
    return arrayOfMonths
  },
  getAdminSetting: async () => {
    return adminSetting.findOne()
  },
  createTransactionObject: function (type, object) {
    return {
      transactionId: object?.transactionId,
      transactionAmount: object?.transactionAmount,
      transactionType: object?.transactionType,
      userType: object?.userType,
      type: type,
      senderId: object?.senderId,
      senderType: object?.senderType,
      receiverId: object?.receiverId,
      receiverType: object?.receiverType
    }
  },
  calculateMonths(startDate, endDate) {
    startDate = moment(startDate)
    endDate = moment(endDate)
    const months = []
    const currentMonth = startDate.clone()

    while (
      currentMonth.isBefore(endDate) ||
      currentMonth.isSame(endDate, 'month')
    ) {
      months.push({
        monthName: currentMonth.format('MMMM'),
        monthNumber: currentMonth.month() + 1
      })
      currentMonth.add(1, 'month')
    }
    return { success: true, message: '', data: months }
  },
  calculateYears(startDate, endDate) {
    startDate = moment(startDate)
    endDate = moment(endDate)

    const years = []
    const currentYear = startDate.clone()

    while (
      currentYear.isBefore(endDate) ||
      currentYear.isSame(endDate, 'year')
    ) {
      years.push(currentYear.year().toString())
      currentYear.add(1, 'year')
    }
    return { success: true, message: '', data: years }
  },
  calculateWeeks(startDate, endDate) {
    startDate = moment(startDate)
    endDate = moment(endDate)

    const weeks = []
    let currentWeek = startDate.clone().startOf('isoWeek')

    while (
      currentWeek.isBefore(endDate) ||
      currentWeek.isSame(endDate, 'isoWeek')
    ) {
      const startOfWeek = currentWeek.format('YYYY-MM-DD')
      const endOfWeek = currentWeek
        .clone()
        .endOf('isoWeek')
        .format('YYYY-MM-DD')

      weeks.push({ startOfWeek, endOfWeek })
      currentWeek.add(1, 'week')
    }

    return { success: true, message: '', data: weeks }
  },
  formatDate(date) {
    return date.toISOString().split('T')[0]
  },
  getDatesByType(type, startDate, endDate) {
    switch (type) {
      case 'month':
        return module.exports.calculateMonths(startDate, endDate)
      case 'year':
        return module.exports.calculateYears(startDate, endDate)
      case 'week':
        return module.exports.calculateWeeks(startDate, endDate)
      default:
        return module.exports.getAllDatesBetween(startDate, endDate)
    }
  },
  checkUserRecord: async (userId, condition) => {
    const userRecord = await User.findOne({ _id: userId })
    let responseObject = {}
    if (_.isEmpty(userRecord)) {
      responseObject.message = 'USER_NOT_FOUND'
      responseObject.error = true
      responseObject.data = null
    } else if (userRecord?.status === constant.status.inactive) {
      responseObject.message = 'USER_INACTIVE'
      responseObject.error = true
      responseObject.data = null
    } else {
      responseObject.message = 'SUCCESS'
      responseObject.error = false
      responseObject.data = userRecord
    }
    return responseObject
  },
  getDynamicRecord: async (collectionName, condition, req, res) => {
    return collectionName.findOne(condition)
  },
  generatePercentage(amount, percentage) {
    return (amount * percentage) / 100
  },
  generateCurrencySymbol(amount, currency) {
    return amount.toLocaleString('th-TH', {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol'
    })
  },
  ternaryCondition: (condition, first, second) => {
    return condition ? first : second
  },
  andOperator: (condition, text) => {
    return condition && text
  },
  checkIfRecordExists: async (model, query, errorMsg, req, res) => {
    const userDetail = await model.findOne(query)
    if (!_.isEmpty(userDetail)) {
      res.json(responseData(errorMsg, {}, req, false))
      return true
    }
    return false
  },
  handleEditFieldFunction: async (updateObj, key, value) => {
    if (value) {
      updateObj[key] = value
      return updateObj
    }
  },
  uploadFileToS3: async (buffer, fileName, docType) => {
    const bucketName = process.env.AWS_BUCKET_NAME

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: 'application/pdf',
      acl: 'public-read'
    }

    if (docType === 'csv') {
      params.ContentType = 'text/csv'
    }

    try {
      return await s3.upload(params).promise()
    } catch (error) {
      console.error('Error uploading location to S3:', error)
      throw error
    }
  },
  modifyDateTimeWithOffset: (
    dateTime,
    offset,
    format = 'DD-MM-YYYY hh:mm A'
  ) => {
    let parsedDateTime = moment(dateTime)

    if (offset < 0) {
      parsedDateTime = parsedDateTime.subtract(offset, 'minutes')
    } else if (offset > 0) {
      parsedDateTime = parsedDateTime.add(offset, 'minutes')
    }

    return parsedDateTime.format(format)
  },
  async deleteImageFromS3(objectKey) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: objectKey
    }
    try {
      const command = new DeleteObjectCommand(params)
      const response = await s3Client.send(command)
      console.log('Image deleted successfully:', response)
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  },
  handleTempUser: async (
    fullName,
    mobile,
    email,
    countryCode
  ) => {
    const tempUserFind = await TempUser.find({
      $or: [{ fullName }, { mobile }, { countryCode }, { email }]
    })
  
    if (!_.isEmpty(tempUserFind)) {
      await TempUser.deleteOne({ _id: tempUserFind?._id })
    }
  },
  checkIfUserExists: async (query, errorMsg, req, res) => {
    const userDetail = await User.findOne(query)
    if (!_.isEmpty(userDetail)) {
      res.json(responseData(errorMsg, {}, req, false))
      return true
    }
    return false
  },
  checkIfUserExistsForCSV: async (query) => {
    const userDetails = await User.findOne(query)
    console.log('userDetails: ', userDetails, !_.isEmpty(userDetails));
    return !_.isEmpty(userDetails);
  },
  sendOtpTwilio: async (countryCode, mobile) => {
    console.log("process.env.TWILIO_MESSAGING_SERVICE_SID", process.env.TWILIO_MESSAGING_SERVICE_SID, process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    client.verify.v2.services(process.env.TWILIO_MESSAGING_SERVICE_SID)
    .verifications
    .create({to: `+${countryCode}${mobile}`, channel: 'sms'})
    .then(verification => console.log(verification.sid))
    .catch((err) => {
      console.log('SMS Fails err', err)
      return 'SMS Fails Successfully.' + ' ' + err.toString()
    })
  },
  verifyOTPTwilio: async (countryCode, mobile, otp) => {
    try{
      const verificationCheck = await client.verify.v2
        .services(process.env.TWILIO_MESSAGING_SERVICE_SID)
        .verificationChecks.create({
          code: otp,
          to: `+${countryCode}${mobile}`
        })
        if(verificationCheck){
          return verificationCheck.status
        }
    } catch (err) {
      console.log('err: ', err);
      console.log('SMS Fails err', err?.message)
    }
  }
}
