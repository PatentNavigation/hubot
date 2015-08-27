# Description:
#   A hubot plugin to occasionally hassle people that there are bugs not being
#   worked on.
#

token = process.env.PIVOTAL_TOKEN
request = require('request')

module.exports = (robot) ->
  # Initialize the setInterval variable
  pivotalInterval = null

  # The Pivotal API lets us use their normal search language, but we have to escape it
  search_filters = escape("state:unstarted,planned,unscheduled label:deployment-blocker")
  base_url = "https://www.pivotaltracker.com/services/v5/projects/845405/stories"
  request_url = base_url + '?filter=' + search_filters

  # When we run the interval reporting, we need to create the interval
  time_interval = 1000 * 10 # this will run every 30 minutes

  # Set the options object for the request
  options =
    url: request_url
    headers: 'X-TrackerToken': token

  # Define the slack attachment formatting function for when we attach the tickets
  # for which we need to raise awareness.
  formatSlackResponse = (data) ->
    attachments = []
    for ticket in data
      # The format for what an attachment looks like is documented here:
      # https://api.slack.com/docs/attachments
      attachment = 
        fallback: ticket.name
        title: ticket.name
        title_link: ticket.url
        text: ticket.description
        color: "#fe0001"
      attachments.push attachment
    response =
      attachments: attachments
    
    response


  doPivotal = (res) ->
    # define the callback for the request
    pivotal = (error, response, body) ->
      if !error and response.statusCode == 200
        data = JSON.parse(body)
        if data.length >= 1
          # In this case, there was a successful request to pivotal, and we have
          # at least one ticket that we need to format. Because we are sending
          # the tickets using the slack-attachment event, we need to set up some
          # stuff that wouldn't normally be set. See the slack adapter for what
          # sort of quacking we need to make happen.
          # https://github.com/slackhq/hubot-slack/blob/af37d933671423e5c00966395c9852ee7123bab7/src/slack.coffee#L254-L281
          message = formatSlackResponse data
          message.channel = res.message.room
          res.send "The following deployment blockers exist, but haven't been started."
          robot.emit 'slack-attachment', message
        else
          res.send "All deployment blockers are in progress, yay!"
      else
        res.send "Hmmm, something's not right with how I'm talking to PivotalTracker, a human should investigate." 
    
    # Now actually do the request to pivotal
    request options, pivotal

  robot.respond /start pivotal/, (res) ->
    res.send "Ok, I'll start posting critical bugs to the room"
    
    # If we're already started, then just do the thing and get out.
    if pivotalInterval
      doPivotal res
      return

    # Do the thing for this particular event
    doPivotal res

    # Now turn on the interval pestering
    pivotalInterval = setInterval () ->
      doPivotal res
    , time_interval

  robot.respond /stop pivotal/, (res) ->
    if pivotalInterval
      res.send "Ok, I'll stop pestering you about critical bugs in this room."
      clearInterval(pivotalInterval)
      pivotalInterval = null
    else
      res.send "Hey now, I *wasn't* pestering you about that, so what's your problem?"

  robot.respond /pivotal/, (res) ->
    doPivotal res

