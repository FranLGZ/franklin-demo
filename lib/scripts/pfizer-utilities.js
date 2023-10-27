import { getConfig } from './lib_config.js';
/**
 * Detection of sidekick scenarios to adjust in library loading.
 * This is needed as a simple boolean for now due to window load order.
 */
export const isSidekickBlockPlugin = () =>
  Boolean(
    window?.platform_block_sidekick === true ||
      window?.parent?.platform_block_sidekick === true
  );

/**
 * Gets the value of a cookie
 */
function getCookie(name) {
  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.trim().startsWith(`${name}=`))
    ?.split('=')[1];
  return cookieValue && decodeURIComponent(cookieValue);
}

/**
 Sets up smartCapture tags if a SmartCapture=true cookie is set
 */
// eslint-disable-next-line import/prefer-default-export
export async function smartCaptureTags(arrayOfqueryConfigs, block = undefined) {
  await new Promise((res) => {
    setTimeout(res, 1000);
  });

  if (getCookie('smartcapture') !== 'true' || !block) {
    return;
  }

  arrayOfqueryConfigs.forEach((queryConfig) => {
    const { selector, smName, event } = queryConfig;
    if (!selector || !smName) {
      console.error(
        'Incomplete smartcapture configuration, selector and smName properties are required.'
      );
      return;
    }

    let selectedElements;
    try {
      selectedElements = block.querySelectorAll(`${String(selector)}`);
    } catch (ex) {
      console.error('Failed to select smartCapture elements');
      return;
    }

    if (selectedElements.length > 0) {
      block.querySelectorAll(`${String(selector)}`).forEach((el) => {
        if (smName) el.setAttribute('data-smartcapture', smName);
        if (event) el.setAttribute('data-smartcapture-event', event);
      });
    } else {
      console.error('Missing smartCapture element for selector');
    }
  });
}

/**
 * Returns true if the hostname is considered as preview.
 * Supports both hlx domains and Pfizer domains.
 * @param hostname {string} hostname
 * @returns {boolean|*}
 */
export function isPreview(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.hlx.page') ||
    hostname.endsWith('-page.web.pfizer')
  );
}

/**
 * Returns true if the hostname is considered as non-production, including preview and review.
 * Supports both hlx domains and Pfizer domains.
 * @param hostname {string} hostname
 * @returns {boolean|*}
 */
export function isNonProduction(hostname) {
  return (
    isPreview(hostname) ||
    hostname.endsWith('.hlx.reviews') ||
    hostname.endsWith('.hlx.live') ||
    hostname.endsWith('.web.pfizer') ||
    hostname.endsWith('.franklin.edison.pfizer')
  );
}

export async function importSideKick() {
  const cmspath = window.hlx.cmsBasePath || getConfig('cmspath', '/cms');
  await import(`${cmspath}/tools/sidekick/sidekick.js`);
}

export async function loadSideKickExtras(hostname, callback) {
  try {
    const nonProdEnvs = getConfig('nonprod_envs', []);
    if (nonProdEnvs.some((env) => hostname.endsWith(env))) {
      // Load reviews logic
      if (isNonProduction(hostname)) {
        await callback();
      }
    }
  } catch (error) {
    console.error(error);
  }
}

// eslint-disable-next-line no-unused-vars
export function setWindowProps(options = {}) {
  const {
    codeBasePath = getConfig('codeBasePath', ''),
    libraryBasePath = getConfig('libraryBasePath', '/lib'),
    cmsBasePath = getConfig('cmsBasePath', '/cms'),
  } = options;

  window.hlx = window.hlx || {};
  window.hlx.patchBlockConfig = [];
  window.hlx.codeBasePath = codeBasePath;
  window.hlx.libraryBasePath = libraryBasePath;
  window.hlx.lighthouse =
    new URLSearchParams(window.location.search).get('lighthouse') ===
    getConfig('lighthouse', true);
  window.hlx.cmsBasePath = cmsBasePath;
}
