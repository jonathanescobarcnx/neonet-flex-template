const { prepareFlexFunction } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);
const AssetOps = require(Runtime.getFunctions()['twilio-wrappers/serverless-assets'].path);

const requiredParameters = [
  { key: 'assetVersionSids', purpose: 'JSON array of asset version SIDs to include in the build' },
  { key: 'Token', purpose: 'Flex Token' },
];

exports.handler = prepareFlexFunction(
  requiredParameters,
  async (context, event, callback, response, handleError) => {
    try {
      const { assetVersionSids: assetVersionSidsRaw } = event;

      let assetVersionSids;
      try {
        assetVersionSids = JSON.parse(assetVersionSidsRaw);
      } catch {
        response.setStatusCode(400);
        response.setBody({ success: false, message: 'assetVersionSids must be a valid JSON array' });
        return callback(null, response);
      }

      if (!Array.isArray(assetVersionSids) || assetVersionSids.length === 0) {
        response.setStatusCode(400);
        response.setBody({ success: false, message: 'assetVersionSids must be a non-empty array' });
        return callback(null, response);
      }

      const buildResult = await AssetOps.createBuildWithVersions({ context, newAssetVersionSids: assetVersionSids });

      if (!buildResult.success) {
        response.setStatusCode(buildResult.status);
        response.setBody({ success: false, message: buildResult.message });
        return callback(null, response);
      }

      response.setStatusCode(200);
      response.setBody({ success: true, buildSid: buildResult.buildSid });
      return callback(null, response);
    } catch (error) {
      return handleError(error);
    }
  },
);
