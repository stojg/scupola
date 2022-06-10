import { PositionTarget, Steering } from './steering'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class Seek extends Steering {
  constructor(protected readonly character: NPC, protected target: PositionTarget, protected readonly maxAcceleration) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    const direction = this.target.position.subtract(this.character.position)
    steering.linear = direction.normalize()
    steering.linear.scaleInPlace(this.maxAcceleration)
    return steering
  }
}
