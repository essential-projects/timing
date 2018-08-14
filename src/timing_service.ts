import {IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {ITimerEntity, ITimingRule, ITimerRepository, Timer, ITimingService, TimerType} from '@essential-projects/timing_contracts';

import * as moment from 'moment';
import * as schedule from 'node-schedule';

interface IJobsCache {
  [timerId: string]: schedule.Job;
}

export class TimingService implements ITimingService {

  private _jobs: IJobsCache = {};

  private _eventAggregator: IEventAggregator = undefined;
  private _timerRepository: ITimerRepository = undefined;

  public config: any = undefined;

  private oneShotTimerType: number = 0;

  constructor(eventAggregator: IEventAggregator, timerRepository: ITimerRepository) {
    this._eventAggregator = eventAggregator;
    this._timerRepository = timerRepository;
  }

  private get eventAggregator(): IEventAggregator {
    return this._eventAggregator;
  }

  private get timerRepository(): ITimerRepository {
    return this._timerRepository;
  }

  public async cancel(timerId: string): Promise<void> {

    const job = this._getJob(timerId);

    if (job) {

      schedule.cancelJob(job);

      this._removeJob(timerId);
    }

    return this._removeTimer(timerId);
  }

  public async once(date: moment.Moment, eventName: string): Promise<string> {

    if (!date) {
      throw new Error('invalid date');
    }

    return this._createTimer(TimerType.once, date, undefined, eventName);
  }

  public async periodic(rule: ITimingRule, eventName: string): Promise<string> {

    if (!rule) {
      throw new Error('invalid date');
    }

    return this._createTimer(TimerType.periodic, undefined, rule, eventName);
  }

  private async _timerElapsed(timerId: string, eventName: string): Promise<void> {

    const timer = await this._getTimerById(timerId);

    timer.lastElapsed = new Date();

    await this.timerRepository.save(timer);

    this.eventAggregator.publish(eventName);
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

  private async _getTimerById(timerId: string): Promise<Timer> {

    const timer = await this._timerRepository.getById(timerId);

    if (!timer) {
      throw new Error(`an error occured during cancellation of job with id "${timerId}": not found`);
    }

    return timer;
  }

  private async _removeTimer(timerId: string): Promise<void> {

    const timer = await this._getTimerById(timerId);

    if (timer) {
      await this.timerRepository.removeById(timer.id);
    }
  }

  private async _createTimer(timerType: TimerType, timerDate: moment.Moment, timerRule: ITimingRule, eventName: string): Promise<string> {

    const timer = new Timer();

    timer.timerType = timerType;
    timer.timerIsoString = timerDate ? timerDate.toISOString() : null;
    timer.timerRule = timerRule;
    timer.eventName = eventName;

    const timerValue: ITimingRule | Date = timerType === TimerType.periodic ? timerRule : timerDate.toDate();

    const timerIsValidTimerEntry: Boolean = this._isValidTimer(timer);

    if (timerIsValidTimerEntry) {
      this._createJob(timer.id, timerValue, eventName);
    }

    await this.timerRepository.save(timer);

    return timer.id;
  }

  private _isValidTimer(timer: ITimerEntity): boolean {

    const timerIsOneShotTimer: boolean = timer.timerType === this.oneShotTimerType;

    let isValidTimer: boolean = true;

    if (timerIsOneShotTimer) {

      const timerDate: moment.Moment = moment(timer.timerIsoString);
      const now: moment.Moment = moment();

      const exectionTimeIsBefore: boolean = timerDate.isAfter(now);

      isValidTimer = timer.lastElapsed !== null || exectionTimeIsBefore;
    }

    return isValidTimer;
  }

  private _createJob(timerId: string, timerValue: ITimingRule | string | Date, eventName: string): schedule.Job {

    const job = schedule.scheduleJob(timerValue, async() => {
      return this._timerElapsed(timerId, eventName);
    });

    if (!job) {
      throw new Error('an error occured during job scheduling');
    }

    this._cacheJob(timerId, job);

    return job;
  }

  public async restorePersistedJobs(): Promise<void> {

    const timers = await this.timerRepository.all();

    for (const timer of timers) {

      const timerIsValidTimerEntry: Boolean = this._isValidTimer(timer);

      if (timerIsValidTimerEntry) {
        const timerValue: ITimingRule | string = timer.timerType === TimerType.periodic ? timer.timerRule : timer.timerIsoString;
        this._createJob(timer.id, timerValue, timer.eventName);
      }
    }
  }
}
