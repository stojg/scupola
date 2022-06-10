import { PositionTarget, Steering } from './steering'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class Attract extends Steering {
  constructor(
    private character: NPC,
    private target: PositionTarget,
    private maxAcceleration: number,
    private threshold: number
  ) {
    super()
  }

  getSteering() {
    let direction = this.target.position.subtract(this.character.position)
    let distance = direction.length()
    const steering = this.steeringOutput()
    if (distance < this.threshold) {
      return steering
    }

    direction.normalize().scaleInPlace(this.maxAcceleration)
    steering.linear.copyFrom(direction)
    return steering
  }
}
