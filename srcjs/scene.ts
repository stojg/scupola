import * as BABYLON from '@babylonjs/core'

export const Scene = (engine: BABYLON.Engine, canvas: HTMLCanvasElement) => {
  const scene = new BABYLON.Scene(engine)
  const camera: BABYLON.ArcRotateCamera = new BABYLON.ArcRotateCamera('Camera', -Math.PI / 2, Math.PI / 3, 4, BABYLON.Vector3.Zero(), scene)
  camera.attachControl(canvas, true)
  const light = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(1, 1, 1), scene)
  light.intensity = 1.0
  const sphere = (pos: BABYLON.Vector3, colour: number[], size = 0.1) => {
    const s = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: size }, scene)
    s.position = pos
    const mat = new BABYLON.StandardMaterial('mat', scene)
    mat.diffuseColor = new BABYLON.Color3(colour[0], colour[1], colour[2])
    s.material = mat
    return s
  }

  const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 5, height: 5 }, scene)
  const matg = new BABYLON.StandardMaterial('mat', scene)
  matg.diffuseColor.set(0.98, 0.97, 0.83)
  matg.specularColor.set(0, 0, 0)
  ground.material = matg

  const box = BABYLON.MeshBuilder.CreateBox('box', { width: 0.5, height: 0.5, depth: 0.5 })
  box.material = new BABYLON.StandardMaterial('mat', scene)
  // box.material.alpha = 0.9
  box.showBoundingBox = true
  box.position.set(0.5, 1.0, 0.0)
  box.scaling.set(1.1, 0.9, 1.4)

  const origin = sphere(new BABYLON.Vector3(0, 0, 0), [0.97, 0.54, 0.88], 0.04)
  // shows where on the box the closes point is
  const closestMarker = sphere(BABYLON.Vector3.Zero(), [0.97, 0.54, 0.88], 0.05)
  const lowestMarker = sphere(BABYLON.Vector3.Zero(), [0.97, 0.54, 0.88], 0.05)
  const groundMarker = sphere(BABYLON.Vector3.Zero(), [0.97, 0.54, 0.88], 0.04)

  const options = {
    points: [origin.position.clone(), new BABYLON.Vector3(0, 1, 1)],
    updatable: true,
    instance: null as any,
  }
  let closestsLines = BABYLON.MeshBuilder.CreateLines('lines', options)
  closestsLines.color = new BABYLON.Color3(0.97, 0.54, 0.88)
  const options2 = {
    points: [origin.position.clone(), new BABYLON.Vector3(0, 1, 1)],
    updatable: true,
    instance: null as any,
  }
  let lowestLines = BABYLON.MeshBuilder.CreateLines('lines', options2)
  lowestLines.color = new BABYLON.Color3(0.97, 0.54, 0.88)

  const closestPointToOBB = (point: BABYLON.Vector3, box: BABYLON.BoundingBox, result: BABYLON.Vector3) => {
    // this is half the width of the box
    const halfWidths = box.extendSize.asArray()
    // translate the point into the local space of the box,
    const d = point.subtract(box.centerWorld)
    // start result at centre of box, make steps from there
    result.copyFrom(box.centerWorld)

    for (let i = 0; i < 3; i++) {
      let dist = BABYLON.Vector3.Dot(d, box.directions[i])
      // clamp to the extend of the bounding box
      if (dist > halfWidths[i]) {
        dist = halfWidths[i]
      } else if (dist < -halfWidths[i]) {
        dist = -halfWidths[i]
      }
      result.addInPlace(box.directions[i].scale(dist))
    }
  }

  const lowestCorner = (box: BABYLON.BoundingBox, result: BABYLON.Vector3) => {
    result.setAll(Infinity)
    for (let i = 0; i < box.vectorsWorld.length - 1; i++) {
      if (box.vectorsWorld[i].y < result.y) {
        result.copyFrom(box.vectorsWorld[i])
      }
    }
  }

  let t = 0
  scene.onBeforeRenderObservable.add(() => {
    box.rotate(new BABYLON.Vector3(Math.sin(t), 0.5, Math.cos(t)), 0.02)
    t = +1
  })

  scene.onAfterRenderObservable.add(() => {
    const closestPoint = BABYLON.Vector3.Zero()
    closestPointToOBB(origin.position, box.getBoundingInfo().boundingBox, closestPoint)
    closestMarker.position.copyFrom(closestPoint)
    options.points[1].copyFrom(closestPoint)
    options.instance = closestsLines
    closestsLines = BABYLON.MeshBuilder.CreateLines('lines1', options)
    // const dist = BABYLON.Vector3.Distance(closestPoint, point.position)
    // console.log(`distance to box from point is ${dist.toFixed(2)}`)

    lowestCorner(box.getBoundingInfo().boundingBox, lowestMarker.position)

    const ray = new BABYLON.Ray(lowestMarker.position, BABYLON.Vector3.FromArray([0, -1, 0]))
    const p = ray.intersectsMesh(ground, true)
    groundMarker.position.copyFrom(p.pickedPoint)
    options2.points[0].copyFrom(groundMarker.position)
    options2.points[1].copyFrom(lowestMarker.position)
    options2.instance = lowestLines
    lowestLines = BABYLON.MeshBuilder.CreateLines('lines2', options2)
    // console.log(`distance to collider below is ${p.distance.toFixed(2)} and it is ${p.pickedMesh.name}`)
    // })
  })
  return scene
}
