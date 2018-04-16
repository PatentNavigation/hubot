const { docClient } = require('./aws');
const {
  Promise: {
    reject
  }
} = require('bluebird');

//
// Given an app and the name of a stack, get its version in that stack out of
// its DynamoDB HTML
//
function fetchBuildVersion(app, stack) {
  if (!app[stack]) {
    return reject(`${app.id} doesn't have info for stack ${stack}`);
  }
  let { squirrel } = app[stack];
  if (!squirrel) {
    return reject(`${app.id} is not a squirrel controlled version`);
  }

  let { appName } = app;

  if (!appName) {
    return reject(`${app.appName} is does not have an application name set`);
  }
  // All builds should be in sync so lets just use the darwin build to fetch
  // the version number
  const name = `${app.appName}_darwin_x64`;

  let KeyConditionExpression = '#name = :hkey';
  let ExpressionAttributeNames = {
    '#name': 'name'
  };
  let ExpressionAttributeValues = {
    ':hkey': name
  };

  let FilterExpression = '';

  if (stack === 'prod') {
    ExpressionAttributeNames['#release'] = 'release';
    ExpressionAttributeValues[':release'] = true;
    FilterExpression = '#release = :release';
  } else if (stack === 'stage') {
    ExpressionAttributeNames['#dev'] = 'dev';
    ExpressionAttributeValues[':dev'] = true;
    FilterExpression = '#dev = :dev';
  }

  const { electron_table: TableName } = require('./get-config')();

  let params = {
    TableName,
    KeyConditionExpression,
    FilterExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ScanIndexForward: false
  };
  return docClient.query(params).promise().then(({ Items }) => {
    // version numbers are of form 1.2.3-r12345 so split on -' and lop off the r
    return Items[0].version.split('-')[1].substring(1);
  });
}

module.exports = { fetchBuildVersion };
