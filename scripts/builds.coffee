# Description:
#   A hubot plugin to figure out what builds are deployed for our various
#   projects and what builds are available on circle.

# Required 3rd party NPM libs
Q = require('q')
request = require('request')

# Local config file required for information about opsworks apps
opsworks_apps = require(process.env.APPS_CONFIG_FILE)

# The supporting classes that provided limited queries that allow hubot
# to respond
OpsWorks = require('../lib/opsworks')
Circle = require('../lib/circle')
Dynamo = require('../lib/dynamo')

module.exports = (robot) ->
  robot.respond /available app*/, (res) ->
    res.send "I know about the following apps in circle:"
    for app in Circle.availableApps()
      res.send "\t- " + app

  robot.respond /available env*/, (res) ->
    res.send "I know about the following environments & apps:"
    for env in Object.keys opsworks_apps
      res.send "\t- " + env
      for app in Object.keys(opsworks_apps[env])
        res.send "\t\t - " + app

  robot.respond /deployed in (.*)/, (res) ->
    env = escape(res.match[1])

    if env == 'all'
      for key, env_data of opsworks_apps
        fetchEnvAppBuilds key, env_data, res
    else if env not in Object.keys(opsworks_apps)
      res.send "I don't know about an environment named: " + env
    else
      for key, env_data of opsworks_apps when key in [env]
        fetchEnvAppBuilds env, env_data, res

  fetchEnvAppBuilds = (env, env_data, res) ->
    Q.all(
      for app, data of env_data
        if 'opsworks_id' in Object.keys data
          OpsWorks.fetchBuildVersion(data)
        else
          Dynamo.fetchBuildVersion(data)
    )
      .done (values) ->
        message = formatSlackResponse values, ("Builds for apps in " + env)
        message.channel = res.message.room
        robot.emit 'slack-attachment', message

  robot.respond /builds for (.*)/, (res) ->
    app = escape(res.match[1])
    apps = Circle.availableApps()

    if app == "all"
      Q.all(
        for thing in apps
          Circle.getLastBuild(thing)
      )
        .catch (err) ->
          res.send "Something funky happened while trying to talk to circle. I need a human to investigate."
        .done (values) ->
          message = formatSlackResponse values, "Most recent successful master builds."
          message.channel = res.message.room
          robot.emit 'slack-attachment', message

    else if app in apps
      Circle.getLastBuild(app)
        .then (response) ->
          message = formatSlackResponse [response], "Most recent master builds."
          message.channel = res.message.room
          robot.emit 'slack-attachment', message
        .catch (err) ->
          console.log err
          res.send "Something funky happened while trying to talk to circle. I need a human to investigate."
    else
      res.send "I don't know anything about an app named " + app

  # The format for what an attachment looks like is documented here:
  # https://api.slack.com/docs/attachments
  formatSlackResponse = (data, pretext) ->
    attachment =
      pretext: pretext
      color: "good"

    fields = []
    apps =
      title: "App"
      value: ''
      short: true
    builds =
      title: "Build"
      value: ''
      short: true
    for build in data
      apps.value += build.id + "\n"
      builds.value += "<" + build.project_url + build.build + "|Circle Build " + build.build + ">\n"

    fields.push apps
    fields.push builds
    attachment.fields = fields
    response =
      attachments: attachment

    response

