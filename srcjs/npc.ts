import * as BABYLON from '@babylonjs/core'
import { NPCList } from './core/npcs'
import { AvatarList } from './avatars'
import { createClient } from './core/client'
import { Blended } from './steering/blended'
import { CollisionAvoidance } from './steering/collisionAvoidance'
import { Attract } from './steering/attract'
import { Separation } from './steering/separation'
import { Cohesion } from './steering/cohesion'
import { GroupVelocityMatch } from './steering/groupVelocityMatch'
import { LookWhereGoing } from './steering/lookWhereGoing'
import { Wander } from './steering/wander'
import { Idle } from './steering/idle'
import Parcel from './core/parcel'
import { ObstacleAvoidance } from './steering/obstacleAvoidance'

const FLOOR_HEIGHT = 2.348

export default class NPC {
  protected _list: NPCList
  protected _parcels: Parcel[] = []
  protected _obstacles: BABYLON.Mesh[] = []

  constructor(scene: BABYLON.Scene, offset: number[], parcels: Parcel[]) {
    this._parcels = parcels
    this._parcels.forEach((p) => this._obstacles.push(p.mesh))
    this._list = new NPCList(scene)
    for (let i = 0; i < 100; i++) {
      const rad = 4
      this._list.create(
        new BABYLON.Vector3(
          (Math.random() - 0.5) * rad + offset[0],
          FLOOR_HEIGHT,
          (Math.random() - 0.5) * rad + offset[1]
        ),
        Math.random() * Math.PI * 2
      )
    }

    const avatars = new AvatarList(scene)

    // connect NPCs with the MP server
    this._list.forEach((npc, idx) => {
      avatars.ignoreUpdatesFor(npc.uuid)
      const client = createClient(npc.uuid, this._list.getSendCallback(idx), avatars.handleMessage.bind(avatars))
      client.connect()
    })

    scene.onAfterRenderObservable.add(() => {
      const entities = [...this._list.all(), ...avatars.all()]
      this._list.forEach((npc) => {
        npc.clearPriorityGroup()
        npc.addPriorityGroup(0, [Blended.create(1, new ObstacleAvoidance(npc, this._obstacles, 0.5))])
        npc.addPriorityGroup(1, [Blended.create(1, new CollisionAvoidance(npc, entities, 0.6, 1))])
        npc.addPriorityGroup(2, [
          Blended.create(1, new Attract(npc, { position: new BABYLON.Vector3(4200, 0, 0) }, 64)),
        ])

        npc.addPriorityGroup(3, [
          Blended.create(0.5, new Separation(npc, this._list.all(), 0.5, 1)),
          Blended.create(0.3, new Cohesion(npc, this._list.all(), 2)),
          Blended.create(0.2, new GroupVelocityMatch(npc, this._list.all())),
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
  }

  list() {
    return this._list
  }
}
