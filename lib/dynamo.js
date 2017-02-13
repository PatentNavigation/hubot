const {
  Promise: {
    promisify,
    reject
  }
} = require('bluebird');
const { dynamo } = require('./aws');
const jsdom = require('jsdom');
const jquery = require('jquery');

let jsDomEnv = promisify(jsdom.env);

//
// Given an app and the name of a stack, get its version in that stack out of
// its DynamoDB HTML
//
function fetchBuildVersion(app, stack) {
  if (!app[stack]) {
    return reject(`${app.id} doesn't have info for stack ${stack}`);
  }
  let { dynamoKey } = app[stack];
  if (!dynamoKey) {
    return reject(`${app.id} doesn't have a dynamoKey`);
  }
  let { metaName } = app;
  metaName = metaName || `${app.id}/config/environment`;

  return getHtml(dynamoKey).then((html) => {
    return jsDomEnv(html, [ jquery ]);
  }).then((window) => {
    let $ = jquery(window);
    let $meta = $(`meta[name='${metaName}']`);
    if ($meta.length === 0) {
      return reject(`Unable to find meta tag with name '${metaName}' in ${dynamoKey} HTML`);
    }

    let { APP: { version } } = JSON.parse(decodeURIComponent($meta.attr('content')));
    return version.split('-')[0];
  });
}

function getHtml(key) {
  // Do this here instead of the top of the file to support test overriding
  const { dynamo_table: table } = require('./get-config')();

  // Call it like this rather than de-structuring for test mocking
  return dynamo.getItem({
    TableName: table,
    Key: { version_id: { S: key } }, // eslint-disable-line camelcase
    ProjectionExpression: 'html'
  }).then((data) => data.Item.html.S);
}

module.exports = { fetchBuildVersion };
