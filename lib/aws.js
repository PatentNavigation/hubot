const {
  Promise: {
    promisify
  }
} = require('bluebird');
const aws = require('aws-sdk');
const {
  aws_access_key_id: accessKeyId,
  aws_secret_access_key: secretAccessKey
} = require('./get-config')();

aws.config.update({ accessKeyId, secretAccessKey });

let dynamo = new aws.DynamoDB({ region: 'us-east-1' });
let docClient = new aws.DynamoDB.DocumentClient({ region: 'us-east-1' });
let opsworks = new aws.OpsWorks({ region: 'us-east-1' });

module.exports = {
  dynamo: {
    getItem: promisify(dynamo.getItem, { context: dynamo })
  },
  opsworks: {
    describeApps: promisify(opsworks.describeApps, { context: opsworks })
  },
  docClient
};
