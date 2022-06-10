import { PositionTarget, Steering } from './steering'
import NPC from '../core/npc'

export class Arrive extends Steering {
  constructor(
    protected character: NPC,
    protected target: PositionTarget,
    protected targetRadius = 0.1,
    protected slowRadius = 1,
    protected timeToTarget = 0.1
  ) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    const direction = this.target.position.subtract(this.character.position)
    const distance = direction.length()
    if (distance < this.targetRadius) {
      return steering
    }

    let targetSpeed = this.character.maxSpeed
    if (distance <= this.slowRadius) {
      targetSpeed = this.character.maxSpeed * (distance / this.slowRadius)
    }

    const targetVelocity = direction.clone()
    targetVelocity.normalize()
    targetVelocity.scaleInPlace(targetSpeed)

    steering.linear = targetVelocity.subtract(this.character.velocity)
    steering.linear.scaleInPlace(1 / this.timeToTarget)

    this.clampInPlace(steering.linear, this.character.maxAcceleration)

    return steering
  }
}
