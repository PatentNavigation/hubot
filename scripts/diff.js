const {
  Promise: {
    all,
    resolve,
    reject
  }
} = require('bluebird');
const { getAppMethods } = require('../lib/app-types');
const makeAttachments = require('../lib/make-attachments');

function diffHandler(robot) {
  // We import these here instead of at the global scope so we can stub out
  // module functions/config in unit tests
  const { apps } = require('../lib/get-config')();
  const { getLastBuild } = require('../lib/circle');

  robot.respond(/diff (\S+)\s+(\S+)/, (res) => {
    let [ , from, to ] = res.match;

    return all(apps.map((app) => {
      return getLastBuild(app).then(({ gitUrl, revision: latestRevision }) => {
        return all([ gitUrl, getRevision(app, from, latestRevision), getRevision(app, to, latestRevision) ]);
      }).then(([ gitUrl, fromRevision, toRevision ]) => {
        return getCompareData(app, gitUrl, fromRevision, toRevision);
      }).catch((e) => {
        return resolve({ app, error: e.toString() });
      });
    })).then((values) => {
      return res.send(formatSlackResponse(values, "Compare on Github"));
    });
  });
}

function getRevision(app, stack, latestRevision) {
  // We import this here instead of at the global scope so we can stub out
  // module functions/config in unit tests
  const { getRevisionForBuild } = require('../lib/circle');

  if (stack === 'latest') {
    return latestRevision;
  }

  if (!app[stack]) {
    return reject(`No information for stack: ${stack}`);
  }

  let { fetchBuildVersion } = getAppMethods(app);
  if (!fetchBuildVersion) {
    return reject("Unable to determine app method");
  }

  return fetchBuildVersion(app, stack).then((buildNum) => {
    if (buildNum === 'DEV_VERSION') {
      return 'DEV_VERSION';
    } else {
      return getRevisionForBuild(app, buildNum);
    }
  });
}

function getShortRevision(revision) {
  if (revision === 'DEV_VERSION') {
    return 'DEV_VERSION';
  } else {
    return revision.substring(0, 9);
  }
}

function getCompareData(app, gitUrl, fromRev, toRev) {
  let linkUrl;
  let linkText = `${getShortRevision(fromRev)}...${getShortRevision(toRev)}`;
  if (fromRev === 'DEV_VERSION' || toRev === 'DEV_VERSION') {
    linkUrl = 'https://www.youtube.com/watch?v=OHVjs4aobqs';
  } else if (fromRev === toRev) {
    linkText = '(same commit)';
    linkUrl = `${gitUrl}/commit/${fromRev}`;
  } else {
    linkUrl = `${gitUrl}/compare/${fromRev}...${toRev}`;
  }

  return {
    app,
    linkText,
    linkUrl
  };
}

function formatSlackResponse(data, pretext) {
  return {
    attachments: makeAttachments({
      pretext,
      valueTitle: "Github",
      data,
      linkFactory: ({ linkUrl, linkText }) => `<${linkUrl}|${linkText}>`
    })
  };
}

module.exports = diffHandler;
