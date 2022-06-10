import * as BABYLON from '@babylonjs/core'
import * as messages from '@cryptovoxels/messages'
import { Entity } from './core/entity'

class Avatar extends Entity {
  private _rotationQuaternion: BABYLON.Quaternion = BABYLON.Quaternion.Zero()
  animation: number = 0
  ts: number = Date.now()
  mesh: BABYLON.Mesh
  material: BABYLON.StandardMaterial

  constructor(public readonly uuid, public readonly wallet, public readonly name, protected scene) {
    super(BABYLON.Vector3.Zero(), 0, 1000, 1000)

    this.material = new BABYLON.StandardMaterial(`${name}-${uuid}`, scene)
    this.material.diffuseColor = new BABYLON.Color3(0.91, 0.91, 0.98)
    this.material.ambientColor = new BABYLON.Color3(0.91, 0.91, 0.98)
    this.material.alpha = 0.5

    const faceColors = []
    for (let i = 0; i < 6; i++) {
      faceColors.push(BABYLON.Color4.FromArray([0.91, 0.91, 0.98, 0]))
    }
    faceColors[0] = new BABYLON.Color4(0.0, 0, 0.9, 1)

    const size = [0.43, 1.62, 0.3]
    const options = { width: size[0], height: size[1], depth: size[2], faceColors }

    this.mesh = BABYLON.MeshBuilder.CreateBox(`${name}-${uuid}`, options, scene)
    this.mesh.position.y = 2.348
    this.mesh.material = this.material
    this.material.freeze()
  }

  update(position, orientation, animation) {
    const now = Date.now()
    const dt = now - this.ts
    // @hack, because each client tries to update an avatar each per connected client
    if (dt < 10) {
      return
    }
    this.calcVelocity(position, dt)
    this._position.set(position[0], position[1], position[2])
    this._rotationQuaternion.copyFromFloats(orientation[0], orientation[1], orientation[2], orientation[3])
    this._orientation = this._rotationQuaternion.toEulerAngles().y
    this.animation = animation
    this.ts = now

    this.mesh.position.copyFrom(this._position)
    if (this.mesh.rotationQuaternion) {
      this.mesh.rotationQuaternion.copyFrom(this._rotationQuaternion)
    } else {
      this.mesh.rotationQuaternion = this._rotationQuaternion
      this.material.alpha = 1.0
    }
  }

  calcVelocity(newPosition: BABYLON.Vector3, dt: number) {
    const velocity = this._position.subtractFromFloats(newPosition[0], newPosition[1], newPosition[2])
    velocity.scaleInPlace(1000 / dt).negateInPlace()
    this._velocity = velocity
  }

  dispose() {
    this.mesh.dispose(false, true)
  }
}

export class AvatarList {
  avatars: Record<string, Avatar> = {}
  ignoreUUIDs: string[] = []

  constructor(protected scene: BABYLON.Scene) {}

  ignoreUpdatesFor(uuid: string) {
    this.ignoreUUIDs.push(uuid)
  }

  add = (msg: messages.CreateAvatarMessage) => {
    if (this.ignoreUUIDs.includes(msg.uuid) || this.avatars[msg.uuid]) {
      return
    }
    this.avatars[msg.uuid] = new Avatar(msg.uuid, msg.description?.wallet, msg.description?.name, this.scene)
  }

  update = (msg: messages.UpdateAvatarMessage) => {
    if (this.ignoreUUIDs.includes(msg.uuid) || !this.avatars[msg.uuid]) {
      return
    }
    this.avatars[msg.uuid].update(msg.position, msg.orientation, msg.animation)
  }

  find(name: string): Avatar {
    for (let uuid in this.avatars) {
      if (this.avatars[uuid].name && this.avatars[uuid].name.toLowerCase() === name.toLowerCase()) {
        return this.avatars[uuid]
      }
    }
    return null
  }

  destroy = (msg: messages.DestroyAvatarMessage) => {
    if (this.avatars[msg.uuid]) {
      this.avatars[msg.uuid].dispose()
      delete this.avatars[msg.uuid]
    }
  }

  handleMessage(msg: messages.Message.ServerStateMessage) {
    switch (msg.type) {
      case messages.MessageType.join:
        msg.createAvatars.forEach((m) => this.add(m))
        msg.avatars.forEach((m) => this.update(m))
        break
      case messages.MessageType.createAvatar:
        this.add(msg)
        break
      case messages.MessageType.worldState:
        msg.avatars.filter((m) => !this.ignoreUUIDs.includes(m.uuid)).forEach((a) => this.update(a))
        break
      case messages.MessageType.destroyAvatar:
        this.destroy(msg)
        break
    }
  }

  all(): Avatar[] {
    const a: Avatar[] = []
    for (const aElement in this.avatars) {
      a.push(this.avatars[aElement])
    }
    return a
  }
}
