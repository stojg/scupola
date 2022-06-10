import { Steering, VelocityTarget } from './steering'
import NPC from '../core/npc'

export class VelocityMatching extends Steering {
  constructor(
    protected readonly character: NPC,
    protected target: VelocityTarget,
    protected readonly timeToTarget = 0.1
  ) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    if (!this.character) {
      throw 'error'
    }
    steering.linear = this.target.velocity.subtract(this.character.velocity)
    steering.linear.scaleInPlace(1 / this.timeToTarget)

    this.clampInPlace(steering.linear, this.character.maxAcceleration)

    return steering
  }
}
