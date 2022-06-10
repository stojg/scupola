import { PositionTarget, Steering } from './steering'
import * as BABYLON from '@babylonjs/core'
import NPC from '../core/npc'

export class Cohesion extends Steering {
  constructor(
    protected readonly character: NPC,
    protected readonly targets: PositionTarget[],
    protected readonly threshold = 1
  ) {
    super()
  }

  getSteering() {
    const centreOfGroup = BABYLON.Vector3.Zero()
    let groupSize = 0
    this.targets.forEach((target) => {
      if (target == this.character) {
        return
      }
      if (!this.inSightCone(this.character, target, Math.PI / 2, 10)) {
        return
      }
      centreOfGroup.addInPlace(target.position)
      groupSize += 1
    })

    const steering = this.steeringOutput()
    if (groupSize === 0) {
      return steering
    }
    // this is the centre
    centreOfGroup.scaleInPlace(1 / groupSize)

    const target = centreOfGroup.subtract(this.character.position)
    // we are close enough
    if (target.length() < this.threshold) {
      return steering
    }
    steering.linear = target.normalize().scaleInPlace(this.character.maxAcceleration)
    return steering
  }
}
