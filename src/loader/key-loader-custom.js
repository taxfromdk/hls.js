/*
 * Decrypt key Loader
*/

import Event from '../events';
import EventHandler from '../event-handler';
import { ErrorTypes, ErrorDetails } from '../errors';
import { logger } from '../utils/logger';

class KeyLoaderCustom extends EventHandler {
  constructor (hls, kLoader) {
    super(hls, Event.KEY_LOADING);
    this.decryptkey = null;
    this.decrypturl = null;
    this.kLoader = kLoader;
    this.kLoader.addCallbacks(this);
  }

  destroy () {
    EventHandler.prototype.destroy.call(this);
  }

  onKeyLoading (data) {
  }

  loadsuccess (response, stats, context) {
    let frag = context.frag;
    this.decryptkey = frag.decryptdata.key = new Uint8Array(response.data);
    this.hls.trigger(Event.KEY_LOADED, { frag: frag });
  }

  loaderror (response, context) {
    let frag = context.frag;
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.KEY_LOAD_ERROR, fatal: false, frag: frag, response: response });
  }

  loadtimeout (stats, context) {
    let frag = context.frag;
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.KEY_LOAD_TIMEOUT, fatal: false, frag: frag });
  }
}

export default KeyLoaderCustom;
