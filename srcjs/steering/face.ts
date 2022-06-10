import { OrientationTarget, PositionTarget, RotationTarget, SteeringOutput } from './steering'
import { Align } from './align'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class Face extends Align {
  constructor(
    protected character: NPC,
    protected target: PositionTarget & OrientationTarget & RotationTarget,
    maxAngularAcceleration = 20 * Math.PI,
    maxRotation = 2 * Math.PI,
    targetRadius = 0.018,
    slowRadius = 0.3,
    timeToTarget = 0.1
  ) {
    super(character, { orientation: 0 }, maxAngularAcceleration, maxRotation, targetRadius, slowRadius, timeToTarget)
  }

  getSteering(): SteeringOutput {
    const steering = this.steeringOutput()
    const direction = this.target.position.subtract(this.character.position)
    if (direction.length() === 0) {
      return steering
    }

    super.target = {
      orientation: Math.atan2(direction.x, direction.z),
    }
    return super.getSteering()
  }
}
