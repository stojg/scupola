import * as BABYLON from '@babylonjs/core'

interface ParcelData {
  id: number
  geometry: any
  height: number
  visible: boolean
  x1: number
  x2: number
  y1: number
  y2: number
  z1: number
  z2: number
}

export default class Parcel implements ParcelData {
  id: number
  geometry: any
  height: number
  visible: boolean
  x1: number
  x2: number
  y1: number
  y2: number
  z1: number
  z2: number

  private _mesh: BABYLON.Mesh

  constructor(protected scene: BABYLON.Scene, data: ParcelData) {
    this.id = data.id
    this.geometry = data.geometry
    this.height = data.height
    this.visible = data.visible
    this.x1 = data.x1
    this.x2 = data.x2
    this.y1 = data.y1
    this.y2 = data.y2
    this.z1 = data.z1
    this.z2 = data.z2

    const options = {
      width: this.x2 - this.x1,
      depth: this.y2 - this.y1,
      height: this.z2 - this.z1,
      updatable: false,
    }
    const nudge = 0.25
    this._mesh = BABYLON.MeshBuilder.CreateBox(`parcel-${this.id}`, options, this.scene)
    this._mesh.position.set(
      nudge + this.x1 + options.width / 2,
      this.y1 + options.height / 2,
      nudge + this.z1 + options.depth / 2
    )
    const material = new BABYLON.StandardMaterial(`parcel-${this.id}`)
    material.alpha = 0.25
    this._mesh.material = material
    this._mesh.addLODLevel(1000, null)
    this._mesh.visibility = 0
  }

  hide() {
    this._mesh.visibility = 0
  }

  show() {
    this._mesh.visibility = 1
  }

  get mesh(): BABYLON.Mesh {
    return this._mesh
  }
}
