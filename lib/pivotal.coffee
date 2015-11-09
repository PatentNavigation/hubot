Q = require('q')
request = require('request')

token = process.env.PIVOTAL_TOKEN

class Pivotal

  @project_api_url = "https://www.pivotaltracker.com/services/v5/projects/"
  @stories_uri = "/stories"
  # The Pivotal API lets us use their normal search language, but we have to escape it
  @blocker_search_filters = escape("state:unstarted,planned,unscheduled label:deployment-blocker")
  @pivotal_request =
    headers: 'X-TrackerToken': token

  # == Parameters:
  # null
  #
  # == Returns:
  # promise::
  #   A promise representing an array of project ids (strings/integers).
  @get_project_ids = () ->
    def = Q.defer()
    @pivotal_request.url = @project_api_url
    Pivotal.base_get_request(@pivotal_request)
      .then (data) ->
        ids = []
        for project in data
          ids.push project.id
        def.resolve ids
        return def.promise

  # == Parameters:
  # id::
  #   A string or integer representing the project id for which we are fetching
  #   any tickets that are labelled deployed-blockers
  #
  # == Returns:
  # promise::
  #   A promise that returns the promise of the data from the base get request. The
  #   data is the parsed JSON response from pivotal, which is an array of tickets
  #   that are labelled as deployment-blockers.
  @get_blockers_for_project = (id) ->
    def = Q.defer()
    @pivotal_request.url = @project_api_url + id + @stories_uri + '?filter=' + @blocker_search_filters
    def.resolve Pivotal.base_get_request(@pivotal_request)
    return def.promise

  # == Parameters:
  # req::
  #   An object with two attributes:
  #     - headers: a request header hash, primarily with the X-TrackerToken defined
  #     - url: the url for making the request
  #
  # == Returns:
  # promise::
  #   A promise representing the parsed JSON response from pivotaltracker
  #
  # API docs can be found at: https://www.pivotaltracker.com/help/api/rest/v5#top
  @base_get_request = (req) ->
    def = Q.defer()
    request(req, (error, response, body) ->
      if error or response.statusCode != 200
        def.reject(error)
      else
        def.resolve JSON.parse(body)
    )
    return def.promise

  # == Parameters:
  # ids::
  #   An array of strings/integers representing pivotaltracker project ids
  #
  # == Returns:
  # Array::promise
  #   An array of promises from the set of requests sent to pivotaltracker for
  #   the blockers for each project id.
  @get_all_blockers_for_ids = (ids) ->
    Q.all(
      for id in ids
        Pivotal.get_blockers_for_project(id)
    )

  # == Parameters:
  # null
  #
  # == Returns:
  # promise::
  #   A promise representing a flat array of all the deployment-blocker tickets.
  @get_all_blockers = () ->
    def = Q.defer()
    Pivotal.get_project_ids()
      .then (ids) ->
        Pivotal.get_all_blockers_for_ids(ids)
          .then (blockers) ->
            flattened = [].concat.apply([], blockers)
            def.resolve flattened
            return def.promise

module.exports = Pivotal
