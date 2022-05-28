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
  const matg = new BABYLON.StandardMaterial('ground', scene)
  matg.diffuseColor.set(0.7, 0.7, 0.7)
  matg.specularColor.set(0, 0, 0)
  ground.material = matg

  const NPCs: SteeringVehicle[] = []

  for (let i = 0; i < 100; i++) {
    const b = createBox(scene, BABYLON.Vector3.FromArray([Math.random() * 10, 0.8, Math.random() * 10]), [0.98, 0.97, 0.91], [0.5, 1.6, 0.3])
    shadowGenerator.getShadowMap().renderList.push(b)
    NPCs.push(new SteeringVehicle(b, scene))
  }

  // const box1 = createBox(scene, BABYLON.Vector3.FromArray([0.1, 0.8, 10]), [0.98, 0.97, 0.91], [0.5, 1.6, 0.3])
  // shadowGenerator.getShadowMap().renderList.push(box1)
  // const npc1 = new SteeringVehicle(box1, scene, { maxSpeed: 0.01 })
  //
  // const box2 = createBox(scene, BABYLON.Vector3.FromArray([0, 0.8, -10]), [0.0, 0.0, 0.0], [0.5, 1.6, 0.3])
  // shadowGenerator.getShadowMap().renderList.push(box1)
  // const npc2 = new SteeringVehicle(box2, scene, { maxSpeed: 0.01 })

  const sph1 = createSphere(scene, BABYLON.Vector3.FromArray([5, 0.5, 5]), [1, 1, 1], 1)
  shadowGenerator.getShadowMap().renderList.push(sph1)
  const npc2 = new SteeringVehicle(sph1, scene)

  scene.onBeforeRenderObservable.add(() => {
    // const v1 = npc1.applyForce(new BABYLON.Vector3(0, 0, -0.1)).collisionAvoidance([npc2]).lookWhereGoing(true).animate('priority')
    // npc1.mesh.moveWithCollisions(v1)
    // const v2 = npc2.applyForce(new BABYLON.Vector3(0, 0, 0.1)).lookWhereGoing(true).animate('priority')
    // npc2.mesh.moveWithCollisions(v2)

    for (const i in NPCs) {
      const velocity = NPCs[i]
        .idle()
        .wander()
        .separation(NPCs)
        .collisionAvoidance([...NPCs, npc2])
        .animate('blend')
      NPCs[i].mesh.moveWithCollisions(velocity)
    }
    const vel2 = npc2.idle().animate('priority')
    sph1.moveWithCollisions(vel2)
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
