class TagManager {
  constructor() {
    this.endpoint = false;
  }

  /* eslint-disable class-methods-use-this */
  setEndpoint() {
    throw Error('abstract method must be extended');
  }

  static async initialize() {
    if (!this.endpoint) return;
    throw Error('abstract method must be extended');
  }
}

export default TagManager;
