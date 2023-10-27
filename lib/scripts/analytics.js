import { getMetadata } from './lib-franklin.js';

class Analytics {
  constructor(manager) {
    this.manager = manager;
    this.globals = {};
    this.data = {};
  }

  async loadGlobalAnalytics(url = '/global/analytics.json') {
    const resp = await fetch(url);
    const json = await resp.json();
    this.globals = json.data.map((row) => row.Key);
    const dataArray = json.data
      .filter((row) => row.Value !== '')
      .map((row) => [row.Key, row.Value]);
    this.setData(Object.fromEntries(dataArray));
  }

  /* eslint-disable class-methods-use-this */
  getPageUrl() {
    const { host, protocol } = document.location;
    let { pathname } = document.location;
    pathname = pathname !== '/' ? pathname : '';
    const urlSegments = [protocol, '//', host, pathname];
    return urlSegments.join('');
  }

  getGlobalOverrides() {
    const data = {};
    this.globals.forEach((key) => {
      const value = getMetadata(key);
      if (value) {
        data[key] = value;
      }
    });
    return data;
  }

  loadPageAnalyticsData() {
    const defaults = {};
    defaults['Page Name'] = document.title;
    defaults['Page URL'] = this.getPageUrl();
    const overrides = this.getGlobalOverrides();
    this.setData({ ...defaults, ...overrides });
  }

  setData(data) {
    this.data = { ...this.data, ...data };
  }

  toCamelCase(text) {
    const words = text.split(/[\s_-]+/);
    for (let i = 1; i < words.length; i += 1) {
      words[i] = words[i][0].toUpperCase() + words[i].substring(1);
    }
    const camelCase = words.join('');
    return camelCase[0].toLowerCase() + camelCase.substring(1);
  }

  formatMetaDataKeys(data) {
    const newData = {};
    Object.keys(data).forEach((key) => {
      newData[this.toCamelCase(key)] = data[key];
    });
    return newData;
  }

  async initialize(defaults, url) {
    this.setData(defaults);
    if (!this.manager.endpoint) return;
    await this.loadGlobalAnalytics(url);
    this.loadPageAnalyticsData();
    window.pfAnalyticsData = window.pfAnalyticsData || {};
    window.pfAnalyticsData.pfPage = window.pfAnalyticsData.pfPage || {};
    Object.assign(
      window.pfAnalyticsData.pfPage,
      this.formatMetaDataKeys(this.data)
    );
  }

  /**
   * Appends data to element as an attribute.
   * Recommended for all clickable all events (e.g. <a>, <button>, etc.).
   * @param {string} event The event type (i.e. pfLinkName, pfFileDownload, etc.)
   * @param {json} data The data to append to analytics data layer
   * @param {element} element The element to append the data layer attribute
   */
  static setDataLayer(event, data, element) {
    if (!element || !event || !data) {
      return; // No Action
    }
    const dataLayer = { pfAnalyticsAttrData: {} };
    dataLayer.pfAnalyticsAttrData[event] = data;
    element.setAttribute('sc-pf-data', JSON.stringify(dataLayer));
  }

  /**
   * Appends data to element as an attribute
   * Recommended for all NON clickable all events (e.g. scroll, custom events, specific conditions, etc.).
   * @param {string} event The data type (i.e. pfLinkName, pfFileDownload, etc.)
   * @param {json} data The data to append to analytics data layer
   */
  static triggerEvent(event, data) {
    if (event === 'pfPage') {
      // Exception for pfPage event for assign on page load
      window.pfAnalyticsData = window.pfAnalyticsData || {};
      window.pfAnalyticsData.pfPage = window.pfAnalyticsData.pfPage || {};
      Object.assign(window.pfAnalyticsData.pfPage, data);
    } else if (window.$pfa_datalayer) {
      // If Pfizer Analytics events handler already setup triggers event
      const dataLayer = { event };
      dataLayer[event] = data;
      const eventObj = new CustomEvent('pfAnalytics', { detail: [dataLayer] });
      document.querySelector('body').dispatchEvent(eventObj);
    } else {
      // If Pfizer Analytics events handler no ready, it add event to queue
      window.$pfa_queue_dl = window.$pfa_queue_dl || [];
      window.$pfa_queue_dl.push([event, data]);
    }
  }
}

export default Analytics;
