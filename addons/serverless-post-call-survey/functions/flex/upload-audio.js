const { prepareFlexFunction } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);
const AssetOps = require(Runtime.getFunctions()['twilio-wrappers/serverless-assets'].path);

const requiredParameters = [
  { key: 'fileBase64', purpose: 'Base64-encoded audio file content' },
  { key: 'contentType', purpose: 'MIME type: audio/mpeg or audio/wav' },
  { key: 'assetPath', purpose: 'Target asset path, e.g. /survey-audio/key_intro.mp3' },
  { key: 'Token', purpose: 'Flex Token' },
];

exports.handler = prepareFlexFunction(
  requiredParameters,
  async (context, event, callback, response, handleError) => {
    try {
      const { fileBase64, contentType, assetPath } = event;

      const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav'];
      if (!ALLOWED_TYPES.includes(contentType)) {
        response.setStatusCode(400);
        response.setBody({ success: false, message: 'Invalid content type. Use audio/mpeg or audio/wav.' });
        return callback(null, response);
      }

      const fileBuffer = Buffer.from(fileBase64, 'base64');

      if (fileBuffer.length > 8_000_000) {
        response.setStatusCode(413);
        response.setBody({ success: false, message: 'File exceeds 8MB limit' });
        return callback(null, response);
      }

      const createResult = await AssetOps.createAudioAsset({
        context,
        friendlyName: assetPath.split('/').pop(),
      });

      if (!createResult.success) {
        response.setStatusCode(createResult.status);
        response.setBody({ success: false, message: createResult.message });
        return callback(null, response);
      }

      const uploadResult = await AssetOps.uploadAudioAssetVersion({
        context,
        assetSid: createResult.assetSid,
        assetPath,
        fileBuffer,
        contentType,
      });

      if (!uploadResult.success) {
        response.setStatusCode(uploadResult.status);
        response.setBody({ success: false, message: uploadResult.message });
        return callback(null, response);
      }

      const { domainName } = await AssetOps.getServiceDomain(context);

      response.setStatusCode(200);
      response.setBody({
        success: true,
        assetVersionSid: uploadResult.assetVersionSid,
        pendingUrl: `https://${domainName}${assetPath}`,
      });
      return callback(null, response);
    } catch (error) {
      return handleError(error);
    }
  },
);
