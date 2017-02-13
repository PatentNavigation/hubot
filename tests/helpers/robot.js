const {
  Promise: {
    resolve
  }
} = require('bluebird');

class Robot {
  constructor() {
    this.handlers = [];
  }

  respond(regex, fn) {
    this.handlers.push({ regex, fn });
  }

  getEntry(message) {
    return this.handlers.find(({ regex }) => regex.exec(message));
  }

  execFn(message) {
    let entry = this.getEntry(message);
    if (!entry) {
      return resolve(null);
    }

    let result = [];
    return resolve(entry.fn({
      match: entry.regex.exec(message),
      send(data) {
        result.push(data);
      }
    })).then(() => result);
  }
}

module.exports = Robot;
