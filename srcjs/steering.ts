import * as BABYLON from '@babylonjs/core'
import { MeshBuilder, Vector3 } from '@babylonjs/core'

const defaultPriorities: Record<string, number> = {
  avoid: 10,
  collisionAvoidance: 10,
  queue: 9,
  separation: 7,
  flock: 6,
  flee: 6,
  seek: 5,
  wander: 1,
  idle: 0,
}

const defaultProbabilities: Record<string, number> = {
  avoid: 0.66,
  queue: 0.66,
  separation: 0.66,
  flock: 0.66,
  flee: 0.66,
  seek: 0.66,
  idle: 0.66,
}

interface Options {
  mass?: number
  maxSpeed?: number
  maxForce?: number
  tooCloseDistance?: number
  inSightDistance?: number
  wanderRange?: number
  wanderRadius?: number
  wanderOffset?: number
  radius?: number
  avoidDistance?: number
  arrivalThreshold?: number
  numSamplesForSmoothing?: number
}

interface Force {
  name: string
  force: BABYLON.Vector3
  weight?: number
  priority?: number
  probability?: number
}

interface Target {
  mesh: Pick<BABYLON.Mesh, 'position' | 'uniqueId'>
  velocity?: BABYLON.Vector3
  forces?: Force[]
}

export default class SteeringVehicle implements Target {
  private readonly scene: BABYLON.Scene
  private readonly engine: BABYLON.Engine
  private readonly _mesh: BABYLON.Mesh

  private readonly maxSpeed: number = 0.5
  private readonly maxForce: number = 8
  private readonly mass: number = 75

