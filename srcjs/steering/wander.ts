import * as BABYLON from '@babylonjs/core'
import { SteeringOutput } from './steering'
import { Face } from './face'
import NPC from '../core/npc'

export class Wander extends Face {
  wanderOffset = 5
  wanderRadius = 4
  wanderRate = Math.PI / 8
  wanderOrientation = 0

  constructor(character: NPC) {
    super(character, { position: undefined, orientation: 0, rotation: 0 })
  }

  getSteering(): SteeringOutput {
    const direction = new BABYLON.Vector3(Math.sin(this.character.orientation), 0, Math.cos(this.character.orientation))

    // the centre of the circle ahead of the character
    const target = this.character.position.add(direction.scale(this.wanderOffset))

    this.wanderOrientation += randomBinomial() * this.wanderRate
    const targetOrientation = this.wanderOrientation + this.character.orientation

    const circleTarget = new BABYLON.Vector3(Math.sin(targetOrientation), 0, Math.cos(targetOrientation))

    target.addInPlace(circleTarget.scale(this.wanderRadius))

    super.target = { position: target, orientation: 0, rotation: 0 }
    const steering = super.getSteering()
    steering.linear = direction.scale(this.character.maxAcceleration)
    return steering
  }
}

function randomBinomial() {
  return Math.random() - Math.random()
}
