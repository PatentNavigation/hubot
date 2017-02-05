const {
  Promise: {
    resolve
  }
} = require('bluebird');
const { assert } = require('chai');
const diffHandler = require('../../scripts/diff');
const apiGateway = require('../../lib/api-gateway');
const dynamo = require('../../lib/dynamo');
const opsworks = require('../../lib/opsworks');
const circle = require('../../lib/circle');
const { setTestConfig } = require('../../lib/get-config');
const Robot = require('../helpers/robot');
const sinon = require('sinon');

describe('diff command', function() {
  let sandbox = sinon.sandbox.create();
  let robot;
  let apps = [
    {
      id: 'api-gateway-app',
      stage: {
        apiGatewayUrl: 'http://foo.com/my-app/stage'
      },
      prod: {
        apiGatewayUrl: 'http://foo.com/my-app/prod'
      }
    },
    {
      id: 'dynamo-app',
      circleUrl: 'PatentNavigation/custom-dynamo-app',
      stage: {
        dynamoKey: '/stage/current'
      },
      prod: {
        dynamoKey: '/prod/current'
      }
    },
    {
      id: 'bad-app',
      stage: {},
      prod: {}
    },
    {
      id: 'opsworks-app',
      stage: {
        opsworksId: '1111'
      },
      prod: {
        opsworksId: '2222'
      }
    }
  ];
  function getApp(name) {
    return apps.find(({ id }) => id === name);
  }

  beforeEach(function() {
    robot = new Robot();
    // This includes all of our types of apps, one app with a custom circle
    // URL, and an app with no known version method.
    setTestConfig({ apps });

    let circleStub = sandbox.stub(circle, 'getLastBuild');
    circleStub.withArgs(getApp('api-gateway-app')).returns(resolve({
      buildNum: "111",
      gitUrl: 'https://github.com/PatentNavigation/api-gateway-app',
      revision: '111111111111111'
    }));
    circleStub.withArgs(getApp('dynamo-app')).returns(resolve({
      buildNum: "222",
      gitUrl: 'https://github.com/PatentNavigation/dynamo-app',
      revision: '222222222222222'
    }));
    circleStub.withArgs(getApp('bad-app')).returns(resolve({
      buildNum: "333",
      gitUrl: 'https://github.com/PatentNavigation/bad-app',
      revision: '333333333333333'
    }));
    circleStub.withArgs(getApp('opsworks-app')).returns(resolve({
      buildNum: "444",
      gitUrl: 'https://github.com/PatentNavigation/opsworks-app',
      revision: '444444444444444'
    }));
  });

  afterEach(function() {
    setTestConfig(null);
    sandbox.restore();
  });

  describe('prod stage', function() {
    it('works', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("105"));
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'prod').returns(resolve("101"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("205"));
      dynamoStub.withArgs(getApp('dynamo-app'), 'prod').returns(resolve("201"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("405"));
      opsworksStub.withArgs(getApp('opsworks-app'), 'prod').returns(resolve("401"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff prod stage").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://github.com/PatentNavigation/api-gateway-app/compare/101101101101101...105105105105105|101101101...105105105>',
                      '<https://github.com/PatentNavigation/dynamo-app/compare/201201201201201...205205205205205|201201201...205205205>',
                      'Unable to determine app method',
                      '<https://github.com/PatentNavigation/opsworks-app/compare/401401401401401...405405405405405|401401401...405405405>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('works with DEV_VERSIONs', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("DEV_VERSION"));
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'prod').returns(resolve("101"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("205"));
      dynamoStub.withArgs(getApp('dynamo-app'), 'prod').returns(resolve("DEV_VERSION"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("DEV_VERSION"));
      opsworksStub.withArgs(getApp('opsworks-app'), 'prod').returns(resolve("DEV_VERSION"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        if (buildNum === "DEV_VERSION") {
          throw new Error("Trying to get revision for DEV_VERSION!");
        }

        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff prod stage").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|101101101...DEV_VERSION>',
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|DEV_VERSION...205205205>',
                      'Unable to determine app method',
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|DEV_VERSION...DEV_VERSION>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('works with same commits', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("101"));
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'prod').returns(resolve("101"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("201"));
      dynamoStub.withArgs(getApp('dynamo-app'), 'prod').returns(resolve("201"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("401"));
      opsworksStub.withArgs(getApp('opsworks-app'), 'prod').returns(resolve("401"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff prod stage").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://github.com/PatentNavigation/api-gateway-app/commit/101101101101101|(same commit)>',
                      '<https://github.com/PatentNavigation/dynamo-app/commit/201201201201201|(same commit)>',
                      'Unable to determine app method',
                      '<https://github.com/PatentNavigation/opsworks-app/commit/401401401401401|(same commit)>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });
  });

  describe('stage latest', function() {
    it('works', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("105"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("205"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("405"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff stage latest").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://github.com/PatentNavigation/api-gateway-app/compare/105105105105105...111111111111111|105105105...111111111>',
                      '<https://github.com/PatentNavigation/dynamo-app/compare/205205205205205...222222222222222|205205205...222222222>',
                      'Unable to determine app method',
                      '<https://github.com/PatentNavigation/opsworks-app/compare/405405405405405...444444444444444|405405405...444444444>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('works with DEV_VERSIONs', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("DEV_VERSION"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("DEV_VERSION"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("DEV_VERSION"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        if (buildNum === "DEV_VERSION") {
          throw new Error("Trying to get revision for DEV_VERSION!");
        }

        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff stage latest").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|DEV_VERSION...111111111>',
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|DEV_VERSION...222222222>',
                      'Unable to determine app method',
                      '<https://www.youtube.com/watch?v=OHVjs4aobqs|DEV_VERSION...444444444>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('works with same commits', function() {
      let apiGatewayStub = sandbox.stub(apiGateway, 'fetchBuildVersion');
      apiGatewayStub.withArgs(getApp('api-gateway-app'), 'stage').returns(resolve("111"));

      let dynamoStub = sandbox.stub(dynamo, 'fetchBuildVersion');
      dynamoStub.withArgs(getApp('dynamo-app'), 'stage').returns(resolve("222"));

      let opsworksStub = sandbox.stub(opsworks, 'fetchBuildVersion');
      opsworksStub.withArgs(getApp('opsworks-app'), 'stage').returns(resolve("444"));

      sandbox.stub(circle, 'getRevisionForBuild', (app, buildNum) => {
        let rev = '';
        [ 1, 2, 3, 4, 5 ].forEach(() => rev += buildNum);
        return rev;
      });

      diffHandler(robot);
      return robot.execFn("diff stage latest").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Compare on Github",
                color: 'good',
                fields: [
                  {
                    title: "App",
                    value: [
                      "api-gateway-app",
                      "dynamo-app",
                      "bad-app",
                      "opsworks-app"
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "Github",
                    value: [
                      '<https://github.com/PatentNavigation/api-gateway-app/commit/111111111111111|(same commit)>',
                      '<https://github.com/PatentNavigation/dynamo-app/commit/222222222222222|(same commit)>',
                      'Unable to determine app method',
                      '<https://github.com/PatentNavigation/opsworks-app/commit/444444444444444|(same commit)>'
                    ].join('\n'),
                    short: true
                  }
                ]
              }
            ]
          }
        ]);
      });
    });
  });
});
