import { PositionTarget, Steering } from './steering'
import NPC from '../core/npc'

export class Flee extends Steering {
  constructor(protected readonly character: NPC, protected readonly target: PositionTarget) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    const direction = this.character.position.subtract(this.target.position)
    steering.linear = direction.normalize()
    steering.linear.scaleInPlace(this.character.maxAcceleration)
    return steering
  }
}
