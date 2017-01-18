Q = require('q')
request = require('request')

class ApiGateway
  @fetchBuildVersion = (app) ->
    def = Q.defer()
    request(app.api_gateway_url + '/version', (error, response, body) ->
      if error
        def.reject(error)
      else if response.statusCode != 200
        def.reject("Got failure status code: " + response.statusCode)
      else
        app.build = body
        def.resolve(app)
    )
    return def.promise

module.exports = ApiGateway
