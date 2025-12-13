// let path = require('path')
// let admin = require('firebase-admin')

// // Initialize Firebase Admin only if credentials are available
// let firebaseInitialized = false
// try {
//   let serviceAccount = require(path.resolve(
//     __dirname,
//     '..',
//     'configs',
//     'firebase-admin-sdk'
//   ))
  
//   if (serviceAccount && serviceAccount.private_key) {
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount)
//     })
//     firebaseInitialized = true
//     console.log('✅ Firebase Admin initialized successfully')
//   } else {
//     console.log('⚠️  Firebase Admin credentials not found or invalid - notifications will be disabled')
//   }
// } catch (error) {
//   console.log('⚠️  Firebase Admin initialization failed - notifications will be disabled')
//   console.log('   Error:', error.message)
//   firebaseInitialized = false
// }
// const sendNotifications = async messages => {
//   if (!firebaseInitialized) {
//     console.log('⚠️  Firebase not initialized - skipping push notifications')
//     return
//   }
//   if (messages.length) {
//     try {
//       let sendNotification = await admin.messaging().sendEach(messages)
//       if (sendNotification.failureCount) {
//         console.log('Notification failureCount: ', sendNotification.failureCount)
//         // JSON.stringify(sendNotification, null, 2)

//       } else {
//         console.log('Notification successCount: ', sendNotification.successCount)
//       }
//     } catch (error) {
//       console.log("error sending push notifications", error)
//     }
//   } else {
//     console.log(messages)
//   }
// }
// const sendMulticast = async messageTo => {
//   if (!firebaseInitialized) {
//     console.log('⚠️  Firebase not initialized - skipping push notifications')
//     return
//   }
//   try {
//     const sendNoti = await admin.messaging().sendMulticast(messageTo)
//     if (sendNoti.failureCount) {
//       console.log(
//         'Notification send failureCount: ',
//         sendNoti.failureCount,
//         JSON.stringify(sendNoti)
//       )
//     } else {
//       console.log(
//         'Notification send successCount: ',
//         sendNoti.successCount,
//         sendNoti
//       )
//     }
//   } catch (e) {
//     console.log(e)
//   }
// }

// module.exports = {
//   sendNotifications, sendMulticast
// }
