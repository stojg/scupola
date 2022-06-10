import { RotationTarget, Steering } from './steering'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class RotationMatching extends Steering {
  constructor(
    protected readonly character: NPC,
    protected target: RotationTarget,
    protected readonly maxRotation,
    protected readonly timeToTarget = 0.1
  ) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    steering.angular = this.target.rotation - this.character.rotation
    steering.angular /= this.timeToTarget

    steering.angular = this.clampNumber(steering.angular, this.maxRotation)

    return steering
  }
}
