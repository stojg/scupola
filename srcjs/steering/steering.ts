import * as BABYLON from '@babylonjs/core'
import { Immutable } from '@babylonjs/core'

export interface SteeringOutput {
  angular: number
  linear: BABYLON.Vector3
}

export interface Target {
  position: BABYLON.Vector3
  velocity: BABYLON.Vector3
  orientation: number // rotation around the y axis
  rotation: number
  direction: BABYLON.Vector3
}

export type PositionTarget = Pick<Target, 'position'>
export type VelocityTarget = Pick<Target, 'velocity'>
export type OrientationTarget = Pick<Target, 'orientation'>
export type RotationTarget = Pick<Target, 'rotation'>
export type DirectionTarget = Pick<Target, 'direction'>

export abstract class Steering {
  abstract getSteering(): SteeringOutput

  protected steeringOutput() {
    return {
      linear: BABYLON.Vector3.Zero(),
      angular: 0,
    }
  }

  protected clampInPlace(a: BABYLON.Vector3, maxLength: number) {
    if (a.length() <= maxLength) {
      return
    }
    a.normalize()
    a.scaleInPlace(maxLength)
  }

  protected clamp(a: Immutable<BABYLON.Vector3>, maxLength: number): BABYLON.Vector3 {
    if (a.length() <= maxLength) {
      return a.clone()
    }
    a.normalize()
    return a.scale(maxLength)
  }

  protected clampNumber(a: number, maxLength: number): number {
    const length = Math.abs(a)
    if (length <= maxLength) {
      return a
    }
    // normalise (but keep sign) and scale
    return (a / length) * maxLength
  }

  protected inSight(character: PositionTarget & DirectionTarget, target: PositionTarget, distance = 2000): boolean {
    if (BABYLON.Vector3.Distance(character.position, target.position) > distance) {
      return false
    }
    const dot = this._insight(character, target)
    return dot >= 0
  }

  protected inSightCone(character: PositionTarget & DirectionTarget, target: PositionTarget, radians: number) {
    const dot = this._insight(character, target)
    return dot >= radians / 2
  }

  private _insight(character: PositionTarget & DirectionTarget, target: PositionTarget) {
    const directionToTarget = target.position.clone().subtract(character.position.clone())
    directionToTarget.normalize()
    return BABYLON.Vector3.Dot(character.direction, directionToTarget)
  }
}
