import * as BABYLON from '@babylonjs/core'
import { Scene } from './scene'

class App {
  constructor() {
    // create the canvas html element and attach it to the webpage
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.id = 'gameCanvas'
    document.body.appendChild(canvas)

    // initialize babylon scene and engine
    const engine = new BABYLON.Engine(canvas, true)

    const scene = Scene(engine, canvas)

    window.addEventListener('keydown', (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide()
        } else {
          import(/* webpackChunkName: "debug" */ '@babylonjs/core/Debug/debugLayer').then((debug) => {
            return import(/* webpackChunkName: "inspector" */ '@babylonjs/inspector').then((inspector) => {
              return import(/* webpackChunkName: "loader" */ '@babylonjs/loaders/glTF').then((inspector) => {
                scene.debugLayer.show()
              })
            })
          })
        }
      }
    })

    // run the main render loop
    engine.runRenderLoop(() => {
      scene.render()
    })

    //resize if the screen is resized/rotated
    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
}
new App()
