const AWS = require('aws-sdk')
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY
})

// Create an instance of the S3 service
const s3 = new AWS.S3()

async function deleteImageFromS3(bucketName, imageName) {
    const params = {
        Bucket: bucketName,
        Key: `${imageName}`
    }
    try {
        const resp = await s3.deleteObject(params).promise()
        console.log('Image deleted successfully', resp)
    } catch (error) {
        console.error('Error deleting image:', error)
    }
}

exports.deleteImageFromS3 = deleteImageFromS3