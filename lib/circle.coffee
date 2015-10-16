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

  # Returns the most recent successful build from master for the passed in app
  # API docs can be found at: https://circleci.com/docs/api
  @getLastBuild = (app) ->
    request_url = @circle.api_base + @apps[app].project + @circle.branch + "?circle-token=" + @circle.token + @circle.query_params
    @circle_request.url = request_url
    def = Q.defer()
    request(@circle_request, (error, response, body) ->
      if error or response.statusCode != 200
        def.reject(error)
      else
        data = JSON.parse(body)
        # This format makes the response formatted just like that returned from
        # the lib/opsworks.coffee response so that we can reuse a common slack
        # format function in the hubot script that calls both those things.
        response_data =
          id: app
          build: data[0].build_num
          project_url: circle.http_base + apps[app].project
        def.resolve response_data
    )
    return def.promise

  @availableApps = () ->
    Object.keys(@apps)

module.exports = Circle
