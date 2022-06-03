import * as BABYLON from '@babylonjs/core'
import SteeringVehicle from './steering'

export const Scene = (engine: BABYLON.Engine, canvas: HTMLCanvasElement) => {
  const scene = new BABYLON.Scene(engine)

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

  const obstacles: BABYLON.Mesh[] = []
  const width = 10
  const zOffset = 40
  obstacles.push(
    createBox(scene, BABYLON.Vector3.FromArray([width / 2, 1, 0 + zOffset]), [0.5, 0.6, 0.7], [0.5, 2, width])
  )
  obstacles.push(
    createBox(scene, BABYLON.Vector3.FromArray([-width / 2, 1, 0 + zOffset]), [0.5, 0.6, 0.7], [0.5, 2, width])
  )
  obstacles.push(
    createBox(scene, BABYLON.Vector3.FromArray([0, 1, width / 2 + zOffset]), [0.5, 0.6, 0.7], [width, 2, 0.5])
  )
  obstacles.push(
    createBox(scene, BABYLON.Vector3.FromArray([0, 1, -width / 2 + zOffset]), [0.5, 0.6, 0.7], [width, 2, 0.5])
  )

  for (let i = 0; i < 1000; i++) {
    const radius = 1000
    const o = createBox(
      scene,
      new BABYLON.Vector3((Math.random() - 0.5) * radius, 0.5, (Math.random() - 0.5) * radius),
      [0.7, 0.8, 0.9],
      [1, 3, 1],
      false
    )
    obstacles.push(o)
  }

  const NPCs: SteeringVehicle[] = []
  const entities: SteeringVehicle[] = []
  for (let i = 0; i < 100; i++) {
    const rad = 40
    const b = createBox(
      scene,
      BABYLON.Vector3.FromArray([Math.random() * rad, 0.8, Math.random() * rad]),
      [0.98, 0.97, 0.91],
      [0.5, 1.6, 0.3],
      true
    )
    b.isPickable = false
    b.rotation.y = Math.random() * 2 * Math.PI
    shadowGenerator.getShadowMap().renderList.push(b)
    const n = new SteeringVehicle(b, scene, { maxSpeed: 3, maxAcceleration: 5 })
    NPCs.push(n)
    entities.push(n)
  }

  obstacles.forEach((w) => (w.isPickable = true))
  // const hunter = createBox(scene, BABYLON.Vector3.FromArray([20, 0.8, -10]), [0.7, 0.8, 0.9], [0.5, 1.6, 0.3])
  // // const hunterNPC = new SteeringVehicle(hunter, scene, { maxSpeed: 12.27, maxAcceleration: 9.5 })
  // const hunterNPC = new SteeringVehicle(hunter, scene, { maxSpeed: 12.27 * 2, maxAcceleration: 40 })
  // const pray = createBox(scene, BABYLON.Vector3.FromArray([-20, 0.5, 20]), [0.7, 0.8, 0.9], [1, 1, 1])
  // const prayNPC = new SteeringVehicle(pray, scene, { maxSpeed: 12.27, maxAcceleration: 9.5 })
  //
  // const left = createBox(scene, BABYLON.Vector3.FromArray([0, 0.5, 5.2]), [0.7, 0.9, 0.8], [1, 1, 1])
  // const leftNPC = new SteeringVehicle(left, scene, { maxSpeed: 1 })
  // const right = createBox(scene, BABYLON.Vector3.FromArray([10, 0.5, 4.8]), [0.9, 0.8, 0.7], [1, 1, 1])
  // const rightNPC = new SteeringVehicle(right, scene, { maxSpeed: 1 })

  // const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
  //   'Camera',
  //   -Math.PI / 3,
  //   Math.PI / 3,
  //   50,
  //   BABYLON.Vector3.Zero(),
  //   scene
  // )
  // camera.attachControl(canvas, true)
  const camera = new BABYLON.FollowCamera('Camera', new BABYLON.Vector3(0, 10, -10), scene, NPCs[1].mesh)
  camera.radius = 20
  camera.lowerHeightOffsetLimit = 10
  camera.rotationOffset = 180
  camera.attachControl(true)

  scene.onBeforeRenderObservable.add(() => {
    for (const i in NPCs) {
      const data = NPCs[i]
        .obstacleAvoidance(obstacles, 3, 25, { weight: 2 })
        .collisionAvoidance(entities, 0.5, 1, { weight: 0.4 })
        .separation(NPCs, 0.75, 1, { weight: 0.5 })
        .cohesion(NPCs, 60, { weight: 0.3 })
        .groupVelocityMatch(NPCs, 5, 0.4, { weight: 0.2 })
        .wander(3.14, 3, 6, { weight: 0.1 })
        .lookWhereGoing()
        .animate('blend')
      set(NPCs[i].mesh, data)
    }
    // set(
    //   hunterNPC.mesh,
    //   hunterNPC
    //     .pursue(prayNPC)
    //     .collisionAvoidance([...NPCs, leftNPC, rightNPC, hunterNPC], 0.5)
    //     .lookWhereGoing()
    //     .animate('blend')
    // )
    // set(prayNPC.mesh, prayNPC.wander(0.2, 10, 30).collisionAvoidance(all, 1).lookWhereGoing().animate('blend'))

    // set(leftNPC.mesh, leftNPC.applyAcceleration(new BABYLON.Vector3(1, 0, 0)).collisionAvoidance(all, 1).animate('priority'))
    // set(rightNPC.mesh, rightNPC.collisionAvoidance(all, 1).animate('priority'))
  })
  return scene
}

function set(mesh: Readonly<BABYLON.AbstractMesh>, data: { position: BABYLON.Vector3; orientation: number }) {
  mesh.position.x = data.position.x
  mesh.position.z = data.position.z
  mesh.rotation.set(0, data.orientation, 0)
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
const createBox = (
  scene: BABYLON.Scene,
  pos: BABYLON.Vector3,
  colour: number[],
  size: [number, number, number],
  face: boolean = false
) => {
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

  const s = BABYLON.MeshBuilder.CreateBox(`box${sphereCounter}`, options, scene)
  s.position.copyFrom(pos)
  s.material = mat
  boxCounter += 1
  return s
}
