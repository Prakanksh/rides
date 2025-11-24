const AwsUrlsModel = require('../../models/awsUrls.model')
const {deleteImageFromS3} = require('../../configs/aws_delete')
const awsUrl = async (req, res) => {
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
}


module.exports = awsUrl 