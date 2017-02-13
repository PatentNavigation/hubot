function getConfig() {
  if (process.env.HUBOT_CONFIG_FILE) {
    return require(process.env.HUBOT_CONFIG_FILE);
  }

  return testConfig || {};
}

// Allow test instrumentation
let testConfig;
getConfig.setTestConfig = function setTestConfig(config) {
  return testConfig = config;
};

module.exports = getConfig;
