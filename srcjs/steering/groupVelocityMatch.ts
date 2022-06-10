import * as BABYLON from '@babylonjs/core'
import { DirectionTarget, PositionTarget, SteeringOutput, VelocityTarget } from './steering'
import { VelocityMatching } from './velocityMatching'
import NPC from '../core/npc'

export class GroupVelocityMatch extends VelocityMatching {
  constructor(
    protected readonly character: NPC,
    protected readonly targets: (VelocityTarget & PositionTarget & DirectionTarget)[]
  ) {
    super(character, undefined)
  }

  getSteering(): SteeringOutput {
    const avgVelocity = BABYLON.Vector3.Zero()

    let groupSize = 0
    this.targets.forEach((target) => {
      if (target == this.character) {
        return
      }
      if (!this.inSightCone(this.character, target, Math.PI / 4, 10)) {
        return
      }
      avgVelocity.addInPlace(target.velocity)
      groupSize += 1
    })
    if (groupSize === 0) {
      return this.steeringOutput()
    }
    // this is the centre
    avgVelocity.scaleInPlace(1 / groupSize)

    super.target = { velocity: avgVelocity }
    return super.getSteering()
  }
}
