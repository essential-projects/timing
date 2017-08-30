define(["require", "exports", "@process-engine-js/timing_contracts", "node-schedule"], function (require, exports, timing_contracts_1, schedule) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TimingService {
        constructor(datastoreServiceFactory, iamService, eventAggregator) {
            this._jobs = {};
            this._datastoreServiceFactory = undefined;
            this._datastoreService = undefined;
            this._iamService = undefined;
            this._eventAggregator = undefined;
            this.config = undefined;
            this._datastoreServiceFactory = datastoreServiceFactory;
            this._iamService = iamService;
            this._eventAggregator = eventAggregator;
        }
        async getDatastoreService() {
            if (!this._datastoreService) {
                this._datastoreService = await this._datastoreServiceFactory();
            }
            return this._datastoreService;
        }
        get iamService() {
            return this._iamService;
        }
        get eventAggregator() {
            return this._eventAggregator;
        }
        async initialize() {
            const context = await this._getContext();
            return this._restorePersistedJobs(context);
        }
        async cancel(timerId, context) {
            const job = this._getJob(timerId);
            if (job) {
                schedule.cancelJob(job);
                this._removeJob(timerId);
            }
            return this._removeTimerEntity(timerId, context);
        }
        async once(date, eventName, context) {
            if (!date) {
                throw new Error('invalid date');
            }
            return this._createTimer(timing_contracts_1.TimerType.once, date, undefined, eventName, context);
        }
        async periodic(rule, eventName, context) {
            if (!rule) {
                throw new Error('invalid date');
            }
            return this._createTimer(timing_contracts_1.TimerType.periodic, undefined, rule, eventName, context);
        }
        async _timerElapsed(timerId, eventName) {
            const context = await this._getContext();
            const timerEntity = await this._getTimerEntityById(timerId, context);
            timerEntity.lastElapsed = new Date();
            await timerEntity.save(context);
            this.eventAggregator.publish(eventName);
        }
        _getContext() {
            return this.iamService.createInternalContext(this.config.systemUserId);
        }
        _getJob(timerId) {
            return this._jobs[timerId];
        }
        _cacheJob(timerId, job) {
            this._jobs[timerId] = job;
        }
        _removeJob(timerId) {
            if (this._jobs[timerId]) {
                delete this._jobs[timerId];
            }
        }
        async _getTimerEntityType() {
            const datastoreService = await this.getDatastoreService();
            const entityType = await datastoreService.getEntityType('Timer');
            return entityType;
        }
        async _getTimerEntityById(timerId, context) {
            const timerEntityType = await this._getTimerEntityType();
            const getOptions = {};
            const timerEntity = await timerEntityType.getById(timerId, context, getOptions);
            if (!timerEntity) {
                throw new Error(`an error occured during cancellation of job with id "${timerId}": not found`);
            }
            return timerEntity;
        }
        async _removeTimerEntity(timerId, context) {
            const timerEntity = await this._getTimerEntityById(timerId, context);
            if (timerEntity) {
                const removeOptions = {};
                await timerEntity.remove(context, removeOptions);
            }
        }
        async _createTimer(timerType, timerDate, timerRule, eventName, context) {
            const timerEntityType = await this._getTimerEntityType();
            const createOptions = {};
            const timerData = {
                timerType: timerType,
                timerIsoString: timerDate ? timerDate.toISOString() : null,
                timerRule: timerRule,
                eventName: eventName
            };
            const timerEntity = await timerEntityType.createEntity(context, timerData, createOptions);
            const timerValue = timerType === timing_contracts_1.TimerType.periodic ? timerRule : timerDate.toDate();
            this._createJob(timerEntity.id, timerValue, eventName);
            const saveOptions = {};
            await timerEntity.save(context, saveOptions);
            return timerEntity.id;
        }
        _createJob(timerId, timerValue, eventName) {
            const job = schedule.scheduleJob(timerValue, async () => {
                return this._timerElapsed(timerId, eventName);
            });
            if (!job) {
                throw new Error('an error occured during job scheduling');
            }
            this._cacheJob(timerId, job);
            return job;
        }
        async _createTimerEntity(timerData, context) {
            const timerEntityType = await this._getTimerEntityType();
            const createOptions = {};
            const timerEntity = await timerEntityType.createEntity(context, timerData, createOptions);
            const saveOptions = {};
            await timerEntity.save(context, saveOptions);
            return timerEntity;
        }
        async _restorePersistedJobs(context) {
            const timerEntityType = await this._getTimerEntityType();
            const timerOnceQuery = {
                operator: 'and',
                queries: [{
                        attribute: 'lastElapsed',
                        operator: '=',
                        value: null
                    }, {
                        attribute: 'timerType',
                        operator: '=',
                        value: timing_contracts_1.TimerType.once
                    }]
            };
            const otherTimersQuery = {
                attribute: 'timerType',
                operator: '!=',
                value: timing_contracts_1.TimerType.once
            };
            const queryOptions = {
                query: {
                    operator: 'or',
                    queries: [timerOnceQuery, otherTimersQuery]
                }
            };
            const timerEntities = await timerEntityType.all(context, queryOptions);
            timerEntities.data.forEach((timerEntity) => {
                const timerValue = timerEntity.timerType === timing_contracts_1.TimerType.periodic ? timerEntity.timerRule : timerEntity.timerIsoString;
                this._createJob(timerEntity.id, timerValue, timerEntity.eventName);
            });
        }
    }
    exports.TimingService = TimingService;
});

//# sourceMappingURL=timing_service.js.map
