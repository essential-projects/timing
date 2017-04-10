"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const data_model_contracts_1 = require("@process-engine-js/data_model_contracts");
const core_contracts_1 = require("@process-engine-js/core_contracts");
const metadata_1 = require("@process-engine-js/metadata");
class TimerEntity extends data_model_contracts_1.Entity {
    constructor(entityDependencyHelper, context, schema) {
        super(entityDependencyHelper, context, schema);
    }
    async initialize(derivedClassInstance) {
        const actualInstance = derivedClassInstance || this;
        await super.initialize(actualInstance);
    }
    get timerType() {
        return this.getProperty(this, 'timerType');
    }
    set timerType(value) {
        this.setProperty(this, 'timerType', value);
    }
    get timerIsoString() {
        return this.getProperty(this, 'timerIsoString');
    }
    set timerIsoString(value) {
        this.setProperty(this, 'timerIsoString', value);
    }
    get timerRule() {
        return this.getProperty(this, 'timerRule');
    }
    set timerRule(value) {
        this.setProperty(this, 'timerRule', value);
    }
    get eventName() {
        return this.getProperty(this, 'eventName');
    }
    set eventName(value) {
        this.setProperty(this, 'eventName', value);
    }
    get lastElapsed() {
        return this.getProperty(this, 'eventName');
    }
    set lastElapsed(value) {
        this.setProperty(this, 'eventName', value);
    }
}
__decorate([
    metadata_1.schemaAttribute({ type: core_contracts_1.SchemaAttributeType.number })
], TimerEntity.prototype, "timerType", null);
__decorate([
    metadata_1.schemaAttribute({ type: core_contracts_1.SchemaAttributeType.string })
], TimerEntity.prototype, "timerIsoString", null);
__decorate([
    metadata_1.schemaAttribute({ type: core_contracts_1.SchemaAttributeType.object })
], TimerEntity.prototype, "timerRule", null);
__decorate([
    metadata_1.schemaAttribute({ type: core_contracts_1.SchemaAttributeType.string })
], TimerEntity.prototype, "eventName", null);
__decorate([
    metadata_1.schemaAttribute({ type: core_contracts_1.SchemaAttributeType.Date })
], TimerEntity.prototype, "lastElapsed", null);
exports.TimerEntity = TimerEntity;

//# sourceMappingURL=timer.js.map
