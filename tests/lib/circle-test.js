const { assert } = require('chai');
const {
  getBuildUrl,
  getLastBuild,
  getRevisionForBuild
} = require('../../lib/circle');
const {
  Promise: {
    resolve
  }
} = require('bluebird');
const { setTestConfig } = require('../../lib/get-config');
const { docClient } = require('../../lib/aws');
const nock = require('nock');
const sinon = require('sinon');

describe('circle', function() {
  let app = {
    id: 'my-app'
  };

  let sandbox = sinon.sandbox.create();

  let buildInfo = {
    'vcs_revision': '2603cb49452827184714c92083caffe8f1e2db27',
    'vcs_url': 'https://github.com/PatentNavigation/my-app',
    'build_num': 104
  };

  // stub for doc client
  function promise() {
    return resolve({ Items: [ { version: '1.2.3-r104' } ] });
  }

  beforeEach(function() {
    setTestConfig({
      circle_token: 'testtoken', // eslint-disable-line camelcase
      electron_table: 'testtable' // eslint-disable-line camelcase
    });
  });

  afterEach(function() {
    nock.cleanAll();
    sandbox.restore();
    setTestConfig(null);
  });

  describe('getBuildUrl', function() {
    it('works', function() {
      let url = getBuildUrl(app, 123);
      assert.equal(url, 'https://circleci.com/gh/PatentNavigation/my-app/123');
    });

    it('works with a custom circle path', function() {
      let url = getBuildUrl({ id: 'my-app', circleUrl: 'PatentNavigation/my-custom-app' }, 123);
      assert.equal(url, 'https://circleci.com/gh/PatentNavigation/my-custom-app/123');
    });
  });

  describe('getLastBuild', function() {
    it('works', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-app/tree/master').query({
        limit: 1,
        filter: 'successful',
        'circle-token': 'testtoken'
      }).reply(200, [ buildInfo ]);

      return getLastBuild(app).then(({ buildNum, gitUrl, revision }) => {
        assert.equal(buildNum, 104);
        assert.equal(gitUrl, 'https://github.com/PatentNavigation/my-app');
        assert.equal(revision, '2603cb49452827184714c92083caffe8f1e2db27');
      });
    });

    it('works with a custom circle path', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-custom-app/tree/master').query({
        limit: 1,
        filter: 'successful',
        'circle-token': 'testtoken'
      }).reply(200, [ buildInfo ]);

      return getLastBuild({ id: 'my-app', circleUrl: 'PatentNavigation/my-custom-app' }).then(({ buildNum, gitUrl, revision }) => {
        assert.equal(buildNum, 104);
        assert.equal(gitUrl, 'https://github.com/PatentNavigation/my-app');
        assert.equal(revision, '2603cb49452827184714c92083caffe8f1e2db27');
      });
    });

    it('throws an error when the project is not found', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-app/').query({
        limit: 1,
        filter: 'successful',
        'circle-token': 'testtoken'
      }).reply(404, [ buildInfo ]);

      return getLastBuild(app).then((res) => {
        assert.isOk(false, `unexpected success: ${res}`);
      }).catch(() => {
        assert.isOk(true);
      });
    });

    it('works with a squirrel setting', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/somename/104').query({
        'circle-token': 'testtoken'
      }).reply(200, [ buildInfo ]);
      sandbox.stub(docClient, 'query').returns({ promise });
      return getLastBuild({ id: 'my-app', appName: 'somename', stage: { squirrel: 'squirrel' } }).then(({ buildNum, gitUrl, revision }) => {

        assert.equal(buildNum, 104);
        assert.equal(gitUrl, 'https://github.com/PatentNavigation/my-app');
        assert.equal(revision, '2603cb49452827184714c92083caffe8f1e2db27');
      });
    });
  });

  describe('getRevisionForBuild', function() {
    it('works', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-app/123').query({
        'circle-token': 'testtoken'
      }).reply(200, buildInfo);

      return getRevisionForBuild(app, 123).then((revision) => {
        assert.equal(revision, '2603cb49452827184714c92083caffe8f1e2db27');
      });
    });

    it('works with a custom circle path', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-custom-app/123').query({
        'circle-token': 'testtoken'
      }).reply(200, buildInfo);

      return getRevisionForBuild({ id: 'my-app', circleUrl: 'PatentNavigation/my-custom-app' }, 123).then((revision) => {
        assert.equal(revision, '2603cb49452827184714c92083caffe8f1e2db27');
      });
    });

    it('works with a dev version', function() {
      return getRevisionForBuild(app, "DEV_VERSION").then((revision) => {
        assert.equal(revision, "DEV_VERSION");
      });
    });

    it('throws an error when the build is not found', function() {
      nock('https://circleci.com').get('/api/v1/project/PatentNavigation/my-app/123').query({
        'circle-token': 'testtoken'
      }).reply(404, buildInfo);

      return getRevisionForBuild(app, 123).then((res) => {
        assert.isOk(false, `unexpected success: ${res}`);
      }).catch(() => {
        assert.isOk(true);
      });
    });
  });
});
