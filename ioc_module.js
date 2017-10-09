'use strict';

const TimingService = require('./dist/commonjs/index').TimingService;

const TimerEntity = require('./dist/commonjs/index').TimerEntity;

const entityDiscoveryTag = require('@essential-projects/core_contracts').EntityDiscoveryTag;

function registerInContainer(container) {

  container.register('TimingService', TimingService)
    .dependencies('DatastoreService', 'IamService', 'EventAggregator')
    .injectPromiseLazy('DatastoreService')
    .configure('timing:timing_service')
    .singleton();

  container.register('TimerEntity', TimerEntity)
    .tags(entityDiscoveryTag);
}

module.exports.registerInContainer = registerInContainer;
