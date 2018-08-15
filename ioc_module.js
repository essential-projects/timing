'use strict';

const TimerService = require('./dist/commonjs/index').TimerService;

function registerInContainer(container) {

  container.register('TimerService', TimerService)
    .dependencies('EventAggregator', 'TimerRepository');
}

module.exports.registerInContainer = registerInContainer;
