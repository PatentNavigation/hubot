const {
  Promise: {
    reject
  }
} = require('bluebird');
const request = require('request-promise');

//
// Given an app and the name of a stack, get its version in that stack via an
// API gateway request
//
function fetchBuildVersion(app, stack) {
  if (!app[stack]) {
    return reject(`${app.id} doesn't have info for stack ${stack}`);
  }
  let { apiGatewayUrl } = app[stack];
  if (!apiGatewayUrl) {
    return reject(`${app.id} doesn't have an apiGatewayUrl`);
  }

  return request(`${apiGatewayUrl}/version`);
}

module.exports = { fetchBuildVersion };
