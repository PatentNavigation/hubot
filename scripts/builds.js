const {
  Promise: {
    all,
    resolve
  }
} = require('bluebird');
const { getBuildUrl } = require('../lib/circle');
const makeAttachments = require('../lib/make-attachments');

function buildsHandler(robot) {
  // We import these here instead of at the global scope so we can stub out
  // module functions/config in unit tests
  const { getAppMethods } = require('../lib/app-types');
  const { getLastBuild } = require('../lib/circle');
  const { apps } = require('../lib/get-config')();

  robot.respond(/deployed in (.*)/, (res) => {
    let stack = res.match[1];
    return all(apps.map((app) => {
      let { fetchBuildVersion } = getAppMethods(app);
      if (fetchBuildVersion) {
        return processBuild(app, fetchBuildVersion(app, stack));
      } else {
        return resolve({ app, error: "Unable to determine app method" });
      }
    })).then((values) => {
      return res.send(formatSlackResponse(values, `Builds for apps in ${stack}`));
    });
  });

  robot.respond(/builds for (.*)/, (res) => {
    let target = res.match[1];

    let promises;
    if (target === 'all') {
      promises = apps.map((app) => {
        return processBuild(app, getLastBuild(app).then(({ buildNum }) => buildNum));
      });
    } else {
      let app = apps.find(({ id }) => id === target);
      if (!app) {
        return res.send(`I don't know about an app named ${target}`);
      }

      promises = [ processBuild(app, getLastBuild(app).then(({ buildNum }) => buildNum)) ];
    }

    return all(promises).then((values) => {
      return res.send(formatSlackResponse(values, "Most recent successful builds"));
    });
  });
}

function processBuild(app, buildNumPromise) {
  return buildNumPromise.then((buildNum) => {
    return {
      app,
      buildNum,
      circleUrl: getBuildUrl(app, buildNum)
    };
  }).catch((e) => {
    e = e || "Unknown error";
    // Turn failures into success with error string
    return { app, error: e.toString() };
  });
}

function formatSlackResponse(data, pretext) {
  return {
    attachments: makeAttachments({
      pretext,
      valueTitle: "Build",
      data,
      linkFactory: ({ buildNum, circleUrl }) => `<${circleUrl}|Circle Build ${buildNum}>`
    })
  };
}

module.exports = buildsHandler;
