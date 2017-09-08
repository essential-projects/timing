import {IEventAggregator} from '@process-engine-js/event_aggregator_contracts';
import {ExecutionContext, IPrivateQueryOptions, IIamService} from '@process-engine-js/core_contracts';
import {ITimingService, ITimingRule, ITimerEntity, TimerType} from '@process-engine-js/timing_contracts';
import {IDatastoreService, IEntityType} from '@process-engine-js/data_model_contracts';
import {IFactoryAsync} from 'addict-ioc'

import * as schedule from 'node-schedule';
import * as moment from 'moment';

interface IJobsCache {
  [timerId: string]: schedule.Job;
}

export class TimingService implements ITimingService {

  private _jobs: IJobsCache = {};

  private _datastoreServiceFactory: IFactoryAsync<IDatastoreService> = undefined;
  private _datastoreService: IDatastoreService = undefined;
  private _iamService: IIamService = undefined;
  private _eventAggregator: IEventAggregator = undefined;

  public config: any = undefined;

  constructor(datastoreServiceFactory: IFactoryAsync<IDatastoreService>, iamService: IIamService, eventAggregator: IEventAggregator) {
    this._datastoreServiceFactory = datastoreServiceFactory;
    this._iamService = iamService;
    this._eventAggregator = eventAggregator;
  }

  private async getDatastoreService(): Promise<IDatastoreService> {
    if (!this._datastoreService) {
      this._datastoreService = await this._datastoreServiceFactory();
    }
    return this._datastoreService;
  }

  private get iamService(): IIamService {
    return this._iamService;
  }

  private get eventAggregator(): IEventAggregator {
    return this._eventAggregator;
  }

  public async initialize(): Promise<void> {
    const context: ExecutionContext = await this._getContext();
    return this._restorePersistedJobs(context);
  }

  public async cancel(timerId: string, context: ExecutionContext): Promise<void> {

    const job = this._getJob(timerId);

    if (job) {

      schedule.cancelJob(job);

      this._removeJob(timerId);
    }

    return this._removeTimerEntity(timerId, context);
  }

  public async once(date: moment.Moment, eventName: string, context: ExecutionContext): Promise<string> {

    if (!date) {
      throw new Error('invalid date');
    }

    return this._createTimer(TimerType.once, date, undefined, eventName, context);
  }

  public async periodic(rule: ITimingRule, eventName: string, context: ExecutionContext): Promise<string> {

    if (!rule) {
      throw new Error('invalid date');
    }

    return this._createTimer(TimerType.periodic, undefined, rule, eventName, context);
  }

  // public async cron(cronString: string, eventName: string, context: ExecutionContext): Promise<string> {

  //   if (!cronString) {
  //     throw new Error('invalid cron input');
  //   }

  //   return this._createTimer(TimerType.cron, cronString, eventName, context);
  // }

  private async _timerElapsed(timerId: string, eventName: string): Promise<void> {

    const context = await this._getContext();

    const timerEntity = await this._getTimerEntityById(timerId, context);

    timerEntity.lastElapsed = new Date();

    await timerEntity.save(context);

    this.eventAggregator.publish(eventName);
  }

  private _getContext(): Promise<ExecutionContext> {
    return this.iamService.createInternalContext(this.config.systemUserId);
  }

  private _getJob(timerId: string): schedule.Job {
    return this._jobs[timerId];
  }

  private _cacheJob(timerId: string, job: schedule.Job): void {
    this._jobs[timerId] = job;
  }

  private _removeJob(timerId: string): void {
    if (this._jobs[timerId]) {
      delete this._jobs[timerId];
    }
  }

  private async _getTimerEntityType(): Promise<IEntityType<ITimerEntity>> {
    const datastoreService = await this.getDatastoreService();
    const entityType = await datastoreService.getEntityType<ITimerEntity>('Timer');
    return entityType;
  }

  private async _getTimerEntityById(timerId: string, context: ExecutionContext): Promise<ITimerEntity> {

    const timerEntityType = await this._getTimerEntityType();

    const getOptions = {};

    const timerEntity = await timerEntityType.getById(timerId, context, getOptions);

    if (!timerEntity) {
      throw new Error(`an error occured during cancellation of job with id "${timerId}": not found`);
    }

    return timerEntity;
  }

  private async _removeTimerEntity(timerId: string, context: ExecutionContext): Promise<void> {

    const timerEntity = await this._getTimerEntityById(timerId, context);

    if (timerEntity) {

      const removeOptions = {};

      await timerEntity.remove(context, removeOptions);
    }
  }

  private async _createTimer(timerType: TimerType, timerDate: moment.Moment, timerRule: ITimingRule, eventName: string, context: ExecutionContext): Promise<string> {

    const timerEntityType = await this._getTimerEntityType();

    const createOptions = {};

    const timerData = {
      timerType: timerType,
      timerIsoString: timerDate ? timerDate.toISOString() : null,
      timerRule: timerRule,
      eventName: eventName
    };

    const timerEntity = await timerEntityType.createEntity<ITimerEntity>(context, timerData, createOptions);

    const timerValue: ITimingRule | Date = timerType === TimerType.periodic ? timerRule : timerDate.toDate();

    this._createJob(timerEntity.id, timerValue, eventName);

    const saveOptions = {};

    await timerEntity.save(context, saveOptions);

    return timerEntity.id;
  }

  private _createJob(timerId: string, timerValue: ITimingRule | string | Date, eventName: string): schedule.Job {

    const job = schedule.scheduleJob(timerValue, async () => {
      return this._timerElapsed(timerId, eventName);
    });

    if (!job) {
      throw new Error('an error occured during job scheduling');
    }

    this._cacheJob(timerId, job);

    return job;
  }

  private async _createTimerEntity(timerData: any, context: ExecutionContext): Promise<ITimerEntity> {  // tslint:disable-line no-unused-variable

    const timerEntityType = await this._getTimerEntityType();

    const createOptions = {};

    const timerEntity = await timerEntityType.createEntity<ITimerEntity>(context, timerData, createOptions);

    const saveOptions = {};

    await timerEntity.save(context, saveOptions);

    return timerEntity;
  }

  private async _restorePersistedJobs(context: ExecutionContext): Promise<void> {

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
        value: TimerType.once
      }]
    };

    const otherTimersQuery = {
      attribute: 'timerType',
      operator: '!=',
      value: TimerType.once
    };

    const queryOptions: IPrivateQueryOptions = {
      query: {
        operator: 'or',
        queries: [timerOnceQuery, otherTimersQuery]
      }
    };

    const timerEntities = await timerEntityType.all(context, queryOptions);
    timerEntities.data.forEach((timerEntity: ITimerEntity) => {

      const timerValue: ITimingRule | string = timerEntity.timerType === TimerType.periodic ? timerEntity.timerRule : timerEntity.timerIsoString;

      this._createJob(timerEntity.id, timerValue, timerEntity.eventName);
    });
  }
}
