import { Entity, EntityDependencyHelper, IEntityType, IPropertyBag } from '@process-engine-js/data_model_contracts';
import { ExecutionContext, IEntity, IInheritedSchema } from '@process-engine-js/core_contracts';
import { ITimerEntity, TimerType, ITimingRule } from '@process-engine-js/timing_contracts';
export declare class TimerEntity extends Entity implements ITimerEntity {
    constructor(entityDependencyHelper: EntityDependencyHelper, context: ExecutionContext, schema: IInheritedSchema, propertyBag: IPropertyBag, entityType: IEntityType<IEntity>);
    initialize(): Promise<void>;
    timerType: TimerType;
    timerIsoString: string;
    timerRule: ITimingRule;
    eventName: string;
    lastElapsed: Date;
}
