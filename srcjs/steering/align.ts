import { OrientationTarget, Steering, SteeringOutput } from './steering'
import * as BABYLON from '@babylonjs/core'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class Align extends Steering {
  constructor(
    protected character: NPC,
    protected target: OrientationTarget,
    protected maxAngularAcceleration = 20 * Math.PI,
    protected maxRotation = 2 * Math.PI,
    protected targetRadius = 0.018,
    protected slowRadius = 0.3,
    protected timeToTarget = 0.1
  ) {
    super()
  }

  getSteering(): SteeringOutput {
    const steering = this.steeringOutput()

    let rotation = this.target.orientation - this.character.orientation

    // map to -Math.PI to +Math.PI range
    rotation = BABYLON.Scalar.NormalizeRadians(rotation)
    const rotationSize = Math.abs(rotation)

    if (rotationSize < this.targetRadius) {
      return steering
    }

    let targetRotation = this.maxRotation
    if (rotationSize <= this.slowRadius) {
      targetRotation = this.maxRotation * (rotationSize / this.slowRadius)
    }

    // the final target rotation combines speed (already in the var) and directions
    targetRotation *= rotation / rotationSize

    // acceleration tries to get to the target rotation
    steering.angular = targetRotation - this.character.rotation
    steering.angular /= this.timeToTarget

    // check if acceleration is too fast
    steering.angular = this.clampNumber(steering.angular, this.maxAngularAcceleration)

    return steering
  }
}
