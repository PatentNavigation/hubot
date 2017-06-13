function makeAttachments({ pretext, valueTitle, data, linkFactory }) {
  function makeLink(item) {
    if (item.error) {
      return "ERROR";
    } else {
      return linkFactory(item);
    }
  }

  return [
    {
      pretext,
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
            value: error,
            short: false
          };
        })
      ]
    }
  ];
}

module.exports = makeAttachments;
