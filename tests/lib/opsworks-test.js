const { assert } = require('chai');
const {
  Promise: {
    resolve,
    reject
  }
} = require('bluebird');
const { fetchBuildVersion } = require('../../lib/opsworks');
const { opsworks } = require('../../lib/aws');
const sinon = require('sinon');

describe('opsworks', function() {
  let app = {
    id: 'my-app',
    stage: { opsworksId: '1111' },
    prod: { opsworksId: '2222' }
  };

  let sandbox = sinon.sandbox.create();

  afterEach(function() {
    sandbox.restore();
  });

  describe('fetchBuildVersion', function() {
    it('works', function() {
      let stub = sandbox.stub(opsworks, 'describeApps').returns(resolve({
        Apps: [
          {
            Attributes: {
              DocumentRoot: "123"
            }
          }
        ]
      }));

      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.deepEqual(stub.getCall(0).args[0], { AppIds: [ '1111' ] });
        assert.equal(buildNum, "123");

        return fetchBuildVersion(app, 'prod');
      }).then((buildNum) => {
        assert.deepEqual(stub.getCall(1).args[0], { AppIds: [ '2222' ] });
        assert.equal(buildNum, "123");
      });
    });

    it('throws an error when the AWS SDK returns an error', function() {
      sandbox.stub(opsworks, 'describeApps').returns(reject("Not found"));

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

    it('throws an error when the app is not a opsworks app', function() {
      return fetchBuildVersion({ id: 'my-app', stage: { dynamoKey: "/foo/bar" } }).then((buildNum) => {
        assert.ok(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.ok(true);
      });
    });
  });
});
