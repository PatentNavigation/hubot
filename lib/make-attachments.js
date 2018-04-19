// We batch up our data into multiple attachments to avoid getting truncated
// by Slack's undocumented max length. This determines the batch size, and is
// settable to make unit testing easier.
let batchSize;
function setBatchSize(size = 10) {
  batchSize = size;
}
setBatchSize();

function makeAttachment({ pretext, valueTitle, data, linkFactory }) {
  function makeLink(item) {
    if (item.error) {
      return "ERROR";
    } else {
      return linkFactory(item);
    }
  }

  let attachment = {
    color: 'good',
    fields: [
      {
        title: "App",
        value: data.map(({ app: { id } }) => id).join('\n'),
        short: true
      },
      {
        title: valueTitle,
        value: data.map(makeLink).join('\n'),
        short: true
      },
      ...data.filter(({ error }) => error).map(({ app: { id }, error }) => {
        return {
          title: `${id} error`,
          value: error.stack,
          short: false
        };
      })
    ]
  };
  if (pretext) {
    attachment.pretext = pretext;
  }

  return attachment;
}

function makeAttachments({ pretext, valueTitle, data, linkFactory }) {
  let attachments = [];
  while (data.length > 0) {
    let batch = data.slice(0, batchSize);
    data = data.slice(batchSize);
    let attrs = { valueTitle, data: batch, linkFactory };
    if (attachments.length === 0) {
      attrs.pretext = pretext;
    }

    attachments.push(makeAttachment(attrs));
  }

  return attachments;
}

module.exports = makeAttachments;
makeAttachments.setBatchSize = setBatchSize;
