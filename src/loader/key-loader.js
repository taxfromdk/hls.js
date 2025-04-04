/*
 * Decrypt key Loader
*/

import Event from '../events';
import EventHandler from '../event-handler';
import { ErrorTypes, ErrorDetails } from '../errors';
import { logger } from '../utils/logger';

class KeyLoader extends EventHandler {
  constructor (hls) {
    super(hls, Event.KEY_LOADING);
    this.loaders = {};
    this.decryptkey = null;
    this.decrypturl = null;
    this.otherCallbacks = null;
  }

  addCallbacks (callbacks) {
    if (!this.otherCallbacks) {
      this.otherCallbacks = [];
    }
    this.otherCallbacks.push(callbacks);
  }

  destroy () {
    for (let loaderName in this.loaders) {
      let loader = this.loaders[loaderName];
      if (loader) {
        loader.destroy();
      }
    }
    this.loaders = {};
    EventHandler.prototype.destroy.call(this);
  }

  onKeyLoading (data) {
    let frag = data.frag,
      type = frag.type,
      loader = this.loaders[type],
      decryptdata = frag.decryptdata,
      uri = decryptdata.uri;
    // if uri is different from previous one or if decrypt key not retrieved yet
    if (uri !== this.decrypturl || this.decryptkey === null) {
      let config = this.hls.config;

      if (loader) {
        logger.warn(`abort previous key loader for type:${type}`);
        loader.abort();
      }
      frag.loader = this.loaders[type] = new config.loader(config);
      this.decrypturl = uri;
      this.decryptkey = null;

      let loaderContext, loaderConfig, loaderCallbacks;
      loaderContext = { url: uri, frag: frag, responseType: 'arraybuffer' };
      // maxRetry is 0 so that instead of retrying the same key on the same variant multiple times,
      // key-loader will trigger an error and rely on stream-controller to handle retry logic.
      // this will also align retry logic with fragment-loader
      loaderConfig = { timeout: config.fragLoadingTimeOut, maxRetry: 0, retryDelay: config.fragLoadingRetryDelay, maxRetryDelay: config.fragLoadingMaxRetryTimeout };
      loaderCallbacks = { onSuccess: this.loadsuccess.bind(this), onError: this.loaderror.bind(this), onTimeout: this.loadtimeout.bind(this) };
      frag.loader.load(loaderContext, loaderConfig, loaderCallbacks);
    } else if (this.decryptkey) {
      // we already loaded this key, return it
      decryptdata.key = this.decryptkey;
      this.hls.trigger(Event.KEY_LOADED, { frag: frag });
    }
  }

  loadsuccess (response, stats, context) {
    if (this.otherCallbacks) {
      this.otherCallbacks.forEach(elem => {
        elem.loadsuccess(response, stats, context);
      });
    }
    let frag = context.frag;
    this.decryptkey = frag.decryptdata.key = new Uint8Array(response.data);
    // detach fragment loader on load success
    frag.loader = undefined;
    this.loaders[frag.type] = undefined;
    this.hls.trigger(Event.KEY_LOADED, { frag: frag });
  }

  loaderror (response, context) {
    if (this.otherCallbacks) {
      this.otherCallbacks.forEach(elem => {
        elem.loaderror(response, context);
      });
    }
    let frag = context.frag,
      loader = frag.loader;
    if (loader) {
      loader.abort();
    }

    this.loaders[context.type] = undefined;
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.KEY_LOAD_ERROR, fatal: false, frag: frag, response: response });
  }

  loadtimeout (stats, context) {
    if (this.otherCallbacks) {
      this.otherCallbacks.forEach(elem => {
        elem.loadtimeout(stats, context);
      });
    }
    let frag = context.frag,
      loader = frag.loader;
    if (loader) {
      loader.abort();
    }

    this.loaders[context.type] = undefined;
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.KEY_LOAD_TIMEOUT, fatal: false, frag: frag });
  }
}

export default KeyLoader;
