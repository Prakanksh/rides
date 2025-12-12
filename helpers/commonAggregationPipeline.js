const { default: mongoose } = require("mongoose")

module.exports = {
  categoryNameLookupPipeline: {
    $lookup: {
      from: 'categories',
      localField: 'category',
      foreignField: '_id',
      as: 'categoryDetails',
      pipeline: [
        {
          $project: {
            name: 1
          }
        }
      ]
    }
  },
  categoryUnwindPipeline: {
    $unwind: {
      path: '$categoryDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  subCategoryNameLookupPipeline: {
    $lookup: {
      from: 'subcategories',
      localField: 'subCategory',
      foreignField: '_id',
      as: 'subCategoryDetails',
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
  subCategoryUnwindPipeline: {
    $unwind: {
      path: '$subCategoryDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  productLookupPipeline: {
    $lookup: {
      from: 'products',
      as: 'productDetails',
      let: { productId: '$productId' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$productId'] }
          }
        },
        {
          $addFields: {
            images: {
              $map: {
                input: '$images',
                as: 'file',
                in: {
                  $cond: [
                    { $eq: ['$$file.value', ''] },
                    '$$file',
                    {
                      $concat: [process.env.AWS_MEDIA_URL, '$$file.value']
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            fullName: 1,
            images: 1,
            categoryType: 1,
            file: 1,
            description: 1,
            rating: 1,
            category: 1,
            subCategory: 1,
            slug: 1
          }
        }
      ]
    }
  },
  productUnwindPipeline: {
    $unwind: {
      path: '$productDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  userLookupPipeline: {
    $lookup: {
      from: 'users',
      as: 'userDetails',
      let: { userId: '$userId' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$userId'] }
          }
        },
        {
          $addFields: {
            profilePic: {
              $cond: {
                if: '$profilePic',
                then: {
                  $concat: [process.env.AWS_MEDIA_URL, '$profilePic']
                },
                else: ''
              }
            }
          }
        },
        {
          $project: {
            fullName: 1,
            userId: 1,
            favoriteProducts: 1,
            mobile: 1,
            countryCode: 1,
            profilePic: 1,
            email: 1
          }
        }
      ]
    }
  },
  userUnwindPipeline: {
    $unwind: {
      path: '$userDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  supplierLookupPipeline: {
    $lookup: {
      from: "suppliers",
      let: { supplierId: "$supplierId" },
      as: "supplierDetails",
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$supplierId"] }
          }
        },
        {
          $lookup: {
            from: 'ratingreviews',
            as: 'reviewDetails',
            let: { receiverId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$receiverId', '$$receiverId'] }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ]
          }
        },
        {
          $unwind: {
            path: '$reviewDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            name: {
              $concat: ["$firstName", " ", "$lastName"]
            },
            profilePic: {
              $concat: [process.env.AWS_MEDIA_URL, "$profilePic"]
            },
            rating: 1,
            isWithInTheSystem: 1,
            email: 1,
            zipCode: 1,
            reviews: "$reviewDetails.count"
          }
        }
      ]
    }
  },
  supplierUnwindPipeline: {
    $unwind: {
      path: '$supplierDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  supplierProductLookupPipeline: {
    $lookup: {
      from: "supplierproducts",
      let: { supplierProductId: "$supplierProductId" },
      as: "supplierProductDetails",
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$_id", "$$supplierProductId"] }
          }
        },
        {
          $project: {
            allowCancellation: 1
          }
        }
      ]
    }
  },
  supplierProductUnwindPipeline: {
    $unwind: {
      path: '$supplierProductDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  customerDiscountPipeline: (req) => {
    return {
      $lookup: {
        from: 'customerdiscounts',
        as: 'customerDiscountDetails',
        let: { productId: '$productId', supplierId: '$supplierId' },
        pipeline: [
          {
            $match: {
              $and: [
                {
                  $expr: { $eq: ['$productId', '$$productId'] }
                },
                {
                  $expr: { $eq: ['$supplierId', '$$supplierId'] }
                },
                {
                  $expr: { $eq: [{ $toString: req.user?.supplier }, { $toString: "$$supplierId" }] }
                },
                {
                  $or: [
                    {
                      $expr: { $eq: ['$type', 'all'] }
                    },
                    {
                      $expr: {
                        $in: [{ $toString: req.user._id }, '$users']
                      }
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    }
  },
  userDetailsForFavoritePipeline: (req) => {
    return {
      $lookup: {
        from: 'users',
        as: 'userDetails',
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', mongoose.Types.ObjectId(req.user._id)] }
            }
          },
          {
            $project: {
              favoriteProducts: 1
            }
          }
        ]
      }
    }
  },
  isFavoritePipeline: {
    $addFields: {
      isFavorite: {
        $cond: {
          if: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$userDetails.favoriteProducts",
                    as: "favorite",
                    cond: { $eq: ["$$favorite._id", "$_id"] }
                  }
                }
              },
              0
            ]
          },
          then: true,
          else: false
        }
      }
    }
  },
  customerDiscountDetailsIfNullPipeline: {
    $addFields: {
      customerDiscountDetails: {
        $ifNull: ['$customerDiscountDetails', []]
      }
    }
  },
  specificUserCustomerDiscountPipeline: {
    $addFields: {
      specificUserCustomerDiscount: {
        $cond: {
          if: { $eq: ['$customerDiscountDetails', []] },
          then: [],
          else: {
            $filter: {
              input: '$customerDiscountDetails',
              as: 'specificUserCustomerDiscount',
              cond: {
                $eq: [
                  '$$specificUserCustomerDiscount.type',
                  'specificUser'
                ]
              }
            }
          }
        }
      }
    }
  },
  allUserCustomerDiscountPipeline: {
    $addFields: {
      allUserCustomerDiscount: {
        $cond: {
          if: { $eq: ['$customerDiscountDetails', []] },
          then: [],
          else: {
            $filter: {
              input: '$customerDiscountDetails',
              as: 'allUserCustomerDiscount',
              cond: { $eq: ['$$allUserCustomerDiscount.type', 'all'] }
            }
          }
        }
      }
    }
  },
  priceAfterDiscountPipeline: {
    $addFields: {
      prices: {
        $cond: {
          if: {
            $and: [
              { $eq: ['$allUserCustomerDiscount', []] },
              { $eq: ['$specificUserCustomerDiscount', []] }
            ]
          },
          then: '$prices',
          else: {
            $cond: {
              if: { $ne: ['$specificUserCustomerDiscount', []] },
              then: {
                $arrayElemAt: ['$specificUserCustomerDiscount.prices', 0]
              },
              else: {
                $cond: {
                  if: { $ne: ['$allUserCustomerDiscount', []] },
                  then: {
                    $arrayElemAt: ['$allUserCustomerDiscount.prices', 0]
                  },
                  else: '$prices'
                }
              }
            }
          }
        }
      }
    }
  },
  priceOfferOnAsPerPostcodeCountryPipeline: (postcode, country) => {
    return {
      $addFields: {
        prices: {
          $cond: {
            if: { $in: [postcode, ['', null, undefined]] },
            then: '$prices',
            else: {
              $filter: {
                input: '$prices',
                as: 'price',
                cond: {
                  $and: [
                    { $eq: ['$$price.zipCode', postcode] },
                    { $eq: [{ $toString: '$$price.countryId' }, country] }
                  ]
                }
              }
            }
          }
        },
        offerOn: {
          $cond: {
            if: { $in: [postcode, ['', null, undefined]] },
            then: [],
            else: {
              $filter: {
                input: '$prices',
                as: 'price',
                cond: {
                  $and: [
                    { $eq: ['$$price.zipCode', postcode] },
                    { $eq: [{ $toString: '$$price.countryId' }, country] },
                    {$ne: ["$$price.quantity", 0]},
                    {$ne: ["$$price.discountInPercent", 0]},
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  driverLookupPipeline: {
    $lookup: {
      from: 'deliveryboys',
      as: 'driverDetails',
      let: { driverId: '$driver' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$driverId'] }
          }
        },
        {
          $addFields: {
            profilePic: {
              $cond: {
                if: '$profilePic',
                then: {
                  $concat: [process.env.AWS_MEDIA_URL, '$profilePic']
                },
                else: ''
              }
            }
          }
        },
        {
          $addFields: {
            latitude: 21.4545,
            longitude: 75.4545
          }
        },
        {
          $project: {
            fullName: 1,
            email: 1,
            countryCode: 1,
            mobile: 1,
            profilePic: 1,
            latitude: 1,
            longitude: 1
          }
        }
      ]
    }
  },
  driverUnwindPipeline: {
    $unwind: {
      path: '$driverDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  vehicleLookupPipeline: {
    $lookup: {
      from: 'vehicles',
      as: 'vehicleDetails',
      let: { vehicleId: '$vehicle' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$_id', '$$vehicleId'] }
          }
        },
        {
          $project: {
            vehicleNo: 1
          }
        }
      ]
    }
  },
  vehicleUnwindPipeline: {
    $unwind: {
      path: '$vehicleDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  countryLookupPipeline: (country) => {
    return {
      $lookup: {
        from: 'countries',
        as: 'countryDetails',
        let: { countryId: country },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$countryId'] }
            }
          }
        ]
      }
    }
  },
  countryUnwindPipeline: {
    $unwind: {
      path: '$countryDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  productQuantityLookupPipeline: (id) => {
    return {
      $lookup: {
        from: 'inventories',
        as: 'inventoryDetails',
        let: { supplierProductId: id },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$supplierProductId', '$$supplierProductId'] }
            }
          }
        ]
      }
    }
  },
  productQuantityUnwindPipeline: {
    $unwind: {
      path: '$inventoryDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  ratingReviewLookupPipeline: (id) => {
    return {
      $lookup: {
        from: 'ratingreviews',
        as: 'reviewDetails',
        let: { receiverId: id },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$receiverId', '$$receiverId'] }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  },
  ratingReviewUnwindPipeline: {
    $unwind: {
      path: '$reviewDetails',
      preserveNullAndEmptyArrays: true
    }
  },
  commonPipelineForOrderCount : [
    {
      $match: {
        $and: [
          {
            $expr: { $eq: ["$userId", "$$userId"] }
          },
          {
            $expr: { $eq: ["$supplierId", "$$supplierId"] }
          }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1}
      }
    }
  ],
  commonPipelineForOrderCountAdmin : [
    {
      $match: {
        $expr: { $eq: ["$userId", "$$userId"] }
      }
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1}
      }
    }
  ],
  commonFavoritePipeline: {
    $addFields: {
      isFavorite: {
        $cond: {
          if: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$userDetails.favoriteProducts",
                    as: "favorite",
                    cond: { $eq: ["$$favorite._id", "$supplierProductId"] }
                  }
                }
              },
              0
            ]
          },
          then: true,
          else: false
        }
      }
    }
  },
  mySupplierReview:(req) => {
    return {
      $lookup: {
      from: 'ratingreviews',
      as: 'reviewDetailsSupplier',
      let: { receiverId: "$supplierId", senderId: {$toObjectId: req.user._id} },
      pipeline: [
        {
          $match: {
            $and: [{ $expr: { $eq: ['$receiverId', '$$receiverId'] } }, { $expr: { $eq: ['$senderId', '$$senderId'] } }]
          }
        },
      ]
    }
    }
  },
  mySupplierReviewUnwind: {
    $unwind: {
      path: '$reviewDetailsSupplier',
      preserveNullAndEmptyArrays: true
    }
  },
  myProductReview: (req) => {
    return {
      $lookup: {
      from: 'ratingreviews',
      as: 'reviewDetailsProduct',
      let: { receiverId: {$toObjectId: "$supplierProductId"}, senderId: {$toObjectId: req.user._id} },
      pipeline: [
        {
          $match: {
            $and: [{ $expr: { $eq: ['$receiverId', '$$receiverId'] } }, { $expr: { $eq: ['$senderId', '$$senderId'] } }]
          }
        },
      ]
    }
    }
  },
  myProductUnwind: {
    $unwind: {
      path: '$reviewDetailsProduct',
      preserveNullAndEmptyArrays: true
    }
  },


userListBasePipeline: (keyword, status) => {
  let match = {
    isDeleted: { $ne: true }
  };

  // Status filter
  if (status && status.trim() !== "") {
    match.status = status; // Match exact status
  }

  // Keyword filter
  if (keyword && keyword.trim() !== "") {
    match.$or = [
      { firstName: { $regex: keyword, $options: "i" } },
      { lastName: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { mobile: { $regex: keyword, $options: "i" } }
    ];
  }

  return [
    { $match: match },
    { $sort: { updatedAt: -1 } },
    {
      $project: {
        password: 0,
        deviceToken: 0,
        refreshToken: 0,
        socialId: 0,
        __v: 0
      }
    }
  ];
}
,

getAdminDashboardPipeline: () => {
  return [
    {
      $facet: {
        users: [
          { $match: { role: "user", isDeleted: false } },
          { $count: "totalUsers" }
        ],

        drivers: [
          {
            $lookup: {
              from: "drivers",
              pipeline: [
                { $match: { status: "active", isDeleted: false  } },
                { $count: "totalDrivers" }
              ],
              as: "driverCount"
            }
          },
          {
            $project: {
              totalDrivers: { $arrayElemAt: ["$driverCount.totalDrivers", 0] }
            }
          }
        ],

        rides: [
          {
            $lookup: {
              from: "rides",
              pipeline: [
                {
                  $group: {
                    _id: null,
                    totalRides: { $sum: 1 },
                    cancelledRides: {
                      $sum: {
                        $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
                      }
                    },
                    totalRevenue: {
                      $sum: "$paymentDetails.adminCommissionAmount"
                    },
                    totalDriverEarnings: {
                      $sum: "$paymentDetails.driverReceivedAmount"
                    }
                  }
                }
              ],
              as: "rideSummary"
            }
          },
          {
            $project: {
              totalRides: { $arrayElemAt: ["$rideSummary.totalRides", 0] },
              cancelledRides: {
                $arrayElemAt: ["$rideSummary.cancelledRides", 0]
              },
              totalRevenue: { $arrayElemAt: ["$rideSummary.totalRevenue", 0] },
              totalDriverEarnings: {
                $arrayElemAt: ["$rideSummary.totalDriverEarnings", 0]
              }
            }
          }
        ],
      
        yearlyRevenue: [
      {
        $lookup: {
          from: "rides",
          pipeline: [
            {
              $group: {
                _id: { $year: "$createdAt" },
                totalRevenue: {
                  $sum: "$paymentDetails.adminCommissionAmount"
                }
              }
            },
            { $sort: { "_id": -1 } } // latest year first
          ],
          as: "yearlyRevenue"
        }
      },
      { $project: { yearlyRevenue: 1 } }
    ],

  
revenueTrend: [
  {
    $lookup: {
      from: "rides",
      pipeline: [{$match: {status: "completed"}},
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalRevenue: {
              $sum: "$paymentDetails.adminCommissionAmount"
            }
          }
        },
        { $sort: { "_id.year": -1, "_id.month": 1 } },

        // Convert month number → month name
        {
          $project: {
            _id: 0,
            month: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
                  { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
                  { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
                  { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
                  { case: { $eq: ["$_id.month", 5] }, then: "May" },
                  { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
                  { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
                  { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
                  { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
                  { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
                  { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
                  { case: { $eq: ["$_id.month", 12] }, then: "Dec" }
                ],
                default: "Unknown"
              }
            },
            totalRevenue: 1
          }
        }
      ],
      as: "revenueTrend"
    }
  },
  { $project: { revenueTrend: 1 } }
]


// 
      }
    },

   
    {
      $project: {
        totalUsers: { $arrayElemAt: ["$users.totalUsers", 0] },
        totalDrivers: { $arrayElemAt: ["$drivers.totalDrivers", 0] },

        totalRides: { $arrayElemAt: ["$rides.totalRides", 0] },
        cancelledRides: { $arrayElemAt: ["$rides.cancelledRides", 0] },
        totalRevenue: { $arrayElemAt: ["$rides.totalRevenue", 0] },
        totalDriverEarnings: {
          $arrayElemAt: ["$rides.totalDriverEarnings", 0]
        },

       
          yearlyRevenue: { $arrayElemAt: ["$yearlyRevenue.yearlyRevenue", 0] },
   
revenueTrend: { 
  $arrayElemAt: ["$revenueTrend.revenueTrend", 0] 
}

      }
    }
  ];
}



}










  // const { default: mongoose } = require("mongoose")

  // module.exports = {


  //   userListBasePipeline : (page, limit) => {
  //   return [
  //     {
  //       $facet: {
  //         docs: [
  //           { $skip: (page - 1) * limit },
  //           { $limit: limit }
  //         ],
  //         totalDocs: [
  //           { $count: "count" }
  //         ]
  //       }
  //     },
  //     {
  //       $project: {
  //         docs: 1,
  //         totalDocs: {
  //           $ifNull: [{ $arrayElemAt: ["$totalDocs.count", 0] }, 0]
  //         },
  //         limit: { $literal: limit },
  //         page: { $literal: page },
  //         totalPages: {
  //           $ceil: {
  //             $divide: [
  //               { $ifNull: [{ $arrayElemAt: ["$totalDocs.count", 0] }, 0] },
  //               limit
  //             ]
  //           }
  //         }
  //       }
  //     }
  //   ];
  // }
  // }








