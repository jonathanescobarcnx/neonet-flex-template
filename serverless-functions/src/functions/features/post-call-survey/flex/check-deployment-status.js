const { prepareFlexFunction } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);
const AssetOps = require(Runtime.getFunctions()[
  'features/post-call-survey/twilio-wrappers/serverless-assets'
].path);

const requiredParameters = [
  { key: 'buildSid', purpose: 'Build SID returned by upload-audio endpoint' },
  { key: 'pendingUrl', purpose: 'Asset URL that will become active after deployment' },
  { key: 'Token', purpose: 'Flex Token' },
];

exports.handler = prepareFlexFunction(
  requiredParameters,
  async (context, event, callback, response, handleError) => {
    try {
      const { buildSid, pendingUrl } = event;

      const statusResult = await AssetOps.fetchBuildStatus({ context, buildSid });

      if (!statusResult.success) {
        response.setStatusCode(statusResult.status);
        response.setBody({ success: false, message: statusResult.message });
        return callback(null, response);
      }

      const { buildStatus } = statusResult;

      if (buildStatus === 'failed') {
        response.setStatusCode(500);
        response.setBody({ success: false, status: 'failed', message: 'Build failed' });
        return callback(null, response);
      }

      if (buildStatus !== 'completed') {
        response.setStatusCode(200);
        response.setBody({ success: true, status: 'building' });
        return callback(null, response);
      }

      // Build complete — trigger deployment (single fast API call)
      const deployResult = await AssetOps.createDeployment({ context, buildSid });

      if (!deployResult.success) {
        response.setStatusCode(deployResult.status);
        response.setBody({ success: false, message: deployResult.message });
        return callback(null, response);
      }

      response.setStatusCode(200);
      response.setBody({ success: true, status: 'deployed', url: pendingUrl });
      return callback(null, response);
    } catch (error) {
      return handleError(error);
    }
  },
);
