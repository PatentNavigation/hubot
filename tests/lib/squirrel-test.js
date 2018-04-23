const { assert } = require('chai');
const {
  Promise: {
    resolve,
    reject
  }
} = require('bluebird');
const { fetchBuildVersion } = require('../../lib/squirrel');
const { setTestConfig } = require('../../lib/get-config');
const { docClient } = require('../../lib/aws');
const sinon = require('sinon');

describe('electron', function() {
  let squirrel = 'squirrel';
  let app = {
    id: 'my-app',
    appName: 'somename',
    stage: { squirrel },
    prod: { squirrel }
  };

  let sandbox = sinon.sandbox.create();

  // stub for doc client
  function promise() {
    return resolve({ Items: [ { version: '1.2.3-r12345' } ] });
  }

  // stub for doc client
  function promiseReject() {
    return reject();
  }

  beforeEach(function() {
    setTestConfig({
      electron_table: 'testtable' // eslint-disable-line camelcase
    });
  });

  afterEach(function() {
    setTestConfig(null);
    sandbox.restore();
  });

  describe('fetchBuildVersion stage', function() {
    it('works for stage', function() {
      let stub = sandbox.stub(docClient, 'query').returns({ promise });
      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.deepEqual(stub.getCall(0).args[0], {
          TableName: 'testtable',
          KeyConditionExpression: '#name = :hkey',
          FilterExpression: '#dev = :dev',
          ExpressionAttributeNames: { '#name': 'name', '#dev': 'dev' },
          ExpressionAttributeValues: { ':hkey': 'somename_darwin_x64', ':dev': true },
          ScanIndexForward: false
        });
        assert.equal(buildNum, "12345");
      });
    });
    it('works for prod', function() {
      let stub = sandbox.stub(docClient, 'query').returns({ promise });
      return fetchBuildVersion(app, 'prod').then((buildNum) => {
        assert.deepEqual(stub.getCall(0).args[0], {
          TableName: 'testtable',
          KeyConditionExpression: '#name = :hkey',
          FilterExpression: '#release = :release',
          ExpressionAttributeNames: { '#name': 'name', '#release': 'release' },
          ExpressionAttributeValues: { ':hkey': 'somename_darwin_x64', ':release': true },
          ScanIndexForward: false
        });
        assert.equal(buildNum, "12345");
      });
    });
    it('throws an error when the AWS SDK returns an error', function() {
      sandbox.stub(docClient, 'query').returns({ promise: promiseReject });

      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.ok(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.ok(true);
      });
    });
    it('throws an error when an invalid stack is specified', function() {
      return fetchBuildVersion(app, 'fooblyfoo').then((buildNum) => {
        assert.ok(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.ok(true);
      });
    });

    it('throws an error when the app is not a squirrel app', function() {
      return fetchBuildVersion({ id: 'my-app', stage: { opsworksId: "12" } }).then((buildNum) => {
        assert.ok(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.ok(true);
      });
    });
  });
});
