Q = require('q')
jsdom = require('jsdom')
jquery = require('jquery')

AWS = require('aws-sdk')
access = process.env.AWS_ACCESS_KEY_ID
secret = process.env.AWS_SECRET_ACCESS_KEY
region = process.env.AWS_REGION
table = process.env.DYNAMO_TABLE
column = process.env.DYNAMO_COLUMN
attrs_to_get = process.env.DYNAMO_ATTRIBUTE_TO_GET

AWS.config.update(accessKeyId: access, secretAccessKey: secret)

class Dynamo

  @api = new AWS.DynamoDB()
  @config = require(process.env.APPS_CONFIG_FILE)
  @params =
    TableName: table
    ProjectionExpression: attrs_to_get

  @fetchBuildVersion = (env) ->
    key = @config[env]['farnsworth-web'].dynamo_key
    # We need to set the meta_name & project_url here because the
    # @config namespace is out of scope in the promise returned by get_dynamo_html.
    # At least, that's what seems to be functionally happening
    meta_name = @config[env]['farnsworth-web'].meta_name
    project_url = @config[env]['farnsworth-web'].project_url

    Dynamo.get_dynamo_html(key)
      .then (html) ->

        def = Q.defer()
        jsdom.env(html, [jquery], (err, window) ->
          if err
            def.reject err
          else
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

  @get_dynamo_html = (key) ->
    def = Q.defer()

    keys = {}
    keys[column] =
      S: key
    @params.Key = keys

    @api.getItem(@params, (err, data) ->
      if err
        def.reject err
      else
        def.resolve data.Item[attrs_to_get].S
    )
    return def.promise

module.exports = Dynamo
