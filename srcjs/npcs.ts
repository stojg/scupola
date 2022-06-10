import * as BABYLON from '@babylonjs/core'
import NPC from './core/npc'
import { MultiplayerClientAvatar } from '@cryptovoxels/multiplayer-client/dist/cjs/internal/io/MultiplayerClientInput'

export class NPCList {
  private readonly list: NPC[] = []
  private readonly scene: BABYLON.Scene

  constructor(scene: BABYLON.Scene) {
    this.scene = scene
  }

  create(position: BABYLON.Vector3, rotation: number) {
    const b = createBox(this.scene, position, [0.98, 0.97, 0.91], [0.43, 1.62, 0.3], true)
    b.isPickable = false
    b.rotation.y = BABYLON.Scalar.NormalizeRadians(rotation)
    const n = new NPC(b, this.scene, { maxSpeed: 2, maxAcceleration: 10 })
    this.list.push(n)
  }

  get(idx: number) {
    return this.list[idx]
  }

  all() {
    return this.list
  }

  getSendCallback(idx: number): any {
    const position = this.list[idx].mesh.position
    const orientation = () => this.list[idx].mesh.rotationQuaternion || this.list[idx].mesh.rotation.toQuaternion()
    return (): MultiplayerClientAvatar => {
      const animationCode = this.list[idx].velocity.length() > 0.5 ? 2 : 13
      return {
        animationCode: animationCode,
        position: [position.x, position.y, position.z],
        orientation: [orientation().x, orientation().y, orientation().z, orientation().w],
      }
    }
  }

  forEach(callbackfn: (value: NPC, index: number, array: NPC[]) => void) {
    this.list.forEach((v, i, array) => callbackfn(v, i, array))
  }
}

let boxCounter = 0
function createBox(
  scene: BABYLON.Scene,
  pos: BABYLON.Vector3,
  colour: number[],
  size: [number, number, number],
  face: boolean = false
) {
  const mat = new BABYLON.StandardMaterial('box{sphereCounter}', scene)
  mat.diffuseColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
  mat.ambientColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
  mat.alpha = 1.0
  const faceColors = []
  for (let i = 0; i < 6; i++) {
    faceColors.push(BABYLON.Color4.FromArray([...colour, 0]))
  }
  if (face) {
    faceColors[0] = new BABYLON.Color4(0.9, 0, 0, 1) // red front
  }

  const options = { width: size[0], height: size[1], depth: size[2], faceColors }

  const s = BABYLON.MeshBuilder.CreateBox(`box${boxCounter}`, options, scene)
  s.position.copyFrom(pos)
  s.material = mat
  boxCounter += 1
  return s
}
