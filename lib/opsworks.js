const {
  Promise: {
    reject
  }
} = require('bluebird');
const { opsworks } = require('./aws');

//
// Given an app and the name of a stack, get the deployed build number of that
// app in that stack from OpsWorks
//
function fetchBuildVersion(app, stack) {
  if (!app[stack]) {
    return reject(`${app.id} doesn't have info for stack ${stack}`);
  }
  let { opsworksId } = app[stack];
  if (!opsworksId) {
    return reject(`${app.id} doesn't have an opsworksId`);
  }

  return opsworks.describeApps({ AppIds: [ opsworksId ] }).then((data) => data.Apps[0].Attributes.DocumentRoot);
}

module.exports = { fetchBuildVersion };
