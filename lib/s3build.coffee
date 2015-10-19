Q = require('q')
jsdom = require('jsdom')
jquery = require('jquery')

class S3Build

  @config = require(process.env.APPS_CONFIG_FILE)

  @fetchBuildVersion = (env) ->
    url = @config[env]['farnsworth-web'].url

    # We need to set the meta_name & project_url here because the
    # @config namespace is out of scope when passed into the jsdom
    # callback. At least, that's what seems to be functionally happening
    meta_name = @config[env]['farnsworth-web'].meta_name
    project_url = @config[env]['farnsworth-web'].project_url

    def = Q.defer()
    jsdom.env(url, [jquery], (err, window) ->
      def.reject(err) if err
      $ = jquery(window)
      metas = $('meta')
      # Filter and get the only meta tag we care about
      content = meta.content for meta in metas when meta.name is meta_name
      json = JSON.parse(decodeURIComponent(content))

      app =
        id: json.APP.name + "-web"
        build: json.APP.version.split('-')[0]
        project_url: project_url

      def.resolve app
    )
    return def.promise

module.exports = S3Build
