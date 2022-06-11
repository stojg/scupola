import * as BABYLON from '@babylonjs/core'

export function Island(scene: BABYLON.Scene, offset: [number, number], options: { width: number; height: number }) {
  const ground = BABYLON.MeshBuilder.CreateGround('ground', options, scene)
  ground.position.x = offset[0]
  ground.position.y = 1.6
  ground.position.z = offset[1]
  ground.receiveShadows = true
  ground.freezeWorldMatrix()
  const matg = new BABYLON.StandardMaterial('island', scene)
  matg.freeze()
  const gridTexture = new BABYLON.Texture('./grid.png', scene)
  gridTexture.vScale = options.width
  gridTexture.uScale = options.height
  matg.diffuseTexture = gridTexture
  matg.specularColor.set(0, 0, 0)
  ground.material = matg
}
