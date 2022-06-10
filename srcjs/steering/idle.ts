import * as BABYLON from '@babylonjs/core'
import { SteeringOutput } from './steering'
import { VelocityMatching } from './velocityMatching'
import { RotationMatching } from './rotationMatching'
import NPC from '../core/npc'

export class Idle extends VelocityMatching {
  constructor(character: NPC) {
    super(character, { velocity: BABYLON.Vector3.Zero() })
  }

  getSteering(): SteeringOutput {
    super.target = { velocity: BABYLON.Vector3.Zero() }
    const steering = super.getSteering()
    const r = new RotationMatching(this.character, { rotation: 0 }, this.character.maxAngularAcceleration)
    steering.angular = r.getSteering().angular
    return steering
  }
}
