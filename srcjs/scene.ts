import * as BABYLON from '@babylonjs/core'
import SteeringVehicle from './steering'

export const Scene = (engine: BABYLON.Engine, canvas: HTMLCanvasElement) => {
  const scene = new BABYLON.Scene(engine)
  const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 3, Math.PI / 3, 50, BABYLON.Vector3.Zero(), scene)
  camera.attachControl(canvas, true)

  const hemi = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 1, 0), scene)
  hemi.intensity = 0.4

  const light = new BABYLON.DirectionalLight('dir01', new BABYLON.Vector3(-1, -2, -1), scene)
  light.position = new BABYLON.Vector3(20, 40, 20)
  light.intensity = 0.6

  const shadowGenerator = new BABYLON.ShadowGenerator(4096, light)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.useKernelBlur = true
  shadowGenerator.blurKernel = 64

  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 1000, height: 1000 }, scene)
  ground.receiveShadows = true
  ground.freezeWorldMatrix()
  const matg = new BABYLON.StandardMaterial('ground', scene)
  matg.freeze()
  const gridTexture = new BABYLON.Texture('./grid.png', scene)
  gridTexture.vScale = gridTexture.uScale = 1000
  matg.diffuseTexture = gridTexture

  matg.specularColor.set(0, 0, 0)
  ground.material = matg

  const walls: BABYLON.Mesh[] = []
  const width = 250
  walls.push(createBox(scene, BABYLON.Vector3.FromArray([width / 2, 1, 0]), [0.5, 0.6, 0.7], [0.5, 2, width]))
  walls.push(createBox(scene, BABYLON.Vector3.FromArray([-width / 2, 1, 0]), [0.5, 0.6, 0.7], [0.5, 2, width]))
  walls.push(createBox(scene, BABYLON.Vector3.FromArray([0, 1, width / 2]), [0.5, 0.6, 0.7], [width, 2, 0.5]))
  walls.push(createBox(scene, BABYLON.Vector3.FromArray([0, 1, -width / 2]), [0.5, 0.6, 0.7], [width, 2, 0.5]))
  walls.forEach((w) => (w.isPickable = true))

  const NPCs: SteeringVehicle[] = []
  for (let i = 0; i < 100; i++) {
    const b = createBox(scene, BABYLON.Vector3.FromArray([Math.random() * 10, 0.8, Math.random() * 10]), [0.98, 0.97, 0.91], [0.5, 1.6, 0.3])
    b.isPickable = false
    b.rotation.y = Math.random() * 2 * Math.PI

    shadowGenerator.getShadowMap().renderList.push(b)
    NPCs.push(new SteeringVehicle(b, scene))
  }
  const debugBox = createBox(scene, BABYLON.Vector3.FromArray([0, 0.8, 0]), [0.98, 0.97, 0.91], [0.5, 1.6, 0.3])
  debugBox.name = 'debugbox'
  shadowGenerator.getShadowMap().renderList.push(debugBox)
  const debugNPC = new SteeringVehicle(debugBox, scene, { maxSpeed: 12.27, maxAcceleration: 9.5 })

  const sph1 = createBox(scene, BABYLON.Vector3.FromArray([-15, 0.5, 15]), [0.7, 0.8, 0.9], [1, 1, 1])
  sph1.name = 'sph1'
  shadowGenerator.getShadowMap().renderList.push(sph1)
  const npc2 = new SteeringVehicle(sph1, scene, { maxSpeed: 12.27, maxAcceleration: 9.5 })

  scene.onBeforeRenderObservable.add(() => {
    const data = debugNPC.pursue(npc2).lookWhereGoing().animate('blend')
    debugNPC.mesh.position.copyFrom(data.position)
    debugNPC.mesh.rotation.set(0, data.orientation, 0)
    const d = npc2.wander(0.2, 10, 30).lookWhereGoing().animate('blend')
    npc2.mesh.position.copyFrom(d.position)
    npc2.mesh.rotation.set(0, d.orientation, 0)

    for (const i in NPCs) {
      const data = NPCs[i]
        // .wander()
        .separation(NPCs)
        // .collisionAvoidance([...NPCs])
        .lookWhereGoing()

        .animate('blend')
      NPCs[i].mesh.position.copyFrom(data.position)
      NPCs[i].mesh.rotation.set(0, data.orientation, 0)
    }
  })

  return scene
}

let sphereCounter = 0
const createSphere = (scene: BABYLON.Scene, pos: BABYLON.Vector3, colour: number[], size = 0.1) => {
  const mat = new BABYLON.StandardMaterial('sphere${sphereCounter}', scene)
  mat.diffuseColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
  const s = BABYLON.MeshBuilder.CreateSphere(`sphere${sphereCounter}`, { diameter: size }, scene)
  s.position.copyFrom(pos)
  s.material = mat
  sphereCounter += 1
  return s
}

let boxCounter = 0
const createBox = (scene: BABYLON.Scene, pos: BABYLON.Vector3, colour: number[], size: [number, number, number]) => {
  const mat = new BABYLON.StandardMaterial('box{sphereCounter}', scene)
  mat.diffuseColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
  mat.ambientColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
  const faceColors = []
  for (let i = 0; i < 6; i++) {
    faceColors.push(BABYLON.Color4.FromArray([...colour, 0]))
  }
  faceColors[0] = new BABYLON.Color4(0.9, 0, 0, 1) // red front

  const options = { width: size[0], height: size[1], depth: size[2], faceColors }

  const s = BABYLON.MeshBuilder.CreateBox(`box${sphereCounter}`, options, scene)
  s.position.copyFrom(pos)
  s.material = mat
  boxCounter += 1
  return s
}
