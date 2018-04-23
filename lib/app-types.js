const versionMethods = {
  apiGateway: require('../lib/api-gateway'),
  dynamo: require('../lib/dynamo'),
  opsworks: require('../lib/opsworks'),
  squirrel: require('../lib/squirrel')
};

//
// Get a string describing the app's type
//
function getAppType(app) {
  const typeAttrs = {
    apiGatewayUrl: 'apiGateway',
    dynamoKey: 'dynamo',
    opsworksId: 'opsworks',
    squirrel: 'squirrel'
  };
  let attr = Object.keys(typeAttrs).find((attr) => app.stage[attr]);
  return attr ? typeAttrs[attr] : 'unknown';
}

//
// Get a module implementing methods for managing the app
//
function getAppMethods(app) {
  return versionMethods[getAppType(app)] || {};
}

module.exports = { getAppType, getAppMethods };
