/*
 * Fragment Loader
*/

import Event from '../events';
import EventHandler from '../event-handler';
import { ErrorTypes, ErrorDetails } from '../errors';
import { logger } from '../utils/logger';

class FragmentLoaderCustom extends EventHandler {
  constructor (hls, fLoader) {
    super(hls, Event.FRAG_LOADING);
    this.fLoader = fLoader;
    this.fLoader.addCallbacks(this);
  }

  destroy () {
    super.destroy();
  }

  onFragLoading (data) {
  }

  loadsuccess (response, stats, context, networkDetails = null) {
    let payload = response.data;
    let frag = context.frag;
    this.hls.trigger(Event.FRAG_LOADED, { payload: payload, frag: frag, stats: stats, networkDetails: networkDetails });
  }

  loaderror (response, context, networkDetails = null) {
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.FRAG_LOAD_ERROR, fatal: false, frag: context.frag, response: response, networkDetails: networkDetails });
  }

  loadtimeout (stats, context, networkDetails = null) {
    this.hls.trigger(Event.ERROR, { type: ErrorTypes.NETWORK_ERROR, details: ErrorDetails.FRAG_LOAD_TIMEOUT, fatal: false, frag: context.frag, networkDetails: networkDetails });
  }

  // data will be used for progressive parsing
  loadprogress (stats, context, data, networkDetails = null) { // jshint ignore:line
    let frag = context.frag;
    frag.loaded = stats.loaded;
    this.hls.trigger(Event.FRAG_LOAD_PROGRESS, { frag: frag, stats: stats, networkDetails: networkDetails });
  }
}

export default FragmentLoaderCustom;
