import {IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {ITimerService, Timer, TimerRule, TimerType} from '@essential-projects/timing_contracts';

import * as moment from 'moment';
import * as schedule from 'node-schedule';
import * as uuid from 'uuid';

interface IJobsCache {
  [timerId: string]: schedule.Job;
}

export class TimerService implements ITimerService {

  private _jobs: IJobsCache = {};

  private _eventAggregator: IEventAggregator = undefined;

  public config: any = undefined;

  private oneShotTimerType: number = 0;

  constructor(eventAggregator: IEventAggregator) {
    this._eventAggregator = eventAggregator;
  }

  private get eventAggregator(): IEventAggregator {
    return this._eventAggregator;
  }

  public cancel(timerId: string): void {

    const job: schedule.Job = this._getJob(timerId);

    if (job) {
      schedule.cancelJob(job);
      this._removeJob(timerId);
    }
  }

  public once(date: moment.Moment, eventName: string): string {

    if (!date) {
      throw new Error('Must provide an expiration date for a one-shot timer!');
    }

    return this._createTimer(TimerType.once, date, undefined, eventName);
  }

  public periodic(rule: TimerRule, eventName: string): string {

    if (!rule) {
      throw new Error('Must provide a rule for a periodic timer!');
    }

    return this._createTimer(TimerType.periodic, undefined, rule, eventName);
  }

  private _createTimer(timerType: TimerType,
                       timerDate: moment.Moment,
                       timerRule: TimerRule,
                       eventName: string): string {

    const timerData: any = {
      type: timerType,
      expirationDate: timerDate || null,
      rule: timerRule,
      eventName: eventName,
    };

    const timerIsValidTimerEntry: Boolean = this._isValidTimer(timerData);

    if (timerIsValidTimerEntry) {
      timerData.id = uuid.v4();
      this._createJob(timerData.id, timerData, eventName);
    }

    return timerData.id;
  }

  private _isValidTimer(timer: Timer): boolean {

    const timerIsOneShotTimer: boolean = timer.type === this.oneShotTimerType;

    let isValidTimer: boolean = true;

    if (timerIsOneShotTimer) {

      if (!timer.expirationDate) {
        return false;
      }

      const timerDate: moment.Moment = timer.expirationDate;
      const now: moment.Moment = moment();

      const exectionTimeIsBefore: boolean = timerDate.isAfter(now);

      isValidTimer = timer.lastElapsed !== null || exectionTimeIsBefore;
    }

    return isValidTimer;
  }

  private _createJob(timerId: string, timer: Timer, eventName: string): schedule.Job {

    const timerValue: TimerRule | Date = timer.type === TimerType.periodic
        ? timer.rule
        : timer.expirationDate.toDate();

    const job: schedule.Job = schedule.scheduleJob(timerValue, () => {
      return this._timerElapsed(eventName);
    });

    if (!job) {
      throw new Error('an error occured during job scheduling');
    }

    this._cacheJob(timerId, job);

    return job;
  }

  private _timerElapsed(eventName: string): void {
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
}
