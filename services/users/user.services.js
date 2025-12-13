const EmailOtp = require('../../models/emailOtp.model')
const User = require('../../models/user.model')
const TempUser = require('../../models/tempUser.model')
const Otp = require('../../models/otp.model')
const { v4: uuidv4 } = require('uuid')
const constant = require('../../helpers/constant')
const axios = require('axios')
const bcrypt = require('bcryptjs')
const { verifyMobileOTP, verifyEmailOTP } = require("../../helpers/verifyOtp");


const {
  generateOTP,
  getAdminSetting,
  generatePutPresignedUrl,
  generateEmailOTP,
  genHash,
  genSalt,
  filterByKeyword,
  filterByStatus,
  getPaginationArray
} = require('../../helpers/helper')
const { isEmpty } = require('lodash')
const {
  responseData,
  generateAuthToken
} = require('../../helpers/responseData')
const moment = require('moment')
const JWT = require('jsonwebtoken')
const { default: mongoose } = require('mongoose')
const Category = require('../../models/category.model')
const helper = require('../../helpers/helper')
const Banner = require('../../models/banner.model')
const Country = require('../../models/countries.model')
const Notification = require('../../models/notification.model')
const SubCategory = require('../../models/subCategory.model')
const supportModel = require('../../models/support.model')
module.exports = {
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body
      if (!refreshToken) {
        return res.json(responseData('REFRESH_TOKEN_EMPTY', {}, req, false))
      }
      const response = await JWT.verify(refreshToken, process.env.JWT_SECRET)
      let userData = await User.findOne({ _id: response._id })

      if (!isEmpty(userData)) {
        userData = userData?.toObject()
        const deviceTokens = generateAuthToken(userData)
        if (!deviceTokens) {
          return res.json(responseData('INVALID_REF_TOKEN', {}, req, false))
        }
        return res.json(
          responseData('TOKEN_REGENERATE', deviceTokens, req, true)
        )
      } else {
        return res.json(responseData('USER_NOT_FOUND', {}, req, false))
      }
    } catch (error) {
      return res.status(409).json(responseData('NOT_AUTHORIZED', {}, req, true))
    }
  },

  register: async (req, res) => {
    try {
      const { fullName, mobile, email, countryCode, password } = req.body

      const [firstName, ...lastNameArray] = fullName.split(' ')
      const lastName = lastNameArray.join(' ')

      if (
        await helper.checkIfUserExists(
          { mobile, countryCode },
          'MOBILE_EXIST',
          req,
          res
        )
      )
        return

      if (await helper.checkIfUserExists({ email }, 'EMAIL_EXIST', req, res)) return

      await helper.handleTempUser(fullName, mobile, email, countryCode)
      const salt = await bcrypt.genSalt(10)
      const hashedPass = await bcrypt.hash(password, salt)
      const userCreate = {
        fullName,
        firstName,
        lastName,
        mobile,
        email,
        countryCode,
        password: hashedPass
      }

      let tempUser = await TempUser.create(userCreate)

      const otpMobile = await generateOTP(4)

      const otpEmail = await generateEmailOTP()

      await Otp.deleteMany({ mobile, countryCode })
      await Otp.deleteMany({ email: email.toLowerCase() })

      const otpMobileRecord = await Otp.create({
        mobile,
        countryCode,
        otp: otpMobile
      })
      const otpEmailRecord = await Otp.create({
        email,
        otp: otpEmail
      })

      tempUser = tempUser.toObject()
      tempUser.isMobileVerified = 0
      tempUser.isEmailVerified = 0

      tempUser.mobileOtpId = otpMobileRecord?._id
      tempUser.emailOtpId = otpEmailRecord?._id
      let dataBody = { 
        email: email.toLowerCase(),
        EMAIL: email,
        OTP: otpEmail,
        FirstName: firstName,
        LastName: lastName
      }
      helper.sendEmail("otp-verification", dataBody);
      await helper.sendOtpTwilio(countryCode, mobile)
      res.json(responseData('OTP_SENT_EMAIL_MOBILE', tempUser, req, true))
    } catch (error) {
      console.log('error', error)
      res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },


  verifyOTP: async (req, res) => {
    try {
      console.log("📌 STEP — verifyOTP Incoming Body:", req.body);

      const {
        otpMobile,
        otpEmail,
        mobileOtpId,
        emailOtpId,
        deviceId,
        deviceType,
        deviceToken
      } = req.body;

      const OTP_EXPIRATION_SECONDS = parseInt(process.env.OTP_EXPIRATION_SECONDS || "120", 10);

      // fetch stored OTP entries
      const mobileOtpRecord = mobileOtpId ? await Otp.findOne({ _id: mobileOtpId }) : null;
      const emailOtpRecord = emailOtpId ? await Otp.findOne({ _id: emailOtpId }) : null;

      console.log("📌 OTP Records:", { mobileOtpRecord, emailOtpRecord });

      // Basic existence check
      if (!mobileOtpRecord || !emailOtpRecord) {
        // keep message consistent with your API
        return res.json(responseData("INVALID_MOBILE_EMAIL_OTP", {}, req, false));
      }

      // Validate mobile OTP using helper - helper should return null on success, or error string on failure
      const mobileOtpResult = await verifyMobileOTP(
        otpMobile,
        OTP_EXPIRATION_SECONDS,
        mobileOtpId
      );

      // Validate email OTP using helper - helper should return null on success, or error string on failure
      const emailOtpResult = await verifyEmailOTP(
        otpEmail,
        OTP_EXPIRATION_SECONDS,
        emailOtpId
      );

      console.log("📌 Validation Results:", { mobileOtpResult, emailOtpResult });

      // If both failed, return combined message
      if (mobileOtpResult && emailOtpResult) {
        return res.json(responseData("INVALID_MOBILE_EMAIL_OTP", {}, req, false));
      }

      // If mobile failed
      if (mobileOtpResult) {
        return res.json(responseData(mobileOtpResult, {}, req, false));
      }

      // If email failed
      if (emailOtpResult) {
        return res.json(responseData(emailOtpResult, {}, req, false));
      }

      // At this point both OTPs are valid — create user from TempUser
      const tempUser = await TempUser.findOne({
        mobile: mobileOtpRecord.mobile,
        email: emailOtpRecord.email
      });

      if (!tempUser) {
        console.log("📌 TEMP USER NOT FOUND for:", {
          mobile: mobileOtpRecord.mobile,
          email: emailOtpRecord.email
        });
        return res.json(responseData("TEMP_USER_NOT_FOUND", {}, req, false));
      }

      // Build user object
      const createObj = {
        fullName: tempUser.fullName,
        firstName: tempUser.firstName,
        lastName: tempUser.lastName,
        mobile: tempUser.mobile,
        password: tempUser.password,
        email: tempUser.email,
        countryCode: tempUser.countryCode,
        isMobileVerified: true,
        isEmailVerified: true,
        role: "user",
        profilePic: tempUser.profilePic || null
      };

      const user = await User.create(createObj);
      const userInfo = user.toJSON();
      const token = generateAuthToken(userInfo);

      // Update device info (if any)
      await User.findOneAndUpdate(
        { _id: userInfo._id },
        { deviceId, deviceType, deviceToken },
        { new: true }
      );

      // cleanup
      await TempUser.deleteOne({ _id: tempUser._id }).catch(()=>{});
      await Otp.deleteOne({ _id: mobileOtpId }).catch(()=>{});
      await Otp.deleteOne({ _id: emailOtpId }).catch(()=>{});

      // send welcome email asynchronously (don't block response)
      try {
        helper.sendEmail("welcome_email", {
          email: user.email.toLowerCase(),
          FIRSTNAME: user.firstName
        });
      } catch (e) {
        console.log("Warning: welcome email send failed:", e?.message || e);
      }

      console.log("📌 OTP verification successful for user:", userInfo._id);

      return res.json(
        responseData("MOBILE_EMAIL_VERIFIED", { ...userInfo, ...token }, req, true)
      );
    } catch (error) {
      console.error("verifyOTP ERROR:", error);
      return res.json(responseData("ERROR_OCCUR", error.message || error, req, false));
    }
  },

  userLogin: async (req, res) => {
    try {
      let {
        email,
        password,
        mobile,
        type,
        countryCode,
        deviceId,
        deviceType,
        deviceToken
      } = req.body
      // Check if type is provided
      if (!type) {
        return res.json(responseData('TYPE_NOT_EXITS', {}, req, false))
      }

      // login by email
      const deviceData = { deviceId, deviceType, deviceToken }
      if (type === 'email') {
        const emailCheck = await User.findOne({
          email: email?.toLowerCase()
        })
        const handleEmailRes = await handleEmailCheck(emailCheck, req, res)
        if (handleEmailRes) {
          return res.json(responseData(handleEmailRes, {}, req, false))
        }

        if (!isEmpty(emailCheck)) {
          return login(req, res, emailCheck, password, deviceData)
        } else {
          return res.json(responseData('USER_EMAIL_NOT_FOUND', {}, req, false))
        }
      }

      // login by mobile
      if (type === 'mobile') {
        const mobileCheck = await User.findOne({
          mobile,
          countryCode
        })
        console.log(mobileCheck,"mobileCheck")
        const handleMobileRes =  handleMobileCheck(mobileCheck, req, res)
        console.log(handleMobileRes)
        if (handleMobileRes) {
          return res.json(responseData(handleMobileRes, {}, req, false))
        }

        if (!isEmpty(mobileCheck)) {
          return login(req, res, mobileCheck, password, deviceData)
        } else {
          return res.json(responseData('MOBILE_NOT_FOUND', {}, req, false))
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },

  userForgotPassword: async (req, res) => {
    try {
      let { email, mobile, countryCode, type } = req.body

      if (!type) {
        return res.json(responseData('TYPE_NOT_EXITS', {}, req, false))
      }

      // new flow start

      if (type == 'email') {
        email = email?.toLowerCase()

        const userDetails = await User.findOne({ email, status: 'active' })
        if (isEmpty(userDetails)) {
          return res.json(responseData('USER_EMAIL_NOT_FOUND', {}, req, false))
        } else {
          const otpEmail = await generateOTP(4)
          await Otp.deleteMany({ email })

          const otpEmailRecord = await Otp.create({
            email,
            otp: otpEmail
          })

          // send email functionality
          // send response
          return res.json(
            responseData('OTP_SENT_EMAIL', otpEmailRecord, req, true)
          )
        }
      } else {
        const userDetails = await User.findOne({
          mobile,
          countryCode,
          status: 'active'
        })
        if (isEmpty(userDetails)) {
          return res.json(responseData('USER_MOBILE_NOT_FOUND', {}, req, false))
        } else {
          const otpMobile = await generateOTP(4)
          await Otp.deleteMany({ mobile, countryCode })

          const otpMobileRecord = await Otp.create({
            mobile,
            countryCode,
            otp: otpMobile
          })

          // otp on mobile number functionality
          return res.json(
            responseData('OTP_SENT_MOBILE', otpMobileRecord, req, true)
          )
        }
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  verifyUserForgotPasswordOTP: async (req, res) => {
    try {
      let { type, otpId, mobile, email, countryCode, otp } = req.body
      const OTP_EXPIRATION_SECONDS = process.env.OTP_EXPIRATION_SECONDS

      if (!type) {
        return res.json(responseData('TYPE_NOT_EXITS', {}, req, false))
      }

      // new flow start

      if (type == 'email') {
        let findEmailOTP = await Otp.findOne({ _id: otpId, email, otp })

        if (isEmpty(findEmailOTP)) {
          return res.json(responseData('INVALID_OTP', {}, req, false))
        }

        const mobileOtpCreationTime = findEmailOTP?.createdAt

        const currentTime = moment()
        const timeDifferenceMobile = currentTime.diff(
          mobileOtpCreationTime,
          'seconds'
        )

        if (timeDifferenceMobile > OTP_EXPIRATION_SECONDS) {
          await Otp.deleteOne({
            email: findEmailOTP?.email
          })
          return res.json(responseData('MOBILE_OTP_EXPIRED', {}, req, false))
        }
        //
        return res.json(responseData('OTP_VERIFIED_SUCCESS', {}, req, true))
      } else {
        let findMobileOTP = await Otp.findOne({
          _id: otpId,
          mobile,
          countryCode,
          otp
        })

        if (isEmpty(findMobileOTP)) {
          return res.json(responseData('INVALID_OTP', {}, req, false))
        }
        // is otp expired or not
        const mobileOtpCreationTime = findMobileOTP?.createdAt

        const currentTime = moment()
        const timeDifferenceMobile = currentTime.diff(
          mobileOtpCreationTime,
          'seconds'
        )

        if (timeDifferenceMobile > OTP_EXPIRATION_SECONDS) {
          await Otp.deleteOne({
            mobile: findMobileOTP?.mobile,
            countryCode: findMobileOTP?.countryCode
          })
          return res.json(responseData('MOBILE_OTP_EXPIRED', {}, req, false))
        }
        //
        return res.json(responseData('OTP_VERIFIED_SUCCESS', {}, req, true))
      }
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },

  userResetPassword: async (req, res) => {
    try {
      const { newPassword, confirmPassword, email, mobile, countryCode } =
        req.body
      if (newPassword !== confirmPassword) {
        return res.json(responseData('PASSWORD_MATCH_ERROR', {}, req, false))
      }
      const resetToken = await User.findOne({
        $or: [{ email }, { mobile, countryCode }]
      })

      if (!isEmpty(resetToken)) {
        let salt = await genSalt(10)
        let hash = await genHash(newPassword, salt)

        await User.findOneAndUpdate(
          { _id: resetToken._id },
          { password: hash, token: null }
        )
        return res.json(responseData('PASSWORD_RESET_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('USER_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      return res.status(422).json(responseData(err, {}, req, false))
    }
  },
  checkSocialId: async (req, res) => {
    try {
      const { socialId } = req.body
      const conditions = { socialId }
      const findUser = await User.findOne(conditions)
      let valid
      let message
      if (isEmpty(findUser)) {
        valid = true
        message = 'Social id is available'
      } else {
        valid = false
        message = 'Social id is already registered'
      }
      return res.json(
        responseData('SOCIAL_ID_STATUS_FETCHED', { valid, message }, req, true)
      )
    } catch (error) {
      return res.status(409).json(responseData('NOT_AUTHORIZED', {}, req, true))
    }
  },
  sendOtpLogin: async (req, res) => {
    try {
      const { mobile, countryCode } = req.body
      const isUserExist = await User.findOne({ mobile, countryCode })
      if (!isEmpty(isUserExist)) {
        if (isUserExist?.status === 'active') {
          const otp = await generateOTP()
          await Otp.deleteMany({ mobile })
          const mobileOtpRecord = await Otp.create({
            mobile,
            countryCode,
            otp
          })
          return res.json(
            responseData(
              'OTP_SENT',
              { mobileOtpId: mobileOtpRecord?._id },
              req,
              true
            )
          )
        } else {
          return res.json(responseData('USER_INACTIVE', {}, req, false))
        }
      }
      return res.json(responseData('USER_NOT_FOUND', {}, req, false))
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  verifyOtpLogin: async (req, res) => {
    try {
      const { mobileOtpId, otp, deviceId, deviceType, deviceToken } = req.body

      const OTP_EXPIRATION_SECONDS = process.env.OTP_EXPIRATION_SECONDS || 60

      const checkMobileOtp = await Otp.findOne({ _id: mobileOtpId, otp })

      if (isEmpty(checkMobileOtp)) {
        return res.json(responseData('OTP_NOT_VERIFIED', {}, req, false))
      }

      const currentTime = moment()
      const timeDifferenceMobile = currentTime.diff(
        checkMobileOtp?.createdAt,
        'seconds'
      )

      if (timeDifferenceMobile > parseInt(OTP_EXPIRATION_SECONDS)) {
        return res.json(responseData('MOBILE_OTP_EXPIRED', {}, req, false))
      }

      let isUserExist = await User.findOne({
        mobile: checkMobileOtp?.mobile
      })

      if (!isEmpty(isUserExist)) {
        await Otp.findOneAndRemove({
          _id: mobileOtpId
        })
        isUserExist = isUserExist.toJSON()

        const updatedInfo = {
          deviceId,
          deviceType,
          deviceToken
        }

        isUserExist = await User.findOneAndUpdate(
          { _id: isUserExist._id },
          updatedInfo,
          { new: true }
        )
        isUserExist = isUserExist.toJSON()
        isUserExist.role = 'user'
        const deviceTokenBoth = generateAuthToken(isUserExist)
        return res.json(
          responseData(
            'ACCOUNT_LOGIN',
            { ...isUserExist, ...deviceTokenBoth },
            req,
            true
          )
        )
      }
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  changePassword: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body
      const { _id } = req.user

      const user = await User.findOne({ _id })
      if(!user?.password){
        return res.json(responseData('OLD_PASSWORD_NOT_CREATED', {}, req, false))
      }
      const isPasswordMatch = await bcrypt.compare(oldPassword, user?.password)

      if (!isPasswordMatch) {
        return res.json(responseData('INVALID_OLD_PASSWORD', {}, req, false))
      }

      if (oldPassword === newPassword) {
        return res.json(responseData('PASSWORD_SAME_ERROR', {}, req, false))
      }

      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(newPassword, salt)

      if (!hash) {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }

      await User.findOneAndUpdate(
        { _id },
        {
          password: hash,
          isPasswordSet: true,
          forceLogout: true
        }
      )

      return res.json(responseData('PASSWORD_CHANGED', {}, req, true))
    } catch (err) {
      console.log('Error', err.message)
      return res.json(responseData('ERROR_OCCUR', {}, req, false))
    }
  },
  logout: async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.user._id })
      if (!isEmpty(user)) {
        await User.findOneAndUpdate(
          { _id: req.user._id },
          {
            deviceId: null,
            deviceType: null,
            deviceToken: null,
            deviceVoipToken: null
          }
        )
        return res.json(responseData('LOGOUT', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      console.log('error', error)
      return res.status(422).json(responseData(error, {}, req, false))
    }
  },
  resendOTPMobile: async (req, res) => {
    try {
      const { countryCode, mobile } = req.body

      const otpMobile = await generateOTP(4)
      await Otp.deleteMany({ mobile, countryCode })

      const otpMobileRecord = await Otp.create({
        mobile,
        countryCode,
        otp: otpMobile
      })

      return res.json(
        responseData(
          'OTP_SENT_MOBILE',
          {
            mobileOtpId: otpMobileRecord?._id
          },
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  resendOtpEmail: async (req, res) => {
    try {
      const { email } = req.body

      const userDetails = TempUser.findOne({ email})

      const otpEmail = await generateEmailOTP()
      await Otp.deleteMany({ email })

      const otpEmailRecord = await Otp.create({
        email,
        otp: otpEmail
      })
      let dataBody = {
        email: email.toLowerCase(),
        EMAIL: email,
        OTP: otpEmail,
        firstName: userDetails?.firstName,
        lastName: userDetails?.lastName
      }
      helper.sendEmail("otp-verification", dataBody);
      return res.json(
        responseData(
          'OTP_SENT_EMAIL',
          {
            emailOtpId: otpEmailRecord?._id
          },
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  updateProfilePic: async (req, res) => {
    try {
      const { _id } = req.user
      const { profilePic } = req.body
      const updateValues = {}
      if (isEmpty(req.file)) {
        return res.json(responseData('IMAGE_REQUIRED', {}, req, false))
      }
      if (req.profilePic) {
        updateValues.profilePic = profilePic
      }
      const userProfile = await User.findOneAndUpdate(
        { _id },
        { $set: updateValues },
        { new: true }
      )
      const userProfilePic = userProfile.profilePic
      return res.json(
        responseData(
          'UPDATE_PROFILE_PIC',
          { profilePic: userProfilePic },
          req,
          true
        )
      )
    } catch (err) {
      return res.status(422).json(responseData(err, {}, req, false))
    }
  },
  getProfile: async (req, res) => {
    try {
      const { _id } = req.user
      const userRecord = await User.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(_id)
          }
        },
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
        },
        {
          $lookup: {
            from: "savedaddresses",
            as: "savedAddress",
            localField: "_id",
            foreignField: "userId"
          }
        }
      ])
      if (isEmpty(userRecord)) {
        return res.json(responseData('USER_NOT_FOUND', {}, req, false))
      }
      // userRecord = userRecord.toObject()

      return res.json(responseData('PROFILE_LIST', userRecord[0], req, true))
    } catch (err) {
      return res.status(422).json(responseData(err, {}, req, false))
    }
  },
  updateProfile: async (req, res) => {
    try {
      const { fullName, address, profilePic } = req.body

      const updateValues = {}

      if (fullName) {
        const [firstName, ...lastNameArray] = fullName.split(' ')
        const lastName = lastNameArray.join(' ')
        updateValues.firstName = firstName
        updateValues.lastName = lastName
        updateValues.fullName = fullName
      }

      if (profilePic) updateValues.profilePic = profilePic
      let addressObjects
      if (address && address?.length > 0) {
        addressObjects = address?.map((addressName) => ({
          name: addressName,
          _id: new mongoose.Types.ObjectId()
        }))
      }
      updateValues.address = addressObjects

      const user = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: updateValues },
        { new: true }
      )
      if (user) {
        return res.json(responseData('USER_UPDATE_SUCCESS', user, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      console.log('error', error)
      return res
        .status(422)
        .json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  deleteAddress: async (req, res) => {
    try {
      let { id } = req.params
      let check = await User.updateOne(
        { _id: mongoose.Types.ObjectId(req.user._id) },
        { $pull: { address: { _id: mongoose.Types.ObjectId(id) } } }
      )
      console.log('Item removed successfully!', check)

      return res.json(responseData('ADDRESS_DELETED', {}, req, true))
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  generatePutPresignedURL: async (req, res) => {
    try {
      const { contentType } = req.body
      const mimeType = constant.mimeTypes[contentType]
      const uniqueFileName = `users/${Date.now()}-${uuidv4()}.${mimeType}`
      const newURL = await generatePutPresignedUrl(
        process.env.AWS_BUCKET_NAME,
        uniqueFileName,
        contentType
      )
      if (newURL) {
        res.json({
          success: true,
          message: 'Pre signed URL generated successfully.',
          results: {
            key: uniqueFileName,
            url: newURL
          }
        })
      } else {
        res.json({
          success: false,
          message: 'Error occur.',
          results: {}
        })
      }
    } catch (error) {
      res.json({
        success: false,
        message: error.message,
        results: error
      })
    }
  },
  sendEmailVerifyOtp: async (req, res) => {
    try {
      const { email } = req.body
      const isUserExist = await User.findOne({ email })
      if (!isEmpty(isUserExist)) {
        if (isUserExist?.status === 'active') {
          const otp = await generateOTP()
          await EmailOtp.deleteMany({ email })
          const emailOtpRecord = await EmailOtp.create({
            email,
            otp
          })
          return res.json(
            responseData(
              'EMAIL_OTP_SENT',
              { emailOtpId: emailOtpRecord?._id },
              req,
              true
            )
          )
        } else {
          return res.json(responseData('USER_INACTIVE', {}, req, false))
        }
      }
      return res.json(responseData('USER_NOT_FOUND', {}, req, false))
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  accountDelete: async (req, res) => {
    try {
      const { _id } = req.user
      const updatedEmail = `${_id}@quotes-for-it.com`
      const updateValues = {
        email: updatedEmail,
        deviceToken: null,
        deviceId: null,
        mobile: _id,
        isDeleted: true,
        status: "inactive"
      }

      const userUpdate = await User.findOneAndUpdate(
        { _id },
        { $set: updateValues },
        { new: true }
      )
      if (userUpdate) {
        return res.json(responseData('ACCOUNT_DELETED', {}, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      console.log('error', error)
      return res.status(422).json(responseData(error, {}, req, false))
    }
  },
  globalSettingWithoutToken: async (req, res) => {
    try {
      let globalSettingRecord = await getAdminSetting()
      globalSettingRecord = JSON.parse(JSON.stringify(globalSettingRecord))
      globalSettingRecord.orderType = constant.orderType
      if (isEmpty(globalSettingRecord)) {
        return res.json(responseData('NOT_FOUND', {}, req, false))
      }
      return res.json(
        responseData('GLOBAL_SETTING', globalSettingRecord, req, true)
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },

  socialLogin: async (req, res) => {
    try {
      let { loginType, accessToken, deviceId, deviceType, deviceToken } = req.body

      let updateData = { forceLogout: false, deviceId, deviceType, deviceToken }
      let decodedToken = {}
      if (loginType == 'google') {
        decodedToken = await getGoogleResponse(accessToken)
      } else {
        decodedToken = await getFaceBookDetails(accessToken)
      }
      let user = {}
      if (decodedToken) {
        user = await User.findOne({ email: decodedToken?.email })
        if (isEmpty(user)) {
          return res.json(responseData('USER_NOT_FOUND', {}, req, false))
        }
        if (user?.registrationType == 'manual') {
          return res.json(responseData('MANUALLY_REGISTERED', {}, req, false))
        }
        let userInfo = user?.toJSON()
        await User.findOneAndUpdate(
          { email: decodedToken?.email, status: 'active' },
          updateData
        )
        userInfo.role = 'user'
        const newDeviceToken = generateAuthToken(userInfo)
        return res.json(
          responseData(
            'ACCOUNT_LOGIN',
            { ...userInfo, ...newDeviceToken },
            req,
            true
          )
        )
      } else {
        console.log('error==> error invalid token')
        return res.json(
          responseData('INVALID_TOKEN', error.message, req, false)
        )
      }
    } catch (error) {
      console.log('error==> error in social login')
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  socialSignup: async (req, res) => {
    try {
      let { loginType, accessToken, deviceId, deviceType, deviceToken, firstName, lastName, socialId, email } = req.body

      let updateData = { forceLogout: false, deviceId, deviceType, deviceToken }
      let decodedToken = {}
      if (loginType == 'google') {
        decodedToken = await getGoogleResponse(accessToken)
      } 
      if (loginType === "apple") {
        decodedToken = {
          given_name: firstName,
          family_name: lastName,
          name: firstName + " " + lastName,
          sub: socialId,
          email: email
        }
      }
      if (loginType === "facebook") {
        decodedToken = await getFaceBookDetails(accessToken);
      }
      if (decodedToken) {
        const userEmail = await User.findOne({ email: decodedToken?.email })
        if (!isEmpty(userEmail)) {
          const user = await User.findOneAndUpdate({ email: decodedToken?.email }, { $set: updateData }, { new: true})
          const userInfo = user?.toJSON()
          userInfo.role = 'user'
          const token = generateAuthToken(userInfo)
          return res.json(
            responseData('ACCOUNT_LOGIN', {...userInfo, ...token}, req, true)
          )
        } else {
          const tempUserFindEmail = await TempUser.findOne({
            email: decodedToken?.email
          })
          if (!isEmpty(tempUserFindEmail)) {
            await TempUser.deleteOne({ _id: tempUserFindEmail?._id })
          }
          updateData.firstName = decodedToken?.given_name
          updateData.lastName = decodedToken?.family_name
          updateData.fullName = decodedToken?.name
          updateData.socialId = decodedToken?.sub
          updateData.email = decodedToken?.email
          updateData.registrationType = loginType
          updateData.isEmailVerified = true
  
          let user = await User.create(updateData)
          const userInfo = user?.toJSON()
          userInfo.role = 'user'
          const token = generateAuthToken(userInfo)
          return res.json(
            responseData('ACCOUNT_LOGIN', {...userInfo, ...token}, req, true)
          )
        }
      } else {
        console.log('error==> error invalid token')
        return res.json(
          responseData('INVALID_TOKEN', error.message, req, false)
        )
      }
    } catch (error) {
      console.log('error==> error in social signup')
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  sendOtpMobileSocialSignUp: async (req, res) => {
    try {
      const { mobile, countryCode } = req.body
      const isUserExist = await User.findOne({ mobile, countryCode, isDeleted: false })
      if (isEmpty(isUserExist)) {
        const otp = await generateOTP()
        await Otp.deleteMany({ mobile })
        const mobileOtpRecord = await Otp.create({
          mobile,
          countryCode,
          otp
        })
        return res.json(
          responseData(
            'OTP_SENT',
            { mobileOtpId: mobileOtpRecord?._id },
            req,
            true
          )
        )
      } else {
        return res.json(responseData('MOBILE_EXIST', {}, req, false))
      }
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  verifyOtpMobileSocialSignUp: async (req, res) => {
    try {
      const {
        otpMobile,
        mobileOtpId,
        deviceId,
        deviceType,
        deviceToken
      } = req.body
      const OTP_EXPIRATION_SECONDS = process.env.OTP_EXPIRATION_SECONDS
      const mobileOtp = await Otp.findOne({ _id: mobileOtpId, otp: otpMobile })

      const mobileOtpResult = await verifyMobileOTP(
        otpMobile,
        OTP_EXPIRATION_SECONDS,
        mobileOtpId
      )
      if (mobileOtpResult) {
        return res.json(responseData(mobileOtpResult, {}, req, false))
      }
      const updateObj = {
        mobile: mobileOtp?.mobile,
        countryCode: mobileOtp?.countryCode,
        isMobileVerified: true,
      }
      const user = await User.findOneAndUpdate({_id: req.user._id}, {$set: updateObj}, { new: true})
      const userInfo = user?.toJSON()
      userInfo.role = 'user'
      const token = generateAuthToken(userInfo)
      await User.findOneAndUpdate(
        { _id: userInfo._id },
        { deviceId, deviceType, deviceToken },
        { new: true }
      )
      await Otp.findOneAndRemove({ _id: mobileOtpId, otp: otpMobile })
      return res.json(
        responseData(
          'MOBILE_VERIFIED',
          { ...userInfo, ...token },
          req,
          true
        )
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  categoryList: async (req, res) => {
    try {
      let {
        page,
        pageSize,
        keyword,
      } = req.query
      let whereStatement = {}
      const condition = {
        status: 'active'
      }

      page = parseInt(page) || 1
      const limit = parseInt(pageSize) || 10
      filterByKeyword(whereStatement, keyword)
      const finalCondition = {
        ...condition,
        ...whereStatement
      }
      const sortPattern = { sequence: 1 }
      const aggregationPipeline = [
        { $match: finalCondition },
        { $sort: sortPattern },
        {
          $addFields: {
            file: {
              $concat: [process.env.AWS_MEDIA_URL, "$file"]
            }
          }
        },
        {
          $lookup: {
            from: 'subcategories',
            localField: '_id',
            foreignField: 'category',
            as: 'subCategories',
            pipeline: [
              {
                $project: {
                  name: 1,
                  unit: 1
                }
              }
            ]
          }
        },
        {
          $match: {
            subCategories: { $ne: []}
          }
        },
        ...getPaginationArray(parseInt(page), limit)
      ]
      let queryResult = await Category.aggregate(aggregationPipeline)
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
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  subCategoryListMasterData: async (req, res) => {
    try {
      let {category} = req.query
      let queryResult = await SubCategory.find({category, status: 'active'}).sort({ name: 1 })
      return res.json(
        responseData(
          'GET_LIST',
          queryResult,
          req,
          true
        )
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  bannerList: async (req, res) => {
    try {
      let queryResult = await Banner.find({ status: "active"})
      return res.json(
        responseData(
          'GET_LIST',
          queryResult,
          req,
          true
        )
      )
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  countryList: async (req, res) => {
    try {
      const countryList = await Country.find()
      return res.json(responseData('GET_LIST', countryList, req, true))
    } catch (error) {
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  notificationAndFavoriteCount: async (req, res) => {
    try {
      const finalCondition = {
        userId: req.user?._id,
        isRead: false
      }
      const notificationCount = await Notification.find(finalCondition)
      const favoriteCount = await User.findOne({ _id: req.user?._id })
      const resObj = {
        notificationCount: notificationCount?.length,
        favoriteCount: favoriteCount?.favoriteProducts?.length
      }
      return res.json(
        responseData(
          'GET_LIST',
          resObj,
          req,
          true
        )
      )
    } catch (error) {
      console.log('error', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
 submitSupportRequest  : async (req, res) => {
  try {
    const { name, email, mobile, message, role } = req.body;
const {candidateId} = req.params
    if (!name || !email || !mobile || !message || !role || !candidateId) {
         return res.json(responseData('ALL_FIELDS_REQUIRED', {}, req, true))

    }

    const support = await supportModel.create({
      name,
      email,
      mobile,
      message,
      role,
      candidateId
    });

          return res.json(responseData('SUPPORT_REQUEST_SUBMITTED', {support}, req, true))

  } catch (err) {
    console.error("Support Create Error:", err);
      return res.json(responseData('ERROR_OCCUR', err.message, req, false))
  }
}
}

const handleSocialRegistration = async (
  registrationType,
  accessToken,
  email,
  socialId,
  req,
  res
) => {
  if (registrationType === 'google') {
    const decodedToken = await getGoogleResponse(accessToken)
    if (email !== decodedToken?.email) {
      res.json(responseData('EMAIL_DOES_NOT_MATCH', {}, req, false))
      return false
    }
    if (socialId !== decodedToken?.sub) {
      res.json(responseData('SOCIAL_ID_DOES_NOT_MATCH', {}, req, false))
      return false
    }
    const userDetailBySocial = await User.findOne({ socialId })
    if (!isEmpty(userDetailBySocial)) {
      res.json(responseData('SOCIAL_ID_EXIST', {}, req, false))
      return false
    }
  }
  return true
}

const handleReferralCode = async (inviteByCode, userCreate, req, res) => {
  if (!isEmpty(inviteByCode)) {
    const refCheck = await User.findOne({ inviteCode: inviteByCode })
    if (isEmpty(refCheck)) {
      res.json(responseData('INVALID_INVITE_CODE', {}, req, false))
      return false
    }
    userCreate.inviteByCode = inviteByCode
  }
  return true
}

async function addSignUpBonus(user) {
  try {
    const data = await getAdminSetting()
    const bonusAmount = parseFloat(data.signupBonus)
    const userUpdated = {
      bonusAmount,
      signInBonusAmount: bonusAmount
    }
    await User.findOneAndUpdate({ _id: user._id }, userUpdated)
    return bonusAmount
  } catch (error) {
    return 0
  }
}
const getGoogleResponse = async (accessToken) => {
  let res = await axios(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
  )
  return res?.data
}

const getFaceBookDetails = async (accessToken) => {
  let res = await axios(
    `https://graph.facebook.com/v13.0/me?fields=id,name,email,picture&access_token=${accessToken}`
  )
  return res?.data
}

const getAppleResponse =  async idToken => {
  try {
    // Fetch Apple's public keys
    const appleKeysUrl = 'https://appleid.apple.com/auth/keys';
    const res = await axios.get(appleKeysUrl);
    const keys = res.data.keys;
    console.log('keys: ', keys);

    // Configure jwksClient
    const client = jwksClient({
      jwksUri: appleKeysUrl
    });

    // Decode the token header to get the key ID
    const decodedHeader = jwt.decode(idToken, { complete: true });
    const kid = decodedHeader.header.kid;

    // Fetch the public key using the key ID
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    // Verify the token
    const verifiedToken = jwt.verify(idToken, signingKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_ID, // replace with your client ID
    });
    // Return the payload
    return verifiedToken;
  } catch (error) {
    console.error('Error verifying Apple ID token:', error);
    return false
  }
}
const login = async (
  req,
  res,
  userData,
  password,
  { deviceId, deviceType, deviceToken }
) => {
  try {
    if (
      (userData.isEmailVerified == 0 || userData.isMobileVerified == 0)
    ) {
      let otpObject = {
        isMobileVerified: userData.isMobileVerified,
        isEmailVerified: userData.isEmailVerified
      }
      if (helper.andOperator(userData.isMobileVerified == 0, userData.mobile)) {
        await Otp.deleteMany({
          mobile: userData.mobile,
          countryCode: userData.countryCode
        })
        const otpMobile = await generateOTP(4)
        const otpMobileRecord = await Otp.create({
          mobile: userData.mobile,
          countryCode: userData.countryCode,
          otp: otpMobile
        })
        otpObject.mobileOtpId = otpMobileRecord?._id
      }

      if (helper.andOperator(userData.isEmailVerified == 0, userData.email)) {
        await Otp.deleteMany({ email: userData.email.toLowerCase() })
        const otpEmail = await generateEmailOTP()
        const otpEmailRecord = await Otp.create({
          email: userData.email.toLowerCase(),
          otp: otpEmail
        })
        otpObject.emailOtpId = otpEmailRecord?._id
      }
      return res.json(
        responseData('OTP_SEND_MOBILE_EMAIL', otpObject, req, true)
      )
    }

    if (userData.isEmailVerified == 1) {
      let finalUserData = userData.toObject()
      delete finalUserData['password']
      delete finalUserData['__v']
      delete finalUserData['deviceId']
      delete finalUserData['deviceType']
      delete finalUserData['deviceToken']
      finalUserData.role = 'user'
    
      const token = generateAuthToken(finalUserData)

      // check password condition
      const isValidPassword = await bcrypt.compare(password, (userData?.password || ''))
   
      if (!isValidPassword) {
     
        return res.json(responseData('USER_INVALID_LOGIN', {}, req, false))
      }
      await User.findOneAndUpdate(
        { _id: userData._id },
        { deviceId, deviceType, deviceToken },
        { new: true }
      )
      return res.json(
        responseData('ACCOUNT_LOGIN', { ...finalUserData, ...token }, req, true)
      )
    } else {
      const isValidPassword = await bcrypt.compare(password, userData.password)
      if (!isValidPassword) {
        return res.json(responseData('USER_INVALID_LOGIN', {}, req, false))
      }
    }
  } catch (error) {
    console.log('error', error)
    return res.json(responseData('ERROR_OCCUR', error.message, req, false))
  }
}

const handleEmailCheck = (emailCheck, req, res) => {
  if (emailCheck?.isDeleted) {
    return 'ACCOUNT_DELETED'
  }
  if (emailCheck?.status !== 'active') {
    return 'ACCOUNT_DE_ACTIVE'
  }
}

const handleMobileCheck = (mobileCheck, req, res) => {
  if (mobileCheck?.isDeleted) {
    return 'ACCOUNT_DELETED'
  }
  if (mobileCheck?.status !== 'active') {
    return 'ACCOUNT_DE_ACTIVE'
  }
}
