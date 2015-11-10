# Description:
#   A hubot plugin to generate github compare links for the revisions deployed
#   to various environments

# Required 3rd party NPM libs
Q = require('q')
request = require('request')
OpsWorks = require('../lib/opsworks')
Circle = require('../lib/circle')
S3Build = require('../lib/s3build')

# Local config file required for information about opsworks apps
opsworks_apps = require(process.env.APPS_CONFIG_FILE)

module.exports = (robot) ->
  robot.respond /diff (.*)/, (res) ->
    environs = res.match[1].split(' ')
    for env in environs
      if env not in Object.keys(opsworks_apps)
        res.send "I don't know about an environment named: " + env
        return # break out if we don't know about the environment

    first =
      id: environs[0]
      apps: opsworks_apps[environs[0]]
    second =
      id: environs[1]
      apps: opsworks_apps[environs[1]]

    do_all_the_envs(first, second, res)

  do_all_the_envs = (first, second, res) ->
    Q.all( [fetchEnvAppBuilds(first.id, first.apps), fetchEnvAppBuilds(second.id, second.apps)])
      .spread (first, second) ->
        Q.all( [Circle.getAllRevisionsForBuilds(first), Circle.getAllRevisionsForBuilds(second)])
          .spread (first, second) ->
            comparisons = buildCompareLinks first, second
            message = formatSlackResponse comparisons, "Compare on Github."
            message.channel = res.message.room
            robot.emit 'slack-attachment', message
          .catch (err) ->
            console.log err
            res.send "Oh noes! Something went wrong and I need a human to investigate."
      .catch (err) ->
        console.log err
        res.send "Oh noes! Something went wrong and I need a human to investigate."

  fetchEnvAppBuilds = (env, env_data) ->
    Q.all(
      for app, data of env_data
        if 'opsworks_id' in Object.keys data
          OpsWorks.fetchBuildVersion(data)
        else
          S3Build.fetchBuildVersion(env)
    )

  buildCompareLinks = (first, second) ->
    all_links = []
    # This is stupidly inefficient
    for app1 in first
      for app2 in second
        if app2.id == app1.id
          comparison =
            id: app1.id
            compare_link: "https://github.com/" + app1.project + "compare/" + app2.revision + "..." + app1.revision + "/"
            link_text: app2.revision.substring(0, 9) + "..." + app1.revision.substring(0, 9)
          all_links.push comparison
    all_links

  formatSlackResponse = (data, pretext) ->
    attachment =
      pretext: pretext
      color: "good"

    fields = []
    apps =
      title: "App"
      value: ''
      short: true
      mrkdwn: false
    diffs =
      title: "Github"
      value: ''
      short: true
      mrkdwn: false
    for app in data
      apps.value += app.id + "\n"
      diffs.value += "<" + app.compare_link + "|" + app.link_text + ">\n"

    fields.push apps
    fields.push diffs
    attachment.fields = fields
    response =
      attachments: attachment

    response
