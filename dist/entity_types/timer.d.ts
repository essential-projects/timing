import { Entity, EntityDependencyHelper } from '@process-engine-js/data_model_contracts';
import { ExecutionContext, IEntity, IInheritedSchema } from '@process-engine-js/core_contracts';
import { ITimerEntity, TimerType, TimerValue } from '@process-engine-js/timing_contracts';
export declare class TimerEntity extends Entity implements ITimerEntity {
    constructor(entityDependencyHelper: EntityDependencyHelper, context: ExecutionContext, schema: IInheritedSchema);
    initialize(derivedClassInstance: IEntity): Promise<void>;
    timerType: TimerType;
    timerValue: TimerValue;
    eventName: string;
    lastElapsed: Date;
}
