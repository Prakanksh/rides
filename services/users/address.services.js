const { isEmpty } = require('lodash')
const { responseData } = require('../../helpers/responseData')
const SavedAddress = require('../../models/address.model')
const { handleEditFieldFunction } = require('../../helpers/helper')
const User = require('../../models/user.model')
const { default: mongoose } = require('mongoose')

module.exports = {
  list: async (req, res) => {
    try {
      const addressList = await SavedAddress.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(req.user._id)
          }
        },
        {
          $lookup: {
            from: "countries",
            as: "country",
            localField: "country",
            foreignField: "_id"
          }
        },
        {
          $unwind: {
            path: "$country", preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: 
          {
            country: "$country.name"
          }
        }
      ])
      return res.json(responseData('GET_LIST', addressList, req, true))
    } catch (error) {
      console.log('error==========', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  address: async (req, res) => {
    try {
      const {
        longitude,
        latitude,
        zipCode,
        country,
        completeAddress,
        defaultAddress,
        howToReach,
        floor,
        addressType,
        area
      } = req.body

      const addressData = {
        userId: req.user._id
      }
      handleEditFieldFunction(addressData, 'addressType', addressType)
      handleEditFieldFunction(addressData, 'zipCode', zipCode)
      handleEditFieldFunction(addressData, 'howToReach', howToReach)
      handleEditFieldFunction(addressData, 'floor', floor)
      handleEditFieldFunction(addressData, 'country', country)
      handleEditFieldFunction(addressData, 'area', area)
      handleEditFieldFunction(
        addressData,
        'completeAddress',
        completeAddress
      )
      handleEditFieldFunction(addressData, 'defaultAddress', defaultAddress)
      if (longitude && latitude) {
        addressData["location"] = {
          coordinates: [longitude, latitude],
          type: 'Point'
        }
      }
      if(defaultAddress && (defaultAddress == 'true' || defaultAddress)){
        await SavedAddress.updateMany({ userId: req.user._id }, {$set: {defaultAddress: false}})
      }
      let resp = await SavedAddress.create(addressData)

      if (resp) {
        return res.json(responseData('ADDRESS_ADD_SUCCESS', resp, req, true))
      } else {
        return res.json(responseData('ERROR_OCCUR', {}, req, false))
      }
    } catch (error) {
      console.log('error==========', error)
      return res.json(responseData('ERROR_OCCUR', error.message, req, false))
    }
  },
  updateAddress: async (req, res) => {
    try {
      const { id } = req.params
      const address = await SavedAddress.findOne({ _id: id })
      if(!isEmpty(address)){
        const {
          longitude,
          latitude,
          zipCode,
          country,
          completeAddress,
          defaultAddress,
          howToReach,
          floor,
          addressType,
          area
        } = req.body
        const updateDetails = {}
        handleEditFieldFunction(updateDetails, 'addressType', addressType)
        handleEditFieldFunction(updateDetails, 'area', area)
        handleEditFieldFunction(updateDetails, 'howToReach', howToReach)
        handleEditFieldFunction(updateDetails, 'zipCode', zipCode)
        handleEditFieldFunction(updateDetails, 'country', country)
        handleEditFieldFunction(updateDetails, 'floor', floor)
        handleEditFieldFunction(
          updateDetails,
          'completeAddress',
          completeAddress
        )
        handleEditFieldFunction(updateDetails, 'defaultAddress', defaultAddress)

        if (longitude && latitude) {
          updateDetails["location"] = {
            coordinates: [longitude, latitude],
            type: 'Point'
          }
        }
        if(defaultAddress && (defaultAddress == 'true' || defaultAddress)){
          await SavedAddress.updateMany({ userId: req.user._id }, {$set: {defaultAddress: false}})
        }
        await SavedAddress.findOneAndUpdate({ _id: mongoose.Types.ObjectId(id), userId: req.user._id }, { $set:  updateDetails })
        return res.json(responseData('ADDRESS_UPDATE_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('ADDRESS_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  deleteAddress: async (req, res) => {
    try {
      let { id } = req.params
      const address = await SavedAddress.findOne({ _id: id })
      if(!isEmpty(address)){
        await SavedAddress.findOneAndDelete({ _id: id })
        return res.json(responseData('ADDRESS_DELETED_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('ADDRESS_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  },
  changeDefaultAddress: async (req, res) => {
    try {
      const { id } = req.params
      const { defaultAddress } = req.query

      const address = await SavedAddress.findOne({ _id: id })
      if(!isEmpty(address)){
        await SavedAddress.updateMany({ userId: req.user._id }, {$set: {defaultAddress: false}})
        await SavedAddress.findOneAndUpdate({ _id: id },{$set: {defaultAddress}})
        return res.json(responseData('DEFAULT_ADDRESS_CHANGE_SUCCESS', {}, req, true))
      } else {
        return res.json(responseData('ADDRESS_NOT_FOUND', {}, req, false))
      }
    } catch (err) {
      return res.json(responseData(err.message, {}, req, false))
    }
  }
}
