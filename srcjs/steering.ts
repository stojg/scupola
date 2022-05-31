import * as BABYLON from '@babylonjs/core'
import { MeshBuilder } from '@babylonjs/core'

const defaultPriorities: Record<string, number> = {
  avoid: 10,
  collisionAvoidance: 10,
  obstacleAvoidance: 9,
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
  maxSpeed?: number
  maxAcceleration?: number
  maxRotation?: number
  maxAngularAcceleration?: number

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

interface Action {
  name?: string
  linear?: BABYLON.Vector3
  angular?: number
  weight?: number
  priority?: number
  probability?: number
}

interface Target {
  position: BABYLON.Vector3
  velocity?: BABYLON.Vector3
  orientation: number
  actions?: Action[]
  rotation?: number
}

type PositionTarget = Pick<Target, 'position'>
type VelocityTarget = Pick<Target, 'velocity'>
type OrientationTarget = Pick<Target, 'orientation'>

export default class SteeringVehicle implements Target {
  private readonly scene: BABYLON.Scene
  private readonly engine: BABYLON.Engine
  private readonly _mesh: BABYLON.Mesh

  private maxSpeed: number = 1.4
  private maxAcceleration: number = 1

  private maxRotation: number = 2 * Math.PI
  private maxAngularAcceleration: number = this.maxRotation

  private readonly drag: number = 0.999

  get position(): Readonly<BABYLON.Vector3> {
    return this._mesh.position
  }
  get orientation(): number {
    return this._mesh.rotationQuaternion?.toEulerAngles().y || this._mesh.rotation.y
  }
  private _velocity: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0)
  get velocity(): Readonly<BABYLON.Vector3> {
    return this._velocity
  }
  private _rotation: number = 0
  get rotation(): number {
    return this._rotation
  }

  private _actions: Action[] = []

  private readonly velocitySamples: BABYLON.Vector3[] = []
  private readonly numSamplesForSmoothing: number = 20

  private pathIndex: number = 0
  private wanderOrientation: number = 0 // holds the current orientation of the wander target
  private readonly inSightDistance: number = 200
  private readonly tooCloseDistance: number = 60

  private debugMesh = MeshBuilder.CreateIcoSphere('debug', { radius: 0.25 })

  constructor(mesh: BABYLON.Mesh, scene: BABYLON.Scene, options?: Options) {
    this.scene = scene
    this.engine = scene.getEngine()
    this._mesh = mesh

    this.maxSpeed = options?.maxSpeed || this.maxSpeed
    this.maxAcceleration = options?.maxAcceleration || this.maxAcceleration
    this.maxRotation = options?.maxRotation || this.maxRotation
    this.maxAngularAcceleration = options?.maxAngularAcceleration || this.maxAngularAcceleration

    const mat = new BABYLON.StandardMaterial('debug')
    mat.diffuseColor = new BABYLON.Color3(1, 0, 0)
    this.debugMesh.setEnabled(false)
    this.debugMesh.material = mat
  }

  get mesh(): Readonly<BABYLON.Mesh> {
    return this._mesh
  }

  get actions(): Action[] {
    return this._actions
  }

  animate(mode: 'blend' | 'priority' | 'probability' | 'truncated'): { orientation: number; position: BABYLON.Vector3 } {
    const linear = BABYLON.Vector3.Zero()
    let angular = 0

    if (mode === 'blend') {
      this._actions.forEach((a) => {
        const weight = a.weight || 1 / this._actions.length
        if (a.linear) {
          linear.addInPlace(a.linear).scaleInPlace(weight)
        }
        if (a.angular) {
          angular += a.angular * weight
        }
      })
    } else if (mode === 'priority') {
      // this._actions = this.sortByPriority(this._actions)
      // for (let i = 0; i < this._actions.length; i++) {
      //   if (this._actions[i].linear.lengthSquared() !== 0) {
      //     this.steeringLinear = this.steeringLinear.add(this._actions[i].linear)
      //     break
      //   }
      // }
    } else if (mode === 'probability') {
      // let output = new BABYLON.Vector3(0, 0, 0)
      // this._actions = this.sortByPriority(this._actions)
      // for (let i = 0; i < this._actions.length; i++) {
      //   let ele = this._actions[i]
      //   if ((ele.probability || defaultProbabilities[ele.name]) > Math.random()) {
      //     output = ele.linear
      //     break
      //   }
      // }
      // this.steeringLinear = this.steeringLinear.add(output)
    } else if (mode === 'truncated') {
      // this._actions = this.sortByPriority(this._actions)
      // for (let i = 0; i < this._actions.length; i++) {
      //   let ele = this._actions[i]
      //   this.steeringLinear = this.steeringLinear.add(ele.linear).scaleInPlace(ele.weight || 0.5)
      //   if (this.steeringLinear.length() > 0.005) {
      //     break
      //   }
      // }
    } else {
      // this._actions.forEach((a) => {
      //   this.steeringLinear = this.steeringLinear.add(a.linear)
      // })
    }
    this._actions = []
    return this.update(linear, angular)
  }

  // apply generic acceleration, for example wind
  applyAcceleration(linear: BABYLON.Vector3, configuration = {}): this {
    if (linear.length() > this.maxAcceleration) {
      linear.normalize().scaleInPlace(this.maxAcceleration)
    }
    this.addAction(this.applyAcceleration.name, { linear: linear }, configuration)
    return this
  }

  applyTargetVelocity(target: BABYLON.Vector3, timeToTarget = 0.01, configuration = {}): this {
    let linear: BABYLON.Vector3 = target.subtract(this.velocity)
    linear.scaleInPlace(1 / timeToTarget)
    if (linear.length() > this.maxAcceleration) {
      linear.normalize()
      linear.scaleInPlace(this.maxAcceleration)
    }
    this.addAction(this.applyTargetVelocity.name, { linear: linear }, configuration)
    return this
  }

  idle(configuration = {}): this {
    return this
  }

  seek(target: PositionTarget, threshold = 0, configuration = {}): this {
    const linear = target.position.subtract(this.position)
    if (linear.lengthSquared() <= threshold * threshold) {
      return this
    }
    linear.normalize().scaleInPlace(this.maxAcceleration)
    this.addAction(this.seek.name, { linear: linear }, configuration)
    return this
  }

  flee(target: PositionTarget, threshold = 0, configuration = {}): this {
    const linear = this.position.subtract(target.position)
    if (linear.lengthSquared() <= threshold * threshold) {
      return this
    }
    linear.normalize().scaleInPlace(this.maxAcceleration)
    this.addAction(this.flee.name, { linear: linear }, configuration)
    return this
  }

  arrive(target: PositionTarget, targetThreshold = 0.01, slowThreshold = 2, timeToTarget = 1, configuration = {}): this {
    const direction = target.position.subtract(this.position)
    const distance = direction.length()
    if (distance <= targetThreshold) {
      return this
    }
    let targetSpeed = 0
    if (distance > slowThreshold) {
      targetSpeed = this.maxSpeed
    } else {
      targetSpeed = this.maxSpeed * (distance / slowThreshold)
    }
    const targetVelocity = direction.clone()
    targetVelocity.normalize().scaleInPlace(targetSpeed)
    targetVelocity.subtractInPlace(this.velocity)
    targetVelocity.scaleInPlace(1 / timeToTarget)

    if (targetVelocity.length() > this.maxAcceleration) {
      targetVelocity.normalize().scaleInPlace(this.maxAcceleration)
    }

    this.addAction(this.arrive.name, { linear: targetVelocity }, configuration)
    return this
  }

  align(target: OrientationTarget, targetRadius = 0.018, slowRadius = 0.8, timeToTarget = 0.1, configuration = {}): this {
    let rotation = BABYLON.Scalar.NormalizeRadians(target.orientation - this.orientation)
    const rotationSize = Math.abs(rotation)

    if (rotationSize < targetRadius) {
      return this
    }
    let targetRotation = this.maxRotation
    if (rotationSize <= slowRadius) {
      targetRotation *= rotationSize / slowRadius
    }

    // recalculate which direction by using the classic `value / abs(value)` that will return either =1 or -1
    targetRotation *= rotation / rotationSize
    let angular = (targetRotation - this.rotation) / timeToTarget

    const angularAcceleration = Math.abs(angular)
    if (angularAcceleration > this.maxAngularAcceleration) {
      angular /= angularAcceleration // normalise, but keep sign
      angular *= this.maxAngularAcceleration
    }
    this.addAction(this.align.name, { angular: angular }, configuration)
    return this
  }

  velocityMatch(target: VelocityTarget, timeTotarget = 0.1, configuration = {}): this {
    let linear: BABYLON.Vector3 = target.velocity.subtract(this.velocity)
    linear.scaleInPlace(1 / timeTotarget)
    if (linear.length() > this.maxAcceleration) {
      linear.normalize()
      linear.scaleInPlace(this.maxAcceleration)
    }
    this.addAction(this.velocityMatch.name, { linear: linear }, configuration)
    return this
  }

  pursue(target: PositionTarget & VelocityTarget, maxPredictionSec = 1, targetThreshold = 0.1, configuration = {}): this {
    const direction = target.position.subtract(this.position)
    const distance = direction.length()
    const speed = this.velocity.length()
    let prediction = maxPredictionSec
    // check if speed is high enough to give a reasonable prediction time
    if (speed > distance / maxPredictionSec) {
      prediction = distance / speed
    }
    const targetAhead = target.position.add(target.velocity.scale(prediction))
    return this.seek({ position: targetAhead }, targetThreshold, configuration)
  }

  evade(target: Target, maxPredictionSec = 1, targetThreshold = 0.1, configuration = {}): this {
    const direction = target.position.subtract(this.position)
    const distance = direction.length()
    const speed = this.velocity.length()
    let prediction = maxPredictionSec
    // check if speed is high enough to give a reasonable prediction time
    if (speed > distance / maxPredictionSec) {
      prediction = distance / speed
    }
    const targetAhead = target.position.add(target.velocity.scale(prediction))
    this.debug(targetAhead)
    return this.flee({ position: targetAhead }, targetThreshold, configuration)
  }

  face(target: PositionTarget, targetRadius = 0.018, slowRadius = 0.2, timeToTarget = 0.1, configuration = {}): this {
    const direction = target.position.subtract(this.position)
    if (direction.lengthSquared() === 0) {
      return this
    }
    return this.align({ orientation: Math.atan2(direction.x, direction.z) }, targetRadius, slowRadius, timeToTarget, configuration)
  }

  lookWhereGoing(configuration = {}): this {
    if (this.velocity.lengthSquared() === 0) {
      return this
    }
    return this.align(
      {
        orientation: Math.atan2(this.velocity.x, this.velocity.z),
      },
      0.018,
      0.8,
      0.1,
      configuration
    )
  }

  wander(wanderRate = 0.1, offset = 5, radius = 4, configuration = {}): this {
    const direction = this._mesh.getDirection(forward)
    this.wanderOrientation += randomBinomial() * wanderRate

    let target = new BABYLON.Vector3(Math.sin(this.wanderOrientation), 0, Math.cos(this.wanderOrientation))
    target.scaleInPlace(radius)
    const ahead = direction.scale(offset).addInPlace(this._mesh.position)
    target.addInPlace(ahead)
    return this.seek({ position: target }, 0, configuration)
  }

  separation(entities: PositionTarget[], radius = 1, decayCoefficient = 1, configuration = {}): this {
    const linear = BABYLON.Vector3.Zero()

    for (let i = 0; i < entities.length; i++) {
      if (entities[i] === this) {
        continue
      }
      let direction = this.position.subtract(entities[i].position)
      let sqrLength = direction.lengthSquared()
      if (sqrLength > radius * radius) {
        continue
      }
      // if two entities are on top each other, randomise their separation so they dont both have the same exact separation vector
      if (sqrLength === 0) {
        const r = Math.random() * 2 * Math.PI
        direction = BABYLON.Vector3.FromArray([Math.sin(r), 0, Math.cos(r)])
        sqrLength = 0.000001
      }

      // inverse square law strength based on distance
      const strength = Math.min(decayCoefficient / sqrLength, this.maxAcceleration)

      linear.addInPlace(direction.normalize().scaleInPlace(strength))
    }

    this.addAction(this.separation.name, { linear: linear }, configuration)
    return this
  }

  // tries to arrive at target with zero speed after hitting threshold
  // seekWithArrive(target: Target, threshold: number, configuration = {}): this {
  //   const desiredVelocity = target.position.clone().subtract(this.position.clone())
  //   desiredVelocity.normalize()
  //   const distance = BABYLON.Vector3.Distance(target.position, this._mesh.position)
  //
  //   if (distance > this.arrivalThreshold) {
  //     desiredVelocity.scaleInPlace(this.maxSpeed * this.dt)
  //   } else if (distance > threshold && distance < this.arrivalThreshold) {
  //     desiredVelocity.scaleInPlace((this.maxSpeed * this.dt * (distance - threshold)) / (this.arrivalThreshold - threshold))
  //   } else {
  //     this.idle(target, configuration)
  //   }
  //   let action = { linear: desiredVelocity.subtractInPlace(this._velocity), name: this.seekWithArrive.name }
  //   this._actions.push(Object.assign(configuration, action))
  //   return this
  // }

  // arrive(target: Target, configuration = {}): this {
  //   const desiredVelocity = target.position.clone().subtract(this.position.clone())
  //   desiredVelocity.normalize()
  //   const distance = BABYLON.Vector3.Distance(target.position, this._mesh.position)
  //   if (distance > this.arrivalThreshold) {
  //     desiredVelocity.scaleInPlace(this.maxSpeed * this.dt)
  //   } else {
  //     desiredVelocity.scaleInPlace((this.maxSpeed * this.dt * distance) / this.arrivalThreshold)
  //   }
  //   let action = { linear: desiredVelocity.subtractInPlace(this._velocity), name: this.flee.name }
  //   this._actions.push(Object.assign(configuration, action))
  //   return this
  // }

  // @stojg todo / test properly
  // hide(target: Target, obstacles: Target[], threshold = 250): this {
  //   if (this.canSee(target)) {
  //     this.lookTarget(target)
  //
  //     let closestObstacle = new BABYLON.Vector3(0, 0, 0)
  //     let closestDistance = 10000
  //     for (let i = 0; i < obstacles.length; i++) {
  //       const obstacle = obstacles[i]
  //       let distance = BABYLON.Vector3.Distance(this._mesh.position, obstacle.position)
  //       if (distance < closestDistance) {
  //         closestObstacle = obstacle.position.clone()
  //         closestDistance = distance
  //       }
  //     }
  //
  //     let distanceWithTarget = BABYLON.Vector3.Distance(this._mesh.position, target.position)
  //     const pointToReach = BABYLON.Vector3.Lerp(target.position.clone(), closestObstacle.clone(), 2)
  //     pointToReach.y = this.position.y
  //
  //     if (distanceWithTarget < threshold) {
  //       this.seek(
  //         {
  //           position: pointToReach,
  //         },
  //         10
  //       )
  //     } else {
  //       this.flee(target)
  //     }
  //   } else {
  //     this.lookWhereGoing(true)
  //     this.idle()
  //   }
  //   return this
  // }

  obstacleAvoidance(obstacles: BABYLON.Mesh[], avoidDistance = 5, lookahead = 10, configuration = {}): this {
    let direction = this.velocity.clone().normalize()
    const start = this.position.add(direction.scaleInPlace(this._mesh.getBoundingInfo().boundingSphere.radiusWorld))

    const ray = new BABYLON.Ray(start, direction, lookahead)

    const pickingInfos: BABYLON.PickingInfo[] = []
    ray.intersectsMeshes(obstacles, false, pickingInfos)
    if (pickingInfos.length === 0) {
      // this.debugMesh.setEnabled(false)
      return this
    }

    // sort by distance, not sure if babylonjs does this for us
    pickingInfos.sort((a, b) => a.distance - b.distance)

    const hit = pickingInfos[0]

    const normal = hit.getNormal(true)

    const target = hit.pickedPoint.add(normal.scale(avoidDistance))

    return this.seek({ position: target })
  }

  // wander(configuration = {}): this {
  //   const direction = this._mesh.getDirection(forward)
  //
  //   this.wanderOrientation += randomBinomial() * this.wanderRate
  //
  //   let target = new BABYLON.Vector3(Math.sin(this.wanderOrientation), 0, Math.cos(this.wanderOrientation))
  //   target.scaleInPlace(this.wanderRadius)
  //   const ahead = direction.scale(this.wanderOffset).addInPlace(this._mesh.position)
  //   target.addInPlace(ahead)
  //   this._mesh.lookAt(target)
  //   return this.seek({ position: target, orientation: 0 })
  // }

  // separation(entities: Target[], radius = 1.5, strength = 1, configuration = {}): this {
  //   const force = new BABYLON.Vector3(0, 0, 0)
  //   for (let i = 0; i < entities.length; i++) {
  //     if (entities[i] === this) {
  //       continue
  //     }
  //     let direction = this.position.clone().subtractInPlace(entities[i].position)
  //     let sqrLength = direction.lengthSquared()
  //     if (sqrLength <= radius * radius) {
  //       // edge-case, entities are on top of each other, pick a random direction
  //       if (sqrLength === 0) {
  //         const r = Math.random() * 2 * Math.PI
  //         direction = BABYLON.Vector3.FromArray([Math.sin(r), 0, Math.cos(r)])
  //         sqrLength = 0.000001
  //       }
  //       const f = Math.min(strength / sqrLength, this.maxForce)
  //       force.addInPlace(direction.normalize().scaleInPlace(f))
  //     }
  //   }
  //   this._actions.push(Object.assign(configuration, { linear: force, name: this.separation.name }))
  //   return this
  // }

  interpose(targetA: Target, targetB: Target): this {
    let midPoint = targetA.position.clone().addInPlace(targetB.position.clone()).scaleInPlace(0.5)
    const timeToMidPoint = BABYLON.Vector3.Distance(this.position, midPoint) / (this.maxSpeed * this.dt)
    const pointA = targetA.position.clone().addInPlace(targetA.velocity.clone().scaleInPlace(timeToMidPoint))
    const pointB = targetB.position.clone().addInPlace(targetB.velocity.clone().scaleInPlace(timeToMidPoint))
    midPoint = pointA.addInPlace(pointB).scaleInPlace(0.5)
    return this.seek(
      {
        position: midPoint,
      },
      10
    )
  }

  // collisionAvoidance(entities: Target[], radius = 1.5, secondsAhead = 5, configuration = {}): this {
  //   let shortestTime = Infinity
  //
  //   let firstTarget = null
  //   let firstMinSeparation = 0
  //   let firstDistance = 0
  //   let firstRelativePos
  //   let firstRelativeVel
  //
  //   for (let i = 0; i < entities.length; i++) {
  //     if (entities[i] === this) {
  //       continue
  //     }
  //
  //     const target = entities[i]
  //
  //     // calc time to collision
  //     let relativePos = target.position.subtract(this._mesh.position)
  //     let relativeVel = this.velocity.subtract(target.velocity)
  //     let relativeSpeed = relativeVel.length()
  //     let timeToCollision = BABYLON.Vector3.Dot(relativePos, relativeVel) / (relativeSpeed * relativeSpeed)
  //
  //     // check if it is going to be a collision at all
  //     let distance = relativePos.length()
  //     let minSeparation = distance - relativeSpeed * timeToCollision
  //
  //     if (minSeparation > 2 * radius) {
  //       continue
  //     }
  //
  //     // check if it is the shortest
  //     if (timeToCollision > 0 && timeToCollision < shortestTime) {
  //       // store the time, target and other data
  //       shortestTime = timeToCollision
  //       firstTarget = target
  //       firstMinSeparation = minSeparation
  //       firstDistance = distance
  //       firstRelativePos = relativePos
  //       firstRelativeVel = relativeVel
  //     }
  //   }
  //
  //   if (!firstTarget) {
  //     return this
  //   }
  //
  //   if (shortestTime > secondsAhead) {
  //     return this
  //   }
  //
  //   let relativePos: BABYLON.Vector3
  //   // if we are going to hit exactly, or if we're already colliding, then do the steering based on current position
  //   if (firstMinSeparation <= 0 || firstDistance < 2 * radius) {
  //     relativePos = this.position.subtract(firstTarget.position)
  //   } else {
  //     // otherwise, calculate the future relative position
  //     relativePos = firstRelativePos.add(firstRelativeVel.scaleInPlace(shortestTime))
  //   }
  //
  //   if (!relativePos) {
  //     return this
  //   }
  //
  //   // avoid the target
  //   let action = { linear: relativePos.normalize().scale(this.maxForce), name: this.collisionAvoidance.name }
  //   this._actions.push(Object.assign(configuration, action))
  //
  //   return this
  // }

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
      this.arrive({ position: wayPoint })
    } else {
      this.seek({ position: wayPoint })
    }
  }

  // followLeader(leader: Target, entities: Target[], distance = 20, separationRadius = 40, maxSeparation = 10, leaderSightRadius = 50, arrivalThreshold = 100): this {
  //   const tv = leader.velocity.clone()
  //   tv.normalize().scaleInPlace(distance)
  //   const ahead = leader.position.clone().add(tv)
  //   tv.negateInPlace()
  //   const behind = leader.position.clone().add(tv)
  //
  //   if (this.isOnLeaderSight(leader, ahead, leaderSightRadius)) {
  //     this.flee(leader)
  //   }
  //   this.arrivalThreshold = arrivalThreshold
  //   this.arrive({
  //     position: behind,
  //   })
  //   this.separation(entities, separationRadius, maxSeparation)
  //   return this
  // }

  // queue(entities: Target[], maxQueueRadius = 50, configuration = {}): this {
  //   const neighbor = this.getNeighborAhead(entities)
  //   let brake = new BABYLON.Vector3(0, 0, 0)
  //   const v = this._velocity.clone()
  //   if (neighbor != null) {
  //     brake = this.steeringLinear.clone().negateInPlace().scaleInPlace(0.8)
  //     v.negateInPlace().normalize()
  //     brake.add(v)
  //     if (BABYLON.Vector3.Distance(this.position, neighbor.position) <= maxQueueRadius) {
  //       this._velocity.scaleInPlace(0.3)
  //     }
  //   }
  //   let action = { linear: brake, name: this.queue.name }
  //   this._actions.push(Object.assign(configuration, action))
  //   return this
  // }

  // NOT WORKING !!!
  flock(entities: Target[], configuration = {}): this {
    const averageVelocity = this._velocity.clone()
    const averagePosition = new BABYLON.Vector3(0, 0, 0)
    let inSightCount = 0
    for (let i = 0; i < entities.length; i++) {
      if (entities[i] != this && this.inSight(entities[i])) {
        averageVelocity.add(entities[i].velocity)
        averagePosition.add(entities[i].position)
        if (BABYLON.Vector3.Distance(this.position, entities[i].position) < this.tooCloseDistance) {
          this.flee(entities[i] /* .mesh.position */)
        }
        inSightCount++
      }
    }
    if (inSightCount > 0) {
      averageVelocity.scaleInPlace(1 / inSightCount)
      averagePosition.scaleInPlace(1 / inSightCount)
      this.seek({ position: averagePosition })
      let action = { linear: averageVelocity.subtractInPlace(this._velocity), name: this.flock.name }
      this._actions.push(Object.assign(configuration, action))
    }
    return this
  }

  // ACTIVE
  hasInConeOfView(targets: Target[]): this {
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]

      let targetPos = target.position.clone()
      let actorPos = this.position.clone()
      let distance = BABYLON.Vector3.Distance(targetPos, actorPos)

      let v0 = this._velocity.clone().normalize()
      let v1 = target.position.clone().subtract(this.position.clone())
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
    let targetPos = target.position.clone()
    let actorPos = this.position.clone()
    let distance = BABYLON.Vector3.Distance(targetPos, actorPos)

    /* var v0 = new BABYLON.Vector3(0, 0, 1);
        v0 = this.vecToLocal(v0, target);
        v0.normalize(); */

    let v0 = target.velocity.clone().normalize() // new BABYLON.Vector3(0, 0, 1);
    // var ray = new BABYLON.Ray(target.mesh.position, v0, 100);
    // let rayHelper = new BABYLON.RayHelper(ray);
    // rayHelper.show(this.mesh.getScene());

    let v1 = this.position.clone().subtract(target.position.clone())
    // var ray2 = new BABYLON.Ray(target.position, v1, 100);
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
    if (BABYLON.Vector3.Distance(this._mesh.position, target.position) > this.inSightDistance) {
      return false
    }
    const heading = /* new BABYLON.Vector3(0, 0, 1); //  */ target.velocity.clone().normalize().scaleInPlace(1)
    const difference = target.position.clone().subtract(this.position.clone())
    const dot = BABYLON.Vector3.Dot(difference, heading)
    return dot >= 0
  }

  private update(acceleration: BABYLON.Vector3, angular: number) {
    const dt = this.dt / 1000

    if (acceleration.length() > this.maxAcceleration) {
      acceleration.normalize().scaleInPlace(this.maxAcceleration)
    }

    if (angular > this.maxAngularAcceleration) {
      angular = this.maxAngularAcceleration
    }

    // change in velocities
    this._velocity.addInPlace(acceleration.scale(dt))
    this._rotation += angular * dt

    // limit velocities
    if (this._velocity.length() > this.maxSpeed) {
      this._velocity.normalize().scaleInPlace(this.maxSpeed)
    }
    if (Math.abs(this._rotation) > this.maxRotation) {
      this._rotation = this.maxRotation * (this._rotation / Math.abs(this._rotation))
    }

    // change in position and orientation
    const position = this.position.add(this.velocity.scale(dt))
    const orientation = this.orientation + this.rotation * dt

    this._velocity.scaleInPlace(this.drag)
    this._rotation *= this.drag

    if (acceleration.lengthSquared() === 0) {
      this._velocity.scaleInPlace(0.5)
    }
    if (angular === 0) {
      this._rotation *= 0.5
    }

    return { position, orientation }
  }

  private _seek(target: Target, strength = 1) {
    this.debug(target.position)
    return target.position
      .clone()
      .subtract(this.position.clone())
      .normalize()
      .scaleInPlace(this.maxSpeed * this.dt * strength)
  }

  // tramite un ray casting si vede se il target è visibile (non ci stanno ostacoli che lo nascondono)
  // private canSee(target: Target): boolean {
  //   const forward = target.position.clone()
  //   const direction = forward.subtract(this._mesh.position).normalize()
  //   const length = 350
  //   let start = BABYLON.Vector3.Lerp(target.position.clone(), this.position.clone(), 0.66)
  //   const ray = new BABYLON.Ray(start, direction, length)
  //   // let rayHelper = new BABYLON.RayHelper(ray);
  //   // rayHelper.show(this.mesh.getScene());
  //   const hit = this.scene.pickWithRay(ray)
  //   // console.log('Can see: ', output);
  //   return hit.pickedMesh && hit.pickedMesh.uniqueId === target.mesh.uniqueId
  // }

  private isOnLeaderSight(leader: Target, ahead: BABYLON.Vector3, leaderSightRadius: number): boolean {
    return BABYLON.Vector3.Distance(ahead, this._mesh.position) <= leaderSightRadius || BABYLON.Vector3.Distance(leader.position, this._mesh.position) <= leaderSightRadius
  }

  private getNeighborAhead(entities: Target[]): Target {
    const maxQueueAhead = 100
    const maxQueueRadius = 100
    let res
    const qa = this._velocity.clone().normalize().scaleInPlace(maxQueueAhead)
    const ahead = this.position.clone().add(qa)
    for (let i = 0; i < entities.length; i++) {
      const distance = BABYLON.Vector3.Distance(ahead, entities[i].position)
      if (entities[i] != this && distance <= maxQueueRadius) {
        res = entities[i]
        break
      }
    }
    return res
  }

  private sortByPriority(arr: Action[]): Action[] {
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

  lookTarget(target: Target): this {
    this._mesh.lookAt(target.position) // native function
    return this
  }

  // https://forum.babylonjs.com/t/rotation-angle-of-camera-to-object/2603/21
  // lookWhereGoing(smoothing: true): this {
  //   let direction = this.position.clone().add(this._velocity)
  //   direction.y = this.position.y
  //   if (smoothing) {
  //     if (this.velocitySamples.length == this.numSamplesForSmoothing) {
  //       this.velocitySamples.shift()
  //     }
  //     let c = this._velocity.clone()
  //     c.y = this.position.y
  //     this.velocitySamples.push(c)
  //     direction.setAll(0)
  //     for (let v = 0; v < this.velocitySamples.length; v++) {
  //       direction.addInPlace(this.velocitySamples[v])
  //     }
  //     direction.scaleInPlace(1 / this.velocitySamples.length)
  //     direction = this.position.clone().add(direction)
  //     direction.y = this.position.y
  //   }
  //   this._mesh.lookAt(direction)
  //   return this
  // }

  private addAction(name: string, action: Action, configuration = {}) {
    this._actions.push(Object.assign(configuration, action, { name: name }))
  }
}

function randomBinomial() {
  return Math.random() - Math.random()
}

const forward = new BABYLON.Vector3(0, 0, 1)
