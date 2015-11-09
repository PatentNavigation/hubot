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

  @get_blockers_for_project = (id) ->
    def = Q.defer()
    @pivotal_request.url = @project_api_url + id + @stories_uri + '?filter=' + @blocker_search_filters
    def.resolve Pivotal.base_get_request(@pivotal_request)
    return def.promise

  @base_get_request = (req) ->
    def = Q.defer()
    request(req, (error, response, body) ->
      if error or response.statusCode != 200
        def.reject(error)
      else
        def.resolve JSON.parse(body)
    )
    return def.promise

  @get_all_blockers_for_ids = (ids) ->
    Q.all(
      for id in ids
        Pivotal.get_blockers_for_project(id)
    )

  @get_all_blockers = () ->
    def = Q.defer()
    Pivotal.get_project_ids()
      .then (ids) ->
        blockers = Pivotal.get_all_blockers_for_ids(ids)
        flattened = [].concat.apply([], blockers)
        def.resolve flattened
        return def.promise

module.exports = Pivotal
