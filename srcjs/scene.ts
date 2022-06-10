import * as BABYLON from '@babylonjs/core'
import { createClient } from './client'
import { AvatarList } from './avatars'
import { Cameras } from './cameras'
import { NPCList } from './npcs'
import { LookWhereGoing } from './steering/lookWhereGoing'
import { Wander } from './steering/wander'
import { Separation } from './steering/separation'
import { Blended } from './steering/blended'
import { Cohesion } from './steering/cohesion'
import { GroupVelocityMatch } from './steering/groupVelocityMatch'
import { Idle } from './steering/idle'
import { Attract } from './steering/attract'
import { CollisionAvoidance } from './steering/collisionAvoidance'

const FLOOR_HEIGHT = 2.348

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

  // const offset = [3500, -1750]
  const offset = [4200, 0]

  const groundOptions = { width: 128, height: 128 }
  const ground = BABYLON.MeshBuilder.CreateGround('ground', groundOptions, scene)
  ground.position.x = offset[0]
  ground.position.y = 1.6
  ground.position.z = offset[1]
  ground.receiveShadows = true
  ground.freezeWorldMatrix()
  const matg = new BABYLON.StandardMaterial('ground', scene)
  matg.freeze()
  const gridTexture = new BABYLON.Texture('./grid.png', scene)
  gridTexture.vScale = groundOptions.width
  gridTexture.uScale = groundOptions.height

  matg.diffuseTexture = gridTexture

  matg.specularColor.set(0, 0, 0)
  ground.material = matg

  const npcList = new NPCList(scene)

  for (let i = 0; i < 100; i++) {
    const rad = 4
    npcList.create(
      new BABYLON.Vector3(
        (Math.random() - 0.5) * rad + offset[0],
        FLOOR_HEIGHT,
        (Math.random() - 0.5) * rad + offset[1]
      ),
      Math.random() * Math.PI * 2
    )
  }

  // Cameras.rotate(scene, canvas)
  Cameras.follow(scene, npcList.get(0).mesh)

  const avatars = new AvatarList(scene)

  // connect NPCs with the MP server
  npcList.forEach((npc, idx) => {
    avatars.ignoreUpdatesFor(npc.uuid)
    const client = createClient(npc.uuid, npcList.getSendCallback(idx), avatars.handleMessage.bind(avatars))
    client.connect()
  })

  scene.onAfterRenderObservable.add(() => {
    const entities = [...npcList.all(), ...avatars.all()]
    npcList.forEach((npc) => {
      npc.clearPriorityGroup()
      npc.addPriorityGroup(0, [Blended.create(1, new CollisionAvoidance(npc, entities, 0.6, 1))])
      npc.addPriorityGroup(1, [Blended.create(1, new Attract(npc, { position: new BABYLON.Vector3(4200, 0, 0) }, 64))])
      npc.addPriorityGroup(2, [
        Blended.create(0.5, new Separation(npc, npcList.all(), 0.5, 1)),
        Blended.create(0.3, new Cohesion(npc, npcList.all(), 2)),
        Blended.create(0.2, new GroupVelocityMatch(npc, npcList.all())),
        Blended.create(1, new LookWhereGoing(npc)),
      ])
      // const target = avatars.find('stojg')
      // if (target) {
      // npc.addPriorityGroup(3, [Blended.create(1, new Arrive(npc, target, 10, 6, 3))])
      // }
      npc.addPriorityGroup(5, [Blended.create(1, new Wander(npc))])
      npc.addPriorityGroup(10, [Blended.create(1, new Idle(npc))])
      npc.steer()
    })
  })
  return scene
}
