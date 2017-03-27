'use strict';

const TimingService = require('./dist/commonjs/index').TimingService;

const TimerEntity = require('./dist/commonjs/index').TimerEntity;

const entityDiscoveryTag = require('@process-engine-js/core_contracts').EntityDiscoveryTag;

function registerInContainer(container) {

  container.register('TimingService', TimingService)
    .dependencies('DatastoreService', 'IamService', 'EventAggregator')
    .injectLazy('DatastoreService')
    .singleton();

  container.register('TimerEntity', TimerEntity)
    .tags(entityDiscoveryTag);
}

module.exports.registerInContainer = registerInContainer;
