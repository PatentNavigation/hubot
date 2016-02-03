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

  @fetchBuildVersion = (app) ->
    Dynamo.get_dynamo_html(app.dynamo_key)
      .then (html) ->

        def = Q.defer()
        jsdom.env(html, [jquery], (err, window) ->
          if err
            def.reject err
          else
            $ = jquery(window)
            metas = $('meta')
            # Filter and get the only meta tag we care about
            content = meta.content for meta in metas when meta.name is app.meta_name
            json = JSON.parse(decodeURIComponent(content))
            app.build = json.APP.version.split('-')[0]
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
