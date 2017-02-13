const { assert } = require('chai');
const { fetchBuildVersion } = require('../../lib/api-gateway');
const nock = require('nock');

describe('api-gateway', function() {
  let app = {
    id: 'my-app',
    stage: { apiGatewayUrl: 'http://foo.com/stage' },
    prod: { apiGatewayUrl: 'http://foo.com/prod' }
  };

  afterEach(function() {
    nock.cleanAll();
  });

  describe('fetchBuildVersion', function() {
    beforeEach(function() {
      nock('http://foo.com').get('/stage/version').reply(200, "102");
      nock('http://foo.com').get('/prod/version').reply(200, "101");
    });

    it('works', function() {
      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.equal(buildNum, "102");

        return fetchBuildVersion(app, 'prod');
      }).then((buildNum) => {
        assert.equal(buildNum, "101");
      });
    });

    it('throws an error when an http error is returned', function() {
      nock('http://foo.com').get('/stage/version').reply(404);

      return fetchBuildVersion(app, 'stage').then((buildNum) => {
        assert.isOk(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.isOk(true);
      });
    });

    it('throws an error when an invalid stack is specified', function() {
      return fetchBuildVersion(app, 'fooblyfoo').then((buildNum) => {
        assert.isOk(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.isOk(true);
      });
    });

    it('throws an error when the app is not an apiGateway app', function() {
      return fetchBuildVersion({ id: 'my-app', stage: { opsworksId: "12" } }).then((buildNum) => {
        assert.isOk(false, `unexpected success: ${buildNum}`);
      }).catch(() => {
        assert.isOk(true);
      });
    });
  });
});
