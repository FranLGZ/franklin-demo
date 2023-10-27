import { fetchPlaceholders } from './lib-franklin.js';
import TagManager from './tag-manager.js';
import { isNonProduction } from './pfizer-utilities.js';

class AdobeLaunch extends TagManager {
  async setEndpoint(prefix = '') {
    const placeholders = await fetchPlaceholders(prefix);
    if (
      !placeholders.launchProductionUrl &&
      !placeholders.launchNonProductionUrl
    ) {
      throw Error('missing placeholders for analytics endpoint');
    }
    if (isNonProduction(window.location.hostname)) {
      this.endpoint = placeholders.launchNonProductionUrl;
      return;
    }

    this.endpoint = placeholders.launchProductionUrl;
  }

  initialize() {
    if (!this.endpoint) return;
    const launchScript = document.createElement('script');
    launchScript.async = true;
    launchScript.src = this.endpoint;
    document.head.appendChild(launchScript);
  }
}

export default AdobeLaunch;