  private steeringForce: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0)
  private _forces: Force[] = []
  private _velocity: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0)
  private readonly velocitySamples: BABYLON.Vector3[] = []
  private readonly numSamplesForSmoothing: number = 20
  private arrivalThreshold: number = 100
  private readonly avoidDistance: number = 120
  private readonly avoidRadius: number = 100
  private readonly waypoints: any[] = []
  private pathIndex: number = 0
  private readonly wanderRadius: number = 5 // holds the radius of the wander circle
  private readonly wanderOffset: number = 5 // holds the forward offset of the wander circle
  private readonly wanderRate: number = 0.2 // holds the maximum at which the wander orientation can change
  private wanderOrientation: number = 0 // holds the current orientation of the wander target
  private readonly inSightDistance: number = 200
  private readonly tooCloseDistance: number = 60

  private debugMesh = MeshBuilder.CreateIcoSphere('debug', { radius: 0.25 })

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, options?: Options) {
    this.scene = scene
    this.engine = scene.getEngine()
    this._mesh = mesh
    Object.assign(this, options)

    const mat = new BABYLON.StandardMaterial('debug')
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0)
    this.debugMesh.setEnabled(false)
    this.debugMesh.material = mat
  }

  get mesh(): BABYLON.Mesh {
    return this._mesh
  }

  get forces(): Force[] {
    return this._forces
  }

  get velocity(): BABYLON.Vector3 {
    return this._velocity
  }

  animate(mode: 'blend' | 'priority' | 'probability' | 'truncated'): BABYLON.Vector3 {
    if (mode === 'blend') {
      this._forces.forEach((a) => {
        this.steeringForce = this.steeringForce.add(a.force).scaleInPlace(a.weight || 0.5)
      })
    } else if (mode === 'priority') {
      // order for priority
      this._forces = this.sortByPriority(this._forces)
      let output = this._forces[0].force
      if (this._forces.length > 1) {
        console.debug(this._forces)
      }
      this.steeringForce = this.steeringForce.add(output)
    } else if (mode === 'probability') {
      let output = new BABYLON.Vector3(0, 0, 0)
      this._forces = this.sortByPriority(this._forces)
      for (let i = 0; i < this._forces.length; i++) {
        let ele = this._forces[i]
        if ((ele.probability || defaultProbabilities[ele.name]) > Math.random()) {
          output = ele.force
          break
        }
      }
      this.steeringForce = this.steeringForce.add(output)
    } else if (mode === 'truncated') {
      this._forces = this.sortByPriority(this._forces)
      for (let i = 0; i < this._forces.length; i++) {
        let ele = this._forces[i]
        this.steeringForce = this.steeringForce.add(ele.force).scaleInPlace(ele.weight || 0.5)
        if (this.steeringForce.length() > 0.005) {
          break
        }
      }
    } else {
      this._forces.forEach((a) => {
        this.steeringForce = this.steeringForce.add(a.force)
      })
    }
    return this.update()
  }

  lookTarget(target: Target): this {
    this._mesh.lookAt(target.mesh.position) // native function
    return this
  }

  // https://forum.babylonjs.com/t/rotation-angle-of-camera-to-object/2603/21
  lookWhereGoing(smoothing: true): this {
    let direction = this._mesh.position.clone().add(this._velocity)
    direction.y = this._mesh.position.y
    if (smoothing) {
      if (this.velocitySamples.length == this.numSamplesForSmoothing) {
        this.velocitySamples.shift()
      }
      let c = this._velocity.clone()
      c.y = this._mesh.position.y
      this.velocitySamples.push(c)
      direction.setAll(0)
      for (let v = 0; v < this.velocitySamples.length; v++) {
        direction.addInPlace(this.velocitySamples[v])
      }
      direction.scaleInPlace(1 / this.velocitySamples.length)
      direction = this._mesh.position.clone().add(direction)
      direction.y = this._mesh.position.y
    }
    this._mesh.lookAt(direction)
    return this
  }

  idle(target?: Target, configuration = {}): this {
    this._velocity.scaleInPlace(0)
    this.steeringForce.setAll(0)
    const action = { force: this.steeringForce, name: this.idle.name }
    this._forces.push(Object.assign(configuration, action))
    return this
  }

  // apply generic force, for example wind
  applyForce(force: BABYLON.Vector3, configuration = {}): this {
    let action = { force: force, name: this.applyForce.name }
    this._forces.push(Object.assign(configuration, action))
    return this
  }

  seek(target: Target, threshold = 0, configuration = {}): this {
    let distance = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position)
    if (distance > threshold) {
      const desiredVelocity = this._seek(target)
      let action = { force: desiredVelocity.subtractInPlace(this._velocity), name: this.seek.name }
      this._forces.push(Object.assign(configuration, action))
    } else {
      this.idle(target, configuration)
    }
    return this
  }

  flee(target: Target, threshold = 0, configuration = {}): this {
    let distance = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position)
    if (distance < threshold) {
      const desiredVelocity = this._seek(target).scaleInPlace(-1)
      let action = { force: desiredVelocity.subtractInPlace(this._velocity), name: this.flee.name }
      this._forces.push(Object.assign(configuration, action))
    } else {
      this.idle(target, configuration)
    }
    return this
  }

  // like seek, but attracts target
  attract(target: this, threshold = 1, influenceThreshold = 100, strength = 1, configuration = {}): this {
    let distance = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position)
    if (distance < influenceThreshold && distance > threshold) {
      console.log('hit')
      const desiredVelocity = this._mesh.position
        .clone()
        .subtract(target.mesh.position.clone())
        .normalize()
        .scaleInPlace(this.maxSpeed * this.dt * strength)
      let action = { force: desiredVelocity.subtractInPlace(target.velocity), name: this.attract.name }
      target.forces.push(Object.assign(configuration, action))
    } else {
      target.flee(this)
    }
    return this
  }

  // tries to arrive at target with zero speed after hitting threshold
  seekWithArrive(target: Target, threshold: number, configuration = {}): this {
    const desiredVelocity = target.mesh.position.clone().subtract(this._mesh.position.clone())
    desiredVelocity.normalize()
    const distance = BABYLON.Vector3.Distance(target.mesh.position, this._mesh.position)

    if (distance > this.arrivalThreshold) {
      desiredVelocity.scaleInPlace(this.maxSpeed * this.dt)
    } else if (distance > threshold && distance < this.arrivalThreshold) {
      desiredVelocity.scaleInPlace((this.maxSpeed * this.dt * (distance - threshold)) / (this.arrivalThreshold - threshold))
    } else {
      this.idle(target, configuration)
    }
    let action = { force: desiredVelocity.subtractInPlace(this._velocity), name: this.seekWithArrive.name }
    this._forces.push(Object.assign(configuration, action))
    return this
  }

  arrive(target: Target, configuration = {}): this {
    const desiredVelocity = target.mesh.position.clone().subtract(this._mesh.position.clone())
    desiredVelocity.normalize()
    const distance = BABYLON.Vector3.Distance(target.mesh.position, this._mesh.position)
    if (distance > this.arrivalThreshold) {
      desiredVelocity.scaleInPlace(this.maxSpeed * this.dt)
    } else {
      desiredVelocity.scaleInPlace((this.maxSpeed * this.dt * distance) / this.arrivalThreshold)
    }
    let action = { force: desiredVelocity.subtractInPlace(this._velocity), name: this.flee.name }
    this._forces.push(Object.assign(configuration, action))
    return this
  }

  pursue(target: Target, threshold = 0): this {
    const lookAheadTime = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position) / (this.maxSpeed * this.dt)
    const predictedTarget = target.mesh.position.clone().add(target.velocity.clone().scaleInPlace(lookAheadTime))
    return this.seek(
      {
        mesh: {
          position: predictedTarget,
          uniqueId: null,
        },
      },
      threshold
    )
  }

  evade(target: Target, threshold = 0): this {
    const lookAheadTime = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position) / (this.maxSpeed * this.dt)
    const predictedTarget = target.mesh.position.clone().subtract(target.velocity.clone().scaleInPlace(lookAheadTime))
    return this.flee(
      {
        mesh: {
          position: predictedTarget,
          uniqueId: null,
        },
      },
      threshold
    )
  }

  // @stojg todo / test properly
  hide(target: Target, obstacles: Target[], threshold = 250): this {
    if (this.canSee(target)) {
      this.lookTarget(target)

      let closestObstacle = new BABYLON.Vector3(0, 0, 0)
      let closestDistance = 10000
      for (let i = 0; i < obstacles.length; i++) {
        const obstacle = obstacles[i]
        let distance = BABYLON.Vector3.Distance(this._mesh.position, obstacle.mesh.position)
        if (distance < closestDistance) {
          closestObstacle = obstacle.mesh.position.clone()
          closestDistance = distance
        }
      }

      let distanceWithTarget = BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position)
      const pointToReach = BABYLON.Vector3.Lerp(target.mesh.position.clone(), closestObstacle.clone(), 2)
      pointToReach.y = this._mesh.position.y

      if (distanceWithTarget < threshold) {
        this.seek(
          {
            mesh: {
              position: pointToReach,
              uniqueId: null,
            },
          },
          10
        )
      } else {
        this.flee(target)
      }
    } else {
      this.lookWhereGoing(true)
      this.idle()
    }
    return this
  }

  wander(configuration = {}): this {
    const direction = this._mesh.getDirection(forward)

    this.wanderOrientation += randomBinomial() * this.wanderRate

    let target = new BABYLON.Vector3(Math.sin(this.wanderOrientation), 0, Math.cos(this.wanderOrientation))
    target.scaleInPlace(this.wanderRadius)
    const ahead = direction.scale(this.wanderOffset).addInPlace(this._mesh.position)
    target.addInPlace(ahead)
    this._mesh.lookAt(target)
    return this.seek({ mesh: { position: target, uniqueId: null } })
  }

  separation(entities: Target[], radius = 1.5, strength = 1, configuration = {}): this {
    const force = new BABYLON.Vector3(0, 0, 0)
    for (let i = 0; i < entities.length; i++) {
      if (entities[i] === this) {
        continue
      }
      let direction = this._mesh.position.clone().subtractInPlace(entities[i].mesh.position)
      let sqrLength = direction.lengthSquared()
      if (sqrLength <= radius * radius) {
        // edge-case, entities are on top of each other, pick a random direction
        if (sqrLength === 0) {
          const r = Math.random() * 2 * Math.PI
          direction = Vector3.FromArray([Math.sin(r), 0, Math.cos(r)])
          sqrLength = 0.000001
        }
        const f = Math.min(strength / sqrLength, this.maxForce)
        force.addInPlace(direction.normalize().scaleInPlace(f))
      }
    }
    this._forces.push(Object.assign(configuration, { force: force, name: this.separation.name }))
    return this
  }

  interpose(targetA: Target, targetB: Target): this {
    let midPoint = targetA.mesh.position.clone().addInPlace(targetB.mesh.position.clone()).scaleInPlace(0.5)
    const timeToMidPoint = BABYLON.Vector3.Distance(this._mesh.position, midPoint) / (this.maxSpeed * this.dt)
    const pointA = targetA.mesh.position.clone().addInPlace(targetA.velocity.clone().scaleInPlace(timeToMidPoint))
    const pointB = targetB.mesh.position.clone().addInPlace(targetB.velocity.clone().scaleInPlace(timeToMidPoint))
    midPoint = pointA.addInPlace(pointB).scaleInPlace(0.5)
    return this.seek(
      {
        mesh: {
          position: midPoint,
          uniqueId: null,
        },
      },
      10
    )
  }

  collisionAvoidance(entities: Target[], radius = 1.5, secondsAhead = 5, configuration = {}): this {
    let shortestTime = Infinity

    let firstTarget = null
    let firstMinSeparation = 0
    let firstDistance = 0
    let firstRelativePos
    let firstRelativeVel

    for (let i = 0; i < entities.length; i++) {
      if (entities[i] === this) {
        continue
      }

      const target = entities[i]

      // calc time to collision
      let relativePos = target.mesh.position.subtract(this._mesh.position)
      let relativeVel = this.velocity.subtract(target.velocity)
      let relativeSpeed = relativeVel.length()
      let timeToCollision = BABYLON.Vector3.Dot(relativePos, relativeVel) / (relativeSpeed * relativeSpeed)

      // check if it is going to be a collision at all
      let distance = relativePos.length()
      let minSeparation = distance - relativeSpeed * timeToCollision

      if (minSeparation > 2 * radius) {
        continue
      }

      // check if it is the shortest
      if (timeToCollision > 0 && timeToCollision < shortestTime) {
        // store the time, target and other data
        shortestTime = timeToCollision
        firstTarget = target
        firstMinSeparation = minSeparation
        firstDistance = distance
        firstRelativePos = relativePos
        firstRelativeVel = relativeVel
      }
    }

    if (!firstTarget) {
      return this
    }

    if (shortestTime > secondsAhead) {
      return this
    }

    let relativePos: BABYLON.Vector3
    // if we are going to hit exactly, or if we're already colliding, then do the steering based on current position
    if (firstMinSeparation <= 0 || firstDistance < 2 * radius) {
      relativePos = this._mesh.position.subtract(firstTarget.mesh.position)
    } else {
      // otherwise, calculate the future relative position
      relativePos = firstRelativePos.add(firstRelativeVel.scaleInPlace(shortestTime))
    }

    if (!relativePos) {
      return this
    }

    // avoid the target
    let action = { force: relativePos.normalize().scale(this.maxForce), name: this.collisionAvoidance.name }
    this._forces.push(Object.assign(configuration, action))

    return this
  }

  followPath(path: BABYLON.Vector3[], loop: boolean, thresholdRadius = 10): this {
    const wayPoint = path[this.pathIndex]
    if (wayPoint == null) return
    if (BABYLON.Vector3.Distance(this._mesh.position, wayPoint) < thresholdRadius) {
      if (this.pathIndex >= path.length - 1) {
        if (loop) this.pathIndex = 0
      } else {
        this.pathIndex++
      }
    }
    if (this.pathIndex >= path.length - 1 && !loop) {
      this.arrive({
        mesh: {
          position: wayPoint,
          uniqueId: null,
        },
      })
    } else {
      this.seek({
        mesh: {
          position: wayPoint,
          uniqueId: null,
        },
      })
    }
  }

  followLeader(leader: Target, entities: Target[], distance = 20, separationRadius = 40, maxSeparation = 10, leaderSightRadius = 50, arrivalThreshold = 100): this {
    const tv = leader.velocity.clone()
    tv.normalize().scaleInPlace(distance)
    const ahead = leader.mesh.position.clone().add(tv)
    tv.negateInPlace()
    const behind = leader.mesh.position.clone().add(tv)

    if (this.isOnLeaderSight(leader, ahead, leaderSightRadius)) {
      this.flee(leader)
    }
    this.arrivalThreshold = arrivalThreshold
    this.arrive({
      mesh: {
        position: behind,
        uniqueId: null,
      },
    })
    this.separation(entities, separationRadius, maxSeparation)
    return this
  }

  queue(entities: Target[], maxQueueRadius = 50, configuration = {}): this {
    const neighbor = this.getNeighborAhead(entities)
    let brake = new BABYLON.Vector3(0, 0, 0)
    const v = this._velocity.clone()
    if (neighbor != null) {
      brake = this.steeringForce.clone().negateInPlace().scaleInPlace(0.8)
      v.negateInPlace().normalize()
      brake.add(v)
      if (BABYLON.Vector3.Distance(this._mesh.position, neighbor.mesh.position) <= maxQueueRadius) {
        this._velocity.scaleInPlace(0.3)
      }
    }
    let action = { force: brake, name: this.queue.name }
    this._forces.push(Object.assign(configuration, action))
    return this
  }

  // NOT WORKING !!!
  flock(entities: Target[], configuration = {}): this {
    const averageVelocity = this._velocity.clone()
    const averagePosition = new BABYLON.Vector3(0, 0, 0)
    let inSightCount = 0
    for (let i = 0; i < entities.length; i++) {
      if (entities[i] != this && this.inSight(entities[i])) {
        averageVelocity.add(entities[i].velocity)
        averagePosition.add(entities[i].mesh.position)
        if (BABYLON.Vector3.Distance(this._mesh.position, entities[i].mesh.position) < this.tooCloseDistance) {
          this.flee(entities[i] /* .mesh.position */)
        }
        inSightCount++
      }
    }
    if (inSightCount > 0) {
      averageVelocity.scaleInPlace(1 / inSightCount)
      averagePosition.scaleInPlace(1 / inSightCount)
      this.seek({
        mesh: {
          position: averagePosition,
          uniqueId: null,
        },
        velocity: BABYLON.Vector3.Zero(),
      })
      let action = { force: averageVelocity.subtractInPlace(this._velocity), name: this.flock.name }
      this._forces.push(Object.assign(configuration, action))
    }
    return this
  }

  // ACTIVE
  hasInConeOfView(targets: Target[]): this {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]

      let targetPos = target.mesh.position.clone()
      let actorPos = this._mesh.position.clone()
      let distance = BABYLON.Vector3.Distance(targetPos, actorPos)

      let v0 = this._velocity.clone().normalize()
      let v1 = target.mesh.position.clone().subtract(this._mesh.position.clone())
      v1.normalize()
      let dot = BABYLON.Vector3.Dot(v0, v1)
      let angle = Math.acos(dot)
      let angleInDegree = BABYLON.Tools.ToDegrees(angle)
      console.log(`Distance: ${distance}`, `Degree: ${angleInDegree}, Dot:${dot}`)
      // if (distance < 170 && angleInDegree < 60) {
      //   target.mesh.material.emissiveColor = new BABYLON.Color3(1, 0.5, 0)
      // } else {
      //   target.mesh.material.emissiveColor = target.mesh.color // TODO:
      // }
    }
    return this
  }

  // PASSIVA
  isInConeOfViewOf(target: Target): this {
    let targetPos = target.mesh.position.clone()
    let actorPos = this._mesh.position.clone()
    let distance = BABYLON.Vector3.Distance(targetPos, actorPos)

    /* var v0 = new BABYLON.Vector3(0, 0, 1);
        v0 = this.vecToLocal(v0, target);
        v0.normalize(); */

    let v0 = target.velocity.clone().normalize() // new BABYLON.Vector3(0, 0, 1);
    // var ray = new BABYLON.Ray(target.mesh.position, v0, 100);
    // let rayHelper = new BABYLON.RayHelper(ray);
    // rayHelper.show(this.mesh.getScene());

    let v1 = this._mesh.position.clone().subtract(target.mesh.position.clone())
    // var ray2 = new BABYLON.Ray(target.mesh.position, v1, 100);
    // let rayHelper2 = new BABYLON.RayHelper(ray2);
    // rayHelper2.show(this.mesh.getScene());
    v1.normalize()

    let dot = BABYLON.Vector3.Dot(v0, v1)
    let angle = Math.acos(dot)
    let angleInDegree = BABYLON.Tools.ToDegrees(angle)
    // console.log(`Distance: ${distance}`, `Degree: ${angleInDegree}, Dot:${dot}`);
    // if (distance < 170 && angleInDegree < 60) {
    //   this.mesh.material.emissiveColor = new BABYLON.Color3(1, 0.5, 0)
    // } else {
    //   this.mesh.material.emissiveColor = new BABYLON.Color3(0, 0, 1)
    // }
    return this
  }

  private inSight(target: Target): boolean {
    if (BABYLON.Vector3.Distance(this._mesh.position, target.mesh.position) > this.inSightDistance) {
      return false
    }
    const heading = /* new BABYLON.Vector3(0, 0, 1); //  */ target.velocity.clone().normalize().scaleInPlace(1)
    const difference = target.mesh.position.clone().subtract(this._mesh.position.clone())
    const dot = BABYLON.Vector3.Dot(difference, heading)
    // console.log(`Dot:${dot}`)
    return dot >= 0
  }

  // TODO: convert Three.js clampLength method to BABYLON
  private truncate(vector: BABYLON.Vector3, max: number) {
    let i = max / vector.length()
    return vector.scaleInPlace(i < 1.0 ? i : 1.0)
  }

  private update() {
    this.steeringForce = this.truncate(this.steeringForce, this.maxForce)
    this.steeringForce.scaleInPlace(1 / this.mass)
    this._velocity.addInPlace(this.steeringForce)
    this._velocity = this.truncate(this._velocity, this.maxSpeed * this.dt)
    this._velocity.y = 0
    this.steeringForce.setAll(0)
    this._forces = []
    return this._velocity
  }

  private _seek(target: Target, strength = 1) {
    return target.mesh.position
      .clone()
      .subtract(this._mesh.position.clone())
      .normalize()
      .scaleInPlace(this.maxSpeed * this.dt * strength)
  }

  // tramite un ray casting si vede se il target è visibile (non ci stanno ostacoli che lo nascondono)
  private canSee(target: Target): boolean {
    const forward = target.mesh.position.clone()
    const direction = forward.subtract(this._mesh.position).normalize()
    const length = 350
    let start = BABYLON.Vector3.Lerp(target.mesh.position.clone(), this._mesh.position.clone(), 0.66)
    const ray = new BABYLON.Ray(start, direction, length)
    // let rayHelper = new BABYLON.RayHelper(ray);
    // rayHelper.show(this.mesh.getScene());
    const hit = this.scene.pickWithRay(ray)
    // console.log('Can see: ', output);
    return hit.pickedMesh && hit.pickedMesh.uniqueId === target.mesh.uniqueId
  }

  private isOnLeaderSight(leader: Target, ahead: BABYLON.Vector3, leaderSightRadius: number): boolean {
    return BABYLON.Vector3.Distance(ahead, this._mesh.position) <= leaderSightRadius || BABYLON.Vector3.Distance(leader.mesh.position, this._mesh.position) <= leaderSightRadius
  }

  private getNeighborAhead(entities: Target[]): Target {
    const maxQueueAhead = 100
    const maxQueueRadius = 100
    let res
    const qa = this._velocity.clone().normalize().scaleInPlace(maxQueueAhead)
    const ahead = this._mesh.position.clone().add(qa)
    for (let i = 0; i < entities.length; i++) {
      const distance = BABYLON.Vector3.Distance(ahead, entities[i].mesh.position)
      if (entities[i] != this && distance <= maxQueueRadius) {
        res = entities[i]
        break
      }
    }
    return res
  }

  private sortByPriority(arr: Force[]): Force[] {
    return arr.sort(function (a, b) {
      return (b.priority || defaultPriorities[b.name]) - (a.priority || defaultPriorities[a.name])
    })
  }

  private get dt() {
    return this.engine.getDeltaTime()
  }

  private debug(pos: BABYLON.Vector3) {
    this.debugMesh.setEnabled(true)
    this.debugMesh.position.copyFrom(pos)
  }
}

function randomBinomial() {
  return Math.random() - Math.random()
}

const forward = new BABYLON.Vector3(0, 0, 1)
