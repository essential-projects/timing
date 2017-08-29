"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timing_contracts_1 = require("@process-engine-js/timing_contracts");
const schedule = require("node-schedule");
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
        console.log('TimingService initialize 1');
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
        console.log('TimingService _getTimerEntityType 1');
        const datastoreService = await this.getDatastoreService();
        console.log('TimingService _getTimerEntityType 2');
        const entityType = await datastoreService.getEntityType('Timer');
        console.log('TimingService _getTimerEntityType 3');
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
        console.log('TimingService _restorePersitedJobs 1');
        const timerEntityType = await this._getTimerEntityType();
        console.log('TimingService _restorePersitedJobs 2');
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
        console.log('TimingService _restorePersitedJobs 3');
        const timerEntities = await timerEntityType.all(context, queryOptions);
        console.log('TimingService _restorePersitedJobs 4');
        timerEntities.data.forEach((timerEntity) => {
            const timerValue = timerEntity.timerType === timing_contracts_1.TimerType.periodic ? timerEntity.timerRule : timerEntity.timerIsoString;
            console.log('TimingService _restorePersitedJobs 4 - ' + timerEntity.id + ' - 1');
            this._createJob(timerEntity.id, timerValue, timerEntity.eventName);
            console.log('TimingService _restorePersitedJobs 4 - ' + timerEntity.id + ' - 2');
        });
        console.log('TimingService _restorePersitedJobs 5');
    }
}
exports.TimingService = TimingService;

//# sourceMappingURL=timing_service.js.map
