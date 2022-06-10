import * as BABYLON from '@babylonjs/core'

export namespace Cameras {
  export const rotate = (scene, canvas) => {
    const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera(
      'Camera',
      -Math.PI / 3,
      Math.PI / 3,
      50,
      BABYLON.Vector3.Zero(),
      scene
    )
    camera.attachControl(canvas, true)
    return camera
  }

  export const follow = (scene, mesh) => {
    const camera = new BABYLON.FollowCamera('Camera', new BABYLON.Vector3(0, 10, -10), scene, mesh)
    camera.radius = 40
    camera.lowerHeightOffsetLimit = 10
    camera.rotationOffset = 180
    camera.attachControl(true)
    return camera
  }
}
