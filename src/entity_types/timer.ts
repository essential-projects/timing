import {Entity, EntityDependencyHelper} from '@process-engine-js/data_model_contracts';
import {ExecutionContext, SchemaAttributeType, IEntity, IInheritedSchema} from '@process-engine-js/core_contracts';
import {ITimerEntity, TimerType, ITimingRule} from '@process-engine-js/timing_contracts';
import {schemaAttribute} from '@process-engine-js/metadata';

export class TimerEntity extends Entity implements ITimerEntity {

  constructor(entityDependencyHelper: EntityDependencyHelper,
              context: ExecutionContext,
              schema: IInheritedSchema) {
    super(entityDependencyHelper, context, schema);
  }

  public async initEntity(derivedClassInstance: IEntity): Promise<void> {
    const actualInstance = derivedClassInstance || this;
    await super.initEntity(actualInstance);
  }

  @schemaAttribute({ type: SchemaAttributeType.number })
  public get timerType(): TimerType {
    return this.getProperty(this, 'timerType');
  }

  public set timerType(value: TimerType) {
    this.setProperty(this, 'timerType', value);
  }

  @schemaAttribute({ type: SchemaAttributeType.string })
  public get timerIsoString(): string {
    return this.getProperty(this, 'timerIsoString');
  }

  public set timerIsoString(value: string) {
    this.setProperty(this, 'timerIsoString', value);
  }

  @schemaAttribute({ type: SchemaAttributeType.object })
  public get timerRule(): ITimingRule {
    return this.getProperty(this, 'timerRule');
  }

  public set timerRule(value: ITimingRule) {
    this.setProperty(this, 'timerRule', value);
  }

  @schemaAttribute({ type: SchemaAttributeType.string })
  public get eventName(): string {
    return this.getProperty(this, 'eventName');
  }

  public set eventName(value: string) {
    this.setProperty(this, 'eventName', value);
  }

  @schemaAttribute({ type: SchemaAttributeType.Date })
  public get lastElapsed(): Date {
    return this.getProperty(this, 'lastElapsed');
  }

  public set lastElapsed(value: Date) {
    this.setProperty(this, 'lastElapsed', value);
  }

}
