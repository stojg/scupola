import { PositionTarget, Steering, SteeringOutput, VelocityTarget } from './steering'
import * as BABYLON from '@babylonjs/core'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class CollisionAvoidance extends Steering {
  constructor(
    private character: NPC,
    private targets: (PositionTarget & VelocityTarget)[],
    private maxAcceleration: number,
    private radius = 1.0,
    private secondsAhead = 1.0
  ) {
    super()
  }

  getSteering(): SteeringOutput {
    const steering = this.steeringOutput()
    let shortestTime = Infinity
    let firstTarget = null
    let firstMinSeparation = 0
    let firstDistance = 0
    let firstRelativePos = null
    let firstRelativeVel = null

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i]
      if (target === this.character || !this.inSight(this.character, target)) {
        continue
      }

      // calc time to collision
      let relativePos = target.position.subtract(this.character.position)
      let relativeVel = target.velocity.subtract(this.character.velocity)
      let relativeSpeed = relativeVel.length()
      let timeToCollision = -BABYLON.Vector3.Dot(relativePos, relativeVel) / (relativeSpeed * relativeSpeed)

      // check if it is going to be a collision at all
      let distance = relativePos.length()

      let minSeparation = distance - relativeSpeed * timeToCollision

      if (minSeparation > 2 * this.radius) {
        continue
      }

      // check if it is the shortest
      if (timeToCollision > 0 && timeToCollision < shortestTime) {
        // store the time, target and other data
        shortestTime = timeToCollision
        firstTarget = target
        firstMinSeparation = minSeparation
        firstDistance = distance
        firstRelativePos = relativePos
        firstRelativeVel = relativeVel
      }
    }

    if (!firstTarget) {
      return steering
    }

    if (shortestTime > this.secondsAhead) {
      return steering
    }

    let target = BABYLON.Vector3.Zero()
    // if we are going to hit exactly, or if we're already colliding, then do the steering based on current position
    if (firstMinSeparation <= 0 || firstDistance < 2 * this.radius) {
      target.copyFrom(firstTarget.position).subtractInPlace(this.character.position)
    } else {
      // otherwise, calculate the future relative position
      target.copyFrom(firstRelativePos).subtractInPlace(firstRelativeVel.scale(shortestTime))
    }

    // avoid the target
    steering.linear.copyFrom(target.normalize().scaleInPlace(-this.maxAcceleration))

    return steering
  }
}
