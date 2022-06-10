import { Steering, SteeringOutput } from './steering'
import * as BABYLON from '@babylonjs/core'
import { Entity } from '../core/entity'
import NPC from '../core/npc'

export class ObstacleAvoidance extends Steering {
  constructor(
    private character: NPC,
    private obstacles: BABYLON.Mesh[],
    private maxAcceleration: number,
    private radiusInFront: number, // this._mesh.getBoundingInfo().boundingSphere.radiusWorld)
    private avoidDistance = 1,
    private lookahead = 1
  ) {
    super()
  }

  getSteering(): SteeringOutput {
    if (this.character.velocity.lengthSquared() === 0) {
      return this.steeringOutput()
    }
    let direction = this.character.velocity.clone().normalize()

    const start = this.character.position.add(direction.scaleInPlace(this.radiusInFront))

    const leftRot = new BABYLON.Quaternion(0, 0.382, 0, 0.9239556994702721).normalize()
    const rightRot = new BABYLON.Quaternion(0, -0.382, 0, 0.9239556994702721).normalize()

    const left = new BABYLON.Vector3(0, 0, 0)
    direction.clone().rotateByQuaternionToRef(leftRot, left)

    const right = new BABYLON.Vector3(0, 0, 0)
    direction.clone().rotateByQuaternionToRef(rightRot, right)

    const rays = [
      new BABYLON.Ray(start, left, this.avoidDistance),
      new BABYLON.Ray(start, direction, this.lookahead),
      new BABYLON.Ray(start, right, this.avoidDistance),
    ]

    let shortest = Infinity
    let hit: BABYLON.PickingInfo | null = null
    let idx: number = 0

    rays.forEach((ray, index) => {
      const pickingInfos: BABYLON.PickingInfo[] = []
      ray.intersectsMeshes(this.obstacles, false, pickingInfos)
      if (!pickingInfos.length) {
        return
      }
      pickingInfos.sort((a, b) => a.distance - b.distance)

      if (pickingInfos[0].distance < shortest) {
        shortest = pickingInfos[0].distance
        hit = pickingInfos[0]
        idx = index
      }
    })

    if (!hit) {
      return this.steeringOutput()
    }

    const normal = hit.getNormal(true)
    const target = hit.pickedPoint.add(normal.scale(this.avoidDistance))

    const linear = target.subtract(this.character.position)
    linear.normalize().scaleInPlace(this.maxAcceleration)

    const steering = this.steeringOutput()
    steering.linear.copyFrom(linear)
    return steering
  }
}
