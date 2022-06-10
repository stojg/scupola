import { PositionTarget, Steering } from './steering'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class Flee extends Steering {
  constructor(
    protected readonly character: NPC,
    protected readonly target: PositionTarget,
    protected readonly maxAcceleration
  ) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    const direction = this.character.position.subtract(this.target.position)
    steering.linear = direction.normalize()
    steering.linear.scaleInPlace(this.maxAcceleration)
    return steering
  }
}
