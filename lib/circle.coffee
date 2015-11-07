Q = require('q')
request = require('request')

circle_config = require(process.env.CIRCLE_CONFIG_FILE)
apps = circle_config.apps
circle = circle_config.circle

class Circle

  @apps = circle_config.apps
  @circle = circle_config.circle
  @circle_request =
    headers: 'Accept': 'application/json'

  # == Parameters:
  # name::
  #   A string representing the name of the app to look up
  #
  # == Returns:
  # promise::
  #   A promise representing the response object build in the function
  #
  # API docs can be found at: https://circleci.com/docs/api
  @getLastBuild = (name) ->
    # This api request returns an array with one entry
    app =
      id: name
      request_url: @circle.api_base + @apps[name].project + @circle.branch + "?circle-token=" + @circle.token + @circle.query_params
      project: @apps[name].project
    def = Q.defer()
    Circle.api_get_request(app)
      .then (data) ->
        app.build = data[0].build_num
        app.project_url = circle.http_base + app.project
        app.revision = data[0].vcs_revision
        def.resolve app
        return def.promise

  # == Parameters:
  # apps::
  #   An array of objects representing various apps and a specific circleci build
  #   for which we want to get the VCS (git) revision
  #
  # == Returns:
  # promises::
  #   An array of promises representing the response app objects that have app
  #   state and revision hashes
  @getAllRevisionsForBuilds = (apps) ->
    Q.all(
      for app in apps
        Circle.get_revision_for_build(app)
    )

  # == Parameters:
  # app::
  #   An object representing an app with a specific circleci build for which we
  #   want to get the VCS (git) revision
  #
  # == Returns:
  # promise::
  #   A promise representing the response app object that has app state and a
  #   revision hash
  @get_revision_for_build = (app) ->
    # This api request returns a hash, not an array
    def = Q.defer()
    app.project = @apps[app.id].project
    app.request_url = @circle.api_base + @apps[app.id].project + app.build + "?circle-token=" + @circle.token
    Circle.api_get_request(app)
      .done (data) ->
        app.revision = data.vcs_revision
        def.resolve app
    return def.promise

  # == Parameters:
  # app::
  #   An object representing an app. It is required for this object to have the
  #   request_url attribute defined, as it's used for making the request to the
  #   circleci api.
  #
  # == Returns:
  # promise::
  #   A promise representing the parsed json response from the circleci api
  @api_get_request = (app) ->
    @circle_request.url = app.request_url
    def = Q.defer()
    request(@circle_request, (error, response, body) ->
      if error or response.statusCode != 200
        def.reject(error)
      else
        def.resolve JSON.parse(body)
    )
    return def.promise

  @availableApps = () ->
    Object.keys(@apps)

module.exports = Circle
