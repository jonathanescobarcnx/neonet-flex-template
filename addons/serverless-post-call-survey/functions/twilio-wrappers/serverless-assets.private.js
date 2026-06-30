const axios = require('axios');
const FormData = require('form-data');

const getRegionUrl = () =>
  process.env.TWILIO_REGION ? `${process.env.TWILIO_REGION}.twilio.com` : 'twilio.com';

// SERVICE_SID and ENVIRONMENT_SID are auto-injected in production Twilio Serverless,
// but not in local dev. Discover them from DOMAIN_NAME when missing.
let _cachedServiceSid = null;
let _cachedEnvironmentSid = null;
let _cachedDomainName = null;

const discoverServiceIds = async (context) => {
  if (_cachedServiceSid && _cachedEnvironmentSid && _cachedDomainName) {
    return { serviceSid: _cachedServiceSid, environmentSid: _cachedEnvironmentSid, domainName: _cachedDomainName };
  }

  if (context.DOMAIN_NAME.startsWith('localhost')) {
    // Local dev: Twilio cannot match localhost to a deployed environment.
    // SERVICE_SID and ENVIRONMENT_SID must be set explicitly in .env.
    if (!context.SERVICE_SID || !context.ENVIRONMENT_SID) {
      throw new Error(
        'Audio upload requires SERVICE_SID and ENVIRONMENT_SID in your .env file when running locally. ' +
          'Find them in the Twilio Console under Functions & Assets > your serverless service.',
      );
    }
    _cachedServiceSid = context.SERVICE_SID;
    _cachedEnvironmentSid = context.ENVIRONMENT_SID;

    // Fetch the actual environment domain so asset URLs resolve correctly.
    const client = context.getTwilioClient();
    const env = await client.serverless.v1
      .services(_cachedServiceSid)
      .environments(_cachedEnvironmentSid)
      .fetch();
    _cachedDomainName = env.domainName;

    return { serviceSid: _cachedServiceSid, environmentSid: _cachedEnvironmentSid, domainName: _cachedDomainName };
  }

  // Production: auto-discover by matching the deployed environment domain.
  // Never use SERVICE_SID/ENVIRONMENT_SID from .env here — they may be placeholder
  // values that override what Twilio would otherwise auto-inject.
  const client = context.getTwilioClient();
  const services = await client.serverless.v1.services.list({ limit: 50 });

  for (const service of services) {
    const environments = await client.serverless.v1.services(service.sid).environments.list({ limit: 10 });
    const match = environments.find((e) => e.domainName === context.DOMAIN_NAME);
    if (match) {
      _cachedServiceSid = service.sid;
      _cachedEnvironmentSid = match.sid;
      _cachedDomainName = match.domainName;
      return { serviceSid: _cachedServiceSid, environmentSid: _cachedEnvironmentSid, domainName: _cachedDomainName };
    }
  }

  throw new Error(`Cannot find Serverless service for domain: ${context.DOMAIN_NAME}`);
};

exports.getServiceDomain = async (context) => {
  const { domainName } = await discoverServiceIds(context);
  return { domainName };
};

exports.createAudioAsset = async ({ context, friendlyName }) => {
  try {
    const { serviceSid } = await discoverServiceIds(context);
    const client = context.getTwilioClient();
    const asset = await client.serverless.v1.services(serviceSid).assets.create({ friendlyName });
    return { success: true, status: 200, assetSid: asset.sid };
  } catch (error) {
    return { success: false, status: error.status ?? 500, message: error.message };
  }
};

exports.uploadAudioAssetVersion = async ({ context, assetSid, assetPath, fileBuffer, contentType }) => {
  try {
    const { serviceSid } = await discoverServiceIds(context);
    const uploadUrl = `https://serverless-upload.${getRegionUrl()}/v1/Services/${serviceSid}/Assets/${assetSid}/Versions`;
    const form = new FormData();
    form.append('Path', assetPath);
    form.append('Visibility', 'public');
    form.append('Content', fileBuffer, { contentType, filename: assetPath.split('/').pop() });

    const resp = await axios.post(uploadUrl, form, {
      auth: { username: context.ACCOUNT_SID, password: context.AUTH_TOKEN },
      headers: form.getHeaders(),
    });

    return { success: true, status: 200, assetVersionSid: resp.data.sid };
  } catch (error) {
    return { success: false, status: error.response?.status ?? 500, message: error.message };
  }
};

// Accepts an array of new asset version SIDs and merges them into the latest build.
// Fetches the full build by SID to get complete assetVersions, functionVersions,
// and dependencies — the list() response does not populate these fields.
exports.createBuildWithVersions = async ({ context, newAssetVersionSids }) => {
  try {
    const { serviceSid } = await discoverServiceIds(context);
    const client = context.getTwilioClient();

    const buildsList = await client.serverless.v1.services(serviceSid).builds.list({ limit: 1 });
    const latestBuildSummary = buildsList[0];

    let existingAssetVersions = [];
    let existingFunctionVersions = [];
    let dependencies = [];

    if (latestBuildSummary) {
      const fullBuild = await client.serverless.v1
        .services(serviceSid)
        .builds(latestBuildSummary.sid)
        .fetch();
      existingAssetVersions = fullBuild.assetVersions?.map((v) => v.sid) ?? [];
      existingFunctionVersions = fullBuild.functionVersions?.map((v) => v.sid) ?? [];
      dependencies = fullBuild.dependencies ?? [];
    }

    const mergedAssetVersions = [...new Set([...existingAssetVersions, ...newAssetVersionSids])];

    const build = await client.serverless.v1.services(serviceSid).builds.create({
      assetVersions: mergedAssetVersions,
      functionVersions: existingFunctionVersions,
      dependencies: JSON.stringify(dependencies),
    });

    return { success: true, status: 200, buildSid: build.sid };
  } catch (error) {
    return { success: false, status: error.status ?? 500, message: error.message };
  }
};

exports.fetchBuildStatus = async ({ context, buildSid }) => {
  try {
    const { serviceSid } = await discoverServiceIds(context);
    const client = context.getTwilioClient();
    const buildStatus = await client.serverless.v1
      .services(serviceSid)
      .builds(buildSid)
      .buildStatus()
      .fetch();

    return { success: true, status: 200, buildStatus: buildStatus.status };
  } catch (error) {
    return { success: false, status: error.status ?? 500, message: error.message };
  }
};

exports.createDeployment = async ({ context, buildSid }) => {
  try {
    const { serviceSid, environmentSid } = await discoverServiceIds(context);
    const client = context.getTwilioClient();
    await client.serverless.v1
      .services(serviceSid)
      .environments(environmentSid)
      .deployments.create({ buildSid });

    return { success: true, status: 200 };
  } catch (error) {
    return { success: false, status: error.status ?? 500, message: error.message };
  }
};
