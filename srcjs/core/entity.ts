import * as BABYLON from '@babylonjs/core'

export class Entity {
  protected _position = BABYLON.Vector3.Zero()
  protected _velocity = BABYLON.Vector3.Zero()
  private readonly _maxSpeed: number = 1

  protected _orientation: number = 0
  protected _rotation: number = 0
  private readonly _maxRotation: number = 2 * Math.PI

  constructor(position: BABYLON.Vector3, orientation: number, maxSpeed?: number, maxRotation?: number) {
    this._position.copyFrom(position)
    this._orientation = orientation
    this._maxSpeed = maxSpeed
    this._maxRotation = maxRotation
  }

  get position(): Readonly<BABYLON.Vector3> {
    return this._position
  }

  get velocity(): Readonly<BABYLON.Vector3> {
    return this._velocity
  }

  get maxSpeed(): number {
    return this._maxSpeed
  }

  get orientation(): number {
    return this._orientation
  }

  get rotation(): number {
    return this._rotation
  }

  get maxRotation(): number {
    return this._maxRotation
  }

  get direction(): BABYLON.Vector3 {
    return new BABYLON.Vector3(Math.sin(this._orientation), 0, Math.cos(this._orientation))
  }

  integrateLinear(linear: BABYLON.Vector3, dt: number) {
    // change in velocity
    this._velocity.addInPlace(linear.scale(dt))

    // limit velocities
    if (this._velocity.length() > this._maxSpeed) {
      this._velocity.normalize().scaleInPlace(this._maxSpeed)
    }
    // change in position
    const y = this._position.y
    this._position.addInPlace(this._velocity.scale(dt))
    this._position.y = y
  }

  integrateAngular(angular: number, dt: number) {
    // change in rotation velocity
    this._rotation += angular * dt
    // limit rotation velocity
    if (Math.abs(this._rotation) > this._maxRotation) {
      this._rotation = this._maxRotation * (this._rotation / Math.abs(this._rotation))
    }
    // change in orientation
    this._orientation = this._orientation + this._rotation * dt
  }

  applyDrag(drag: number) {
    this._velocity.scaleInPlace(drag)
    this._rotation *= drag
  }
}
