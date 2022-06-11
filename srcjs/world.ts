import * as BABYLON from '@babylonjs/core'

export const World = (engine: BABYLON.Engine, scene: BABYLON.Scene, canvas: HTMLCanvasElement) => {
  const hemi = new BABYLON.HemisphericLight('HemiLight', new BABYLON.Vector3(0, 1, 0), scene)
  hemi.intensity = 0.4

  const light = new BABYLON.DirectionalLight('dir01', new BABYLON.Vector3(-1, -2, -1), scene)
  light.position = new BABYLON.Vector3(20, 40, 20)
  light.intensity = 0.6

  const shadowGenerator = new BABYLON.ShadowGenerator(4096, light)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.useKernelBlur = true
  shadowGenerator.blurKernel = 64
}
