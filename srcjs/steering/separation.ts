import { PositionTarget, Steering } from './steering'
import * as BABYLON from '@babylonjs/core'
import NPC from '../core/npc'

export class Separation extends Steering {
  constructor(
    protected readonly character: NPC,
    protected readonly targets: PositionTarget[],
    protected readonly threshold = 1,
    protected readonly decayCoefficient = 1
  ) {
    super()
  }

  getSteering() {
    const steering = this.steeringOutput()
    this.targets.forEach((target) => {
      if (target == this.character) {
        return
      }
      // check if target is close
      let direction = this.character.position.subtract(target.position)
      let distance = direction.length()
      if (distance > this.threshold) {
        return
      }
      // check if they are on top of eachother
      if (distance < 0.001) {
        const r = Math.random() * 2 * Math.PI
        direction = BABYLON.Vector3.FromArray([Math.sin(r), 0, Math.cos(r)])
        distance = 0.001
      }

      const strength = Math.min(this.decayCoefficient / (distance * distance), this.character.maxAcceleration)
      direction.normalize()
      steering.linear.addInPlace(direction.scale(strength))
    })
    return steering
  }
}
