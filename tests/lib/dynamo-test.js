const { assert } = require('chai');
const {
  Promise: {
    resolve,
    reject
  }
} = require('bluebird');
const { fetchBuildVersion } = require('../../lib/dynamo');
const { setTestConfig } = require('../../lib/get-config');
const { dynamo } = require('../../lib/aws');
const sinon = require('sinon');

const html = `
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="my-app/config/environment" content="%7B%22modulePrefix%22%3A%22my-app%22%2C%22environment%22%3A%22production%22%2C%22rootURL%22%3A%22/%22%2C%22routerRootURL%22%3A%22/officeaction/shell/%22%2C%22locationType%22%3A%22history%22%2C%22EmberENV%22%3A%7B%22FEATURES%22%3A%7B%7D%2C%22EXTEND_PROTOTYPES%22%3A%7B%22Date%22%3Afalse%7D%7D%2C%22APP%22%3A%7B%22name%22%3A%22my-app%22%2C%22version%22%3A%223.1.0-123%22%7D%2C%22ember-cli-mirage%22%3A%7B%22enabled%22%3Afalse%2C%22usingProxy%22%3Afalse%2C%22useDefaultPassthroughs%22%3Atrue%7D%2C%22something%22%3A%22test%22%2C%22exportApplicationGlobal%22%3Afalse%7D"/>
    </head>
  </html>
`;

const htmlOldVersion = `
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="my-app/config/environment" content="%7B%22modulePrefix%22%3A%22my-app%22%2C%22environment%22%3A%22production%22%2C%22rootURL%22%3A%22/%22%2C%22routerRootURL%22%3A%22/officeaction/shell/%22%2C%22locationType%22%3A%22history%22%2C%22EmberENV%22%3A%7B%22FEATURES%22%3A%7B%7D%2C%22EXTEND_PROTOTYPES%22%3A%7B%22Date%22%3Afalse%7D%7D%2C%22APP%22%3A%7B%22name%22%3A%22my-app%22%2C%22version%22%3A%22123-master-891eaa0a6863069d2e5f567c68d059fbbe134ff6+891eaa0a%22%7D%2C%22ember-cli-mirage%22%3A%7B%22enabled%22%3Afalse%2C%22usingProxy%22%3Afalse%2C%22useDefaultPassthroughs%22%3Atrue%7D%2C%22something%22%3A%22test%22%2C%22exportApplicationGlobal%22%3Afalse%7D"/>
    </head>
  </html>
`;

describe('dynamo', function() {
  let app = {
    id: 'my-app',
    stage: { dynamoKey: '/stage/current' },
    prod: { dynamoKey: '/prod/current' }
  };

  let sandbox = sinon.sandbox.create();

  beforeEach(function() {
    setTestConfig({
      dynamo_table: 'testtable' // eslint-disable-line camelcase
    });
  });

  afterEach(function() {
    setTestConfig(null);
    sandbox.restore();
  });

  describe('fetchBuildVersion', function() {
    it('works', function() {
      let stub = sandbox.stub(dynamo, 'getItem').returns(resolve({ Item: { html: { S: html } } }));

      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.deepEqual(stub.getCall(0).args[0], {
          TableName: 'testtable',
          Key: { version_id: { S: '/stage/current' } }, // eslint-disable-line camelcase
          ProjectionExpression: 'html'
        });
        assert.equal(buildNum, "123");

        return fetchBuildVersion(app, 'prod');
      }).then((buildNum) => {
        assert.deepEqual(stub.getCall(1).args[0], {
          TableName: 'testtable',
          Key: { version_id: { S: '/prod/current' } }, // eslint-disable-line camelcase
          ProjectionExpression: 'html'
        });
        assert.equal(buildNum, "123");
      });
    });

    it('works with the old version format', function() {
      let stub = sandbox.stub(dynamo, 'getItem').returns(resolve({ Item: { html: { S: htmlOldVersion } } }));

      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.deepEqual(stub.getCall(0).args[0], {
          TableName: 'testtable',
          Key: { version_id: { S: '/stage/current' } }, // eslint-disable-line camelcase
          ProjectionExpression: 'html'
        });
        assert.equal(buildNum, "123");
      });
    });

    it('throws an error when the AWS SDK returns an error', function() {
      sandbox.stub(dynamo, 'getItem').returns(reject("Not found"));

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

    it('throws an error when the app is not a dynamo app', function() {
      return fetchBuildVersion({ id: 'my-app', stage: { opsworksId: "12" } }).then((buildNum) => {
        assert.ok(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.ok(true);
      });
    });
  });
});
