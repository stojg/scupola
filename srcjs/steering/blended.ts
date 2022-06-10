import { Steering, SteeringOutput } from './steering'

type BehaviourAndWeights = {
  behaviour: Steering
  weight: number
}

export class Blended extends Steering {
  static create(weight: number, steering: Steering) {
    return { weight: weight, behaviour: steering }
  }

  constructor(private behaviours: BehaviourAndWeights[], private maxAcceleration: number, private maxRotation: number) {
    super()
  }

  getSteering(): SteeringOutput {
    const steering = this.steeringOutput()
    this.behaviours.forEach((a) => {
      const r = a.behaviour.getSteering()
      steering.linear.addInPlace(r.linear.scale(a.weight))
      steering.angular += r.angular * a.weight
    })

    this.clampInPlace(steering.linear, this.maxAcceleration)
    steering.angular = this.clampNumber(steering.angular, this.maxRotation)

    return steering
  }
}
