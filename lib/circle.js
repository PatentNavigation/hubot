const request = require('request-promise');
const {
  Promise: {
    resolve
  }
} = require('bluebird');

const apiUrl = "https://circleci.com/api/v1/project/";
const webUrl = "https://circleci.com/gh/";

//
// Given an app and a build number, get the URL to that build in circle
//
function getBuildUrl(app, buildNum) {
  if (buildNum === 'DEV_VERSION') {
    return 'https://www.youtube.com/watch?v=ih2xubMaZWI';
  } else {
    return `${webUrl}${circlePath(app)}/${buildNum}`;
  }
}

//
// Given an app, get info on the app's latest build. Returns a promise
// resolving to
//
// {
//   buildNum: <build number>,
//   revision: <git revision>
// }
//
function getLastBuild(app) {
  return apiGet(`${circlePath(app)}/tree/master`, '&limit=1&filter=successful').then((result) => {
    let [ { build_num: buildNum, vcs_revision: revision, vcs_url: gitUrl } ] = result;
    return {
      buildNum,
      gitUrl,
      revision
    };
  });
}

//
// Given an app and a build number, return a promise resolving to the git
// revision for that build. If the build number is DEV_VERSION, this will just
// return DEV_VERSION.
//
function getRevisionForBuild(app, buildNum) {
  if (buildNum === "DEV_VERSION") {
    return resolve(buildNum);
  }

  return apiGet(`${circlePath(app)}/${buildNum}`).then(({ vcs_revision: revision }) => revision);
}

function apiGet(path, queryString = '') {
  // Do this here instead of the top of the file to support test overriding
  const { circle_token: token } = require('./get-config')();

  return request({
    url: `${apiUrl}${path}?circle-token=${token}${queryString}`,
    headers: { 'Accept': 'application/json' }
  }).then(JSON.parse);
}

function circlePath(app) {
  return app.circleUrl || `PatentNavigation/${app.id}`;
}

module.exports = {
  getBuildUrl,
  getLastBuild,
  getRevisionForBuild
};
