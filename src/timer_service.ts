import * as cronparser from 'cron-parser';
import * as moment from 'moment';
import * as schedule from 'node-schedule';
import * as uuid from 'node-uuid';

import {IEventAggregator} from '@essential-projects/event_aggregator_contracts';
import {
  ITimerService, Timer, TimerType,
} from '@essential-projects/timing_contracts';

interface IJobsCache {
  [timerId: string]: schedule.Job;
}

export class TimerService implements ITimerService {

  private jobs: IJobsCache = {};

  private readonly eventAggregator: IEventAggregator = undefined;

  private oneShotTimerType: number = 0;

  constructor(eventAggregator: IEventAggregator) {
    this.eventAggregator = eventAggregator;
  }

  public cancel(timerId: string): void {

    const job = this.getJob(timerId);

    if (job) {
      schedule.cancelJob(job);
      this.removeJob(timerId);
    }
  }

  public once(date: moment.Moment, eventName: string): string {

    if (!date) {
      throw new Error('Must provide an expiration date for a one-shot timer!');
    }

    return this.createTimer(TimerType.once, date, undefined, eventName);
  }

  public periodic(rule: string, eventName: string): string {

    if (!rule) {
      throw new Error('Must provide a rule for a periodic timer!');
    }

    return this.createTimer(TimerType.periodic, undefined, rule, eventName);
  }

  private createTimer(
    timerType: TimerType,
    timerDate: moment.Moment,
    timerRule: string,
    eventName: string,
  ): string {

    const timerData: Timer = {
      id: uuid.v4(),
      type: timerType,
      expirationDate: timerDate || undefined,
      rule: timerRule,
      eventName: eventName,
      lastElapsed: undefined,
    };

    const timerIsValidTimerEntry = this.isValidTimer(timerData);

    if (timerIsValidTimerEntry) {
      this.createJob(timerData.id, timerData, eventName);
    }

    return timerData.id;
  }

  private isValidTimer(timer: Timer): boolean {

    const timerIsOneShotTimer = timer.type === this.oneShotTimerType;

    let isValidTimer = true;

    if (timerIsOneShotTimer) {

      if (!timer.expirationDate) {
        return false;
      }

      const timerDate = timer.expirationDate;
      const now = moment();

      const expirationIsFutureDate = timerDate.isAfter(now);
      const timerHasAlreadyElapsed = timer.lastElapsed !== undefined;

      isValidTimer = timerHasAlreadyElapsed || expirationIsFutureDate;
    } else {
      cronparser.parseExpression(timer.rule);
    }

    return isValidTimer;
  }

  private createJob(timerId: string, timer: Timer, eventName: string): schedule.Job {

    const timerValue = timer.type === TimerType.periodic
      ? timer.rule
      : timer.expirationDate.toDate();

    const job = schedule.scheduleJob(timerValue, (): void => {
      return this.timerElapsed(eventName);
    });

    if (!job) {
      throw new Error('an error occured during job scheduling');
    }

    this.cacheJob(timerId, job);

    return job;
  }

  private timerElapsed(eventName: string): void {
    this.eventAggregator.publish(eventName);
  }

  private getJob(timerId: string): schedule.Job {
    return this.jobs[timerId];
  }

  private cacheJob(timerId: string, job: schedule.Job): void {
    this.jobs[timerId] = job;
  }

  private removeJob(timerId: string): void {
    if (this.jobs[timerId]) {
      delete this.jobs[timerId];
    }
  }

}
