import * as BABYLON from '@babylonjs/core'
import { World } from './world'
import { Cameras } from './core/cameras'
import { Island } from './island'
import Parcel from './core/parcel'
import NPC from './npc'

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

class App {
  engine: BABYLON.Engine

  scene: BABYLON.Scene
  parcels: any[]
  constructor() {
    // create the canvas html element and attach it to the webpage
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.id = 'gameCanvas'
    document.body.appendChild(canvas)

    // initialize babylon scene and engine
    this.engine = new BABYLON.Engine(canvas, true)
    this.scene = new BABYLON.Scene(this.engine)
    World(this.engine, this.scene, canvas)

    window.addEventListener('keydown', (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (this.scene.debugLayer.isVisible()) {
          this.scene.debugLayer.hide()
        } else {
          import(/* webpackChunkName: "debug" */ '@babylonjs/core/Debug/debugLayer').then((debug) => {
            return import(/* webpackChunkName: "inspector" */ '@babylonjs/inspector').then((inspector) => {
              return import(/* webpackChunkName: "loader" */ '@babylonjs/loaders/glTF').then((inspector) => {
                this.scene.debugLayer.show()
              })
            })
          })
        }
      }
    })

    //resize if the screen is resized/rotated
    window.addEventListener('resize', () => {
      this.engine.resize()
    })
  }

  loadParcels(parcels: ParcelData[]) {
    this.parcels = []
    parcels.forEach((data) => {
      const p = new Parcel(this.scene, data)
      this.parcels.push(p)
      p.show()
    })
  }

  loadIslands() {
    Island(this.scene, [4200, 0], { width: 128, height: 128 })
  }

  loadNPCs() {
    const npc = new NPC(this.scene, [4200, 0], this.parcels)
    const list = npc.list()
    // Cameras.rotate(scene, canvas)

    Cameras.follow(this.scene, list.get(0).mesh)
  }

  start() {
    // run the main render loop
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })
  }
}
const app = new App()

getParcelData().then((content) => {
  if (content.success) {
    app.loadParcels(content.parcels)
  } else {
    console.error('parcels didnt load')
  }
  app.loadIslands()
  app.loadNPCs()
  app.start()
})

function getParcelData() {
  const URL = 'https://www.cryptovoxels.com/api/parcels.json'
  return fetch(URL).then((response) => response.json())
}
