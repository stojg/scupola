import * as BABYLON from '@babylonjs/core'
import { v4 as uuid } from 'uuid'
import { Steering, SteeringOutput } from '../steering/steering'
import { Entity } from './entity'
import { Blended } from '../steering/blended'
import { Priority } from '../steering/priority'

interface Options {
  maxSpeed?: number
  maxAcceleration?: number
  maxRotation?: number
  maxAngularAcceleration?: number
}

export default class NPC extends Entity {
  private readonly scene: BABYLON.Scene
  private readonly engine: BABYLON.Engine
  private readonly _mesh: BABYLON.Mesh
  private readonly _maxAcceleration: number = 1
  private readonly _maxAngularAcceleration: number = 10
  private readonly drag: number = 0.999
  private readonly _uuid: string

  private priorityGroups: { priority: number; group: Blended }[] = []

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, options?: Options) {
    const orientation = mesh.rotationQuaternion?.toEulerAngles() || mesh.rotation
    super(mesh.position, orientation.y, options?.maxSpeed, options?.maxRotation)

    this.scene = scene
    this.engine = scene.getEngine()
    this._mesh = mesh
    this._uuid = uuid()

    this._maxAcceleration = options?.maxAcceleration || this._maxAcceleration
    this._maxAngularAcceleration = options?.maxAngularAcceleration || this._maxAcceleration * 10
  }

  get uuid(): any {
    return this._uuid
  }

  get mesh(): BABYLON.AbstractMesh {
    return this._mesh
  }

  get maxAcceleration(): number {
    return this._maxAcceleration
  }
  get maxAngularAcceleration(): number {
    return this._maxAngularAcceleration
  }

  clearPriorityGroup() {
    this.priorityGroups = []
  }

  addPriorityGroup(priority: number, blended: { weight: number; behaviour: Steering }[]) {
    const group = new Blended(blended, this._maxAcceleration, this._maxAngularAcceleration)
    this.priorityGroups.push({ priority: priority, group: group })
  }

  steer() {
    const steering = new Priority(this.priorityGroups, 0.01)
    this.update(steering.getSteering())
  }

  private update(steering: SteeringOutput) {
    if (isNaN(steering.linear.length()) || isNaN(steering.angular)) {
      throw new Error('Steering is returning a NaN')
    }
    const dt = this.engine.getDeltaTime() / 1000

    if (steering.linear.length() > this._maxAcceleration) {
      steering.linear.normalize().scaleInPlace(this._maxAcceleration)
    }
    if (Math.abs(steering.angular) > this._maxAngularAcceleration) {
      steering.angular = this._maxAngularAcceleration * (steering.angular / Math.abs(steering.angular))
    }

    this.integrateLinear(steering.linear, dt)
    this.integrateAngular(steering.angular, dt)
    super.applyDrag(this.drag)

    this.mesh.position.copyFrom(this._position)
    this.mesh.rotation.set(0, this._orientation, 0)
  }
}

const forward = new BABYLON.Vector3(0, 0, 1)
