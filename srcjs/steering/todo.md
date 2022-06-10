// export const t = true;
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
  //
  // interpose(targetA: Target, targetB: Target): this {
  //     let midPoint = targetA.position.clone().addInPlace(targetB.position.clone()).scaleInPlace(0.5)
  //     const timeToMidPoint = BABYLON.Vector3.Distance(this.position, midPoint) / (this.maxSpeed * this.dt)
  //     const pointA = targetA.position.clone().addInPlace(targetA.velocity.clone().scaleInPlace(timeToMidPoint))
  //     const pointB = targetB.position.clone().addInPlace(targetB.velocity.clone().scaleInPlace(timeToMidPoint))
  //     midPoint = pointA.addInPlace(pointB).scaleInPlace(0.5)
  //     return this
  //     // return this.seek(
  //     //   {
  //     //     position: midPoint,
  //     //   },
  //     //   10
  //     // )
  // }

  // followPath(path: BABYLON.Vector3[], loop: boolean, thresholdRadius = 10): this {
  //     const wayPoint = path[this.pathIndex]
  //     if (wayPoint == null) return
  //     if (BABYLON.Vector3.Distance(this._mesh.position, wayPoint) < thresholdRadius) {
  //         if (this.pathIndex >= path.length - 1) {
  //             if (loop) this.pathIndex = 0
  //         } else {
  //             this.pathIndex++
  //         }
  //     }
  //     return this
  //     if (this.pathIndex >= path.length - 1 && !loop) {
  //         // this.arrive({ position: wayPoint })
  //     } else {
  //         // this.seek({ position: wayPoint })
  //     }
  // }

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

  // private isOnLeaderSight(leader: Target, ahead: BABYLON.Vector3, leaderSightRadius: number): boolean {
  //   return (
  //     BABYLON.Vector3.Distance(ahead, this._mesh.position) <= leaderSightRadius ||
  //     BABYLON.Vector3.Distance(leader.position, this._mesh.position) <= leaderSightRadius
  //   )
  }

  // private getNeighborAhead(entities: Target[]): Target {
  //   const maxQueueAhead = 100
  //   const maxQueueRadius = 100
  //   let res
  //   const qa = this._velocity.clone().normalize().scaleInPlace(maxQueueAhead)
  //   const ahead = this.position.clone().add(qa)
  //   for (let i = 0; i < entities.length; i++) {
  //     const distance = BABYLON.Vector3.Distance(ahead, entities[i].position)
  //     if (entities[i] != this && distance <= maxQueueRadius) {
  //       res = entities[i]
  //       break
  //     }
  //   }
  //   return res
  // }

