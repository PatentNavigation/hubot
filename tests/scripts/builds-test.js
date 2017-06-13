const {
  Promise: {
    reject,
    resolve
  }
} = require('bluebird');
const { assert } = require('chai');
const buildsHandler = require('../../scripts/builds');
const apiGateway = require('../../lib/api-gateway');
const dynamo = require('../../lib/dynamo');
const opsworks = require('../../lib/opsworks');
const circle = require('../../lib/circle');
const { setTestConfig } = require('../../lib/get-config');
const Robot = require('../helpers/robot');
const sinon = require('sinon');

describe('builds command', function() {
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
    // URL, and an app with no know version method.
    setTestConfig({ apps });
  });

  afterEach(function() {
    setTestConfig(null);
    sandbox.restore();
  });

  describe('deployed in *', function() {
    it('works', function() {
      sandbox.stub(apiGateway, 'fetchBuildVersion', () => resolve("DEV_VERSION"));
      sandbox.stub(dynamo, 'fetchBuildVersion', () => resolve("222"));
      sandbox.stub(opsworks, 'fetchBuildVersion', () => resolve("333"));

      buildsHandler(robot);
      return robot.execFn("deployed in stage").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Builds for apps in stage",
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
                    title: "Build",
                    value: [
                      '<https://www.youtube.com/watch?v=ih2xubMaZWI|Circle Build DEV_VERSION>',
                      '<https://circleci.com/gh/PatentNavigation/custom-dynamo-app/222|Circle Build 222>',
                      'ERROR',
                      '<https://circleci.com/gh/PatentNavigation/opsworks-app/333|Circle Build 333>'
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "bad-app error",
                    value: 'Unable to determine app method',
                    short: false
                  }
                ]
              }
            ]
          }
        ]);
      });
    });

    it('handles errors', function() {
      sandbox.stub(apiGateway, 'fetchBuildVersion', () => resolve("111"));
      sandbox.stub(dynamo, 'fetchBuildVersion', () => reject(new Error("Something went wrong!")));
      sandbox.stub(opsworks, 'fetchBuildVersion', () => resolve("333"));

      buildsHandler(robot);
      return robot.execFn("deployed in stage").then((results) => {
        assert.deepEqual(results, [
          {
            attachments: [
              {
                pretext: "Builds for apps in stage",
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
                    title: "Build",
                    value: [
                      '<https://circleci.com/gh/PatentNavigation/api-gateway-app/111|Circle Build 111>',
                      'ERROR',
                      'ERROR',
                      '<https://circleci.com/gh/PatentNavigation/opsworks-app/333|Circle Build 333>'
                    ].join('\n'),
                    short: true
                  },
                  {
                    title: "dynamo-app error",
                    value: 'Error: Something went wrong!',
                    short: false
                  },
                  {
                    title: "bad-app error",
                    value: 'Unable to determine app method',
                    short: false
                  }
                ]
              }
            ]
          }
        ]);
      });
    });
  });

  describe('builds for', function() {
    describe('all', function() {
      it('works', function() {
        let stub = sandbox.stub(circle, 'getLastBuild');
        stub.withArgs(getApp('api-gateway-app')).returns(resolve({ buildNum: 'DEV_VERSION', revision: 'abcdef123456789' }));
        stub.withArgs(getApp('dynamo-app')).returns(resolve({ buildNum: '222', revision: 'abcdef123456789' }));
        stub.withArgs(getApp('bad-app')).returns(resolve({ buildNum: '333', revision: 'abcdef123456789' }));
        stub.withArgs(getApp('opsworks-app')).returns(resolve({ buildNum: '444', revision: 'abcdef123456789' }));

        buildsHandler(robot);
        return robot.execFn("builds for all").then((results) => {
          assert.deepEqual(results, [
            {
              attachments: [
                {
                  pretext: "Most recent successful master builds",
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
                      title: "Build",
                      value: [
                        '<https://www.youtube.com/watch?v=ih2xubMaZWI|Circle Build DEV_VERSION>',
                        '<https://circleci.com/gh/PatentNavigation/custom-dynamo-app/222|Circle Build 222>',
                        '<https://circleci.com/gh/PatentNavigation/bad-app/333|Circle Build 333>',
                        '<https://circleci.com/gh/PatentNavigation/opsworks-app/444|Circle Build 444>'
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

      it('handles errors', function() {
        let stub = sandbox.stub(circle, 'getLastBuild');
        stub.withArgs(getApp('api-gateway-app')).returns(resolve({ buildNum: 'DEV_VERSION', revision: 'abcdef123456789' }));
        stub.withArgs(getApp('dynamo-app')).returns(resolve({ buildNum: '222', revision: 'abcdef123456789' }));
        stub.withArgs(getApp('bad-app')).returns(reject(new Error("Something went wrong!")));
        stub.withArgs(getApp('opsworks-app')).returns(resolve({ buildNum: '444', revision: 'abcdef123456789' }));

        buildsHandler(robot);
        return robot.execFn("builds for all").then((results) => {
          assert.deepEqual(results, [
            {
              attachments: [
                {
                  pretext: "Most recent successful master builds",
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
                      title: "Build",
                      value: [
                        '<https://www.youtube.com/watch?v=ih2xubMaZWI|Circle Build DEV_VERSION>',
                        '<https://circleci.com/gh/PatentNavigation/custom-dynamo-app/222|Circle Build 222>',
                        'ERROR',
                        '<https://circleci.com/gh/PatentNavigation/opsworks-app/444|Circle Build 444>'
                      ].join('\n'),
                      short: true
                    },
                    {
                      title: "bad-app error",
                      value: 'Error: Something went wrong!',
                      short: false
                    }
                  ]
                }
              ]
            }
          ]);
        });
      });
    });

    describe('specific app', function() {
      it('works', function() {
        let stub = sandbox.stub(circle, 'getLastBuild');
        stub.withArgs(getApp('api-gateway-app')).returns(resolve({ buildNum: '222', revision: 'abcdef123456789' }));

        buildsHandler(robot);
        return robot.execFn("builds for api-gateway-app").then((results) => {
          assert.deepEqual(results, [
            {
              attachments: [
                {
                  pretext: "Most recent successful master builds",
                  color: 'good',
                  fields: [
                    {
                      title: "App",
                      value: [
                        "api-gateway-app"
                      ].join('\n'),
                      short: true
                    },
                    {
                      title: "Build",
                      value: [
                        '<https://circleci.com/gh/PatentNavigation/api-gateway-app/222|Circle Build 222>'
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

      it('handles errors', function() {
        let stub = sandbox.stub(circle, 'getLastBuild');
        stub.withArgs(getApp('api-gateway-app')).returns(reject(new Error("Something went wrong!")));

        buildsHandler(robot);
        return robot.execFn("builds for api-gateway-app").then((results) => {
          assert.deepEqual(results, [
            {
              attachments: [
                {
                  pretext: "Most recent successful master builds",
                  color: 'good',
                  fields: [
                    {
                      title: "App",
                      value: [
                        "api-gateway-app"
                      ].join('\n'),
                      short: true
                    },
                    {
                      title: "Build",
                      value: [
                        'ERROR'
                      ].join('\n'),
                      short: true
                    },
                    {
                      title: "api-gateway-app error",
                      value: 'Error: Something went wrong!',
                      short: false
                    }
                  ]
                }
              ]
            }
          ]);
        });
      });

      it('handles unknown apps', function() {
        let stub = sandbox.stub(circle, 'getLastBuild');
        stub.withArgs(getApp('api-gateway-app'));

        buildsHandler(robot);
        return robot.execFn("builds for fooblyfoo").then((results) => {
          assert.deepEqual(results, [ "I don't know about an app named fooblyfoo" ]);
        });
      });
    });
  });
});
