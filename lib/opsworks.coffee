# Wrapper around the AWS OpsWorks sdk, built around our specific
# requirements

AWS = require('aws-sdk')
Q = require('q')

region = process.env.AWS_REGION

class OpsWorks
  # You have to initialize with the region here, not in the update config
  # setup, otherwise, it won't work.
  @api = new AWS.OpsWorks(region: region)

  @fetchBuildVersion = (app) ->
    OpsWorks.fetchBuild(app.opsworks_id)
      .then (build) ->
        app.build = build
        return app

  @fetchBuild = (appId) ->
    def = Q.defer()
    params =
      AppIds: [ appId ]
    OpsWorks.api.describeApps(params, (err, data) ->
      if (err)
        def.reject(err)
      else
        def.resolve data.Apps[0].Attributes.DocumentRoot
    )
    return def.promise

  # Not currently used, but figured what the hell. If we switch to just getting
  # apps from the stacks iteratively, or we want to start grabbing more AWS
  # data from hubot, this'll be handy.
  @fetchStacks = () ->
    def = Q.defer()
    if OpsWorks.stacks
      def.resolve OpsWorks.stacks
    else
      OpsWorks.api.describeStacks({}, (err, data) ->
        if (err)
          def.reject(err)
        else
          OpsWorks.stacks = data['Stacks']
          def.resolve OpsWorks.stacks
      )
    return def.promise

module.exports = OpsWorks
