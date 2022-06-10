import { Steering, SteeringOutput } from './steering'
import { Blended } from './blended'

type BlendedAndPriorities = {
  group: Blended
  priority: number
}

export class Priority extends Steering {
  constructor(private groups: BlendedAndPriorities[], private epsilon: number = 0.00001) {
    super()
  }

  getSteering(): SteeringOutput {
    let steering = this.steeringOutput()

    this.groups.sort((a, b) => a.priority - b.priority)

    for (let i = 0; i < this.groups.length; i++) {
      const group = this.groups[i]
      steering = group.group.getSteering()
      if (steering.linear.length() > this.epsilon) {
        return steering
      }
      if (Math.abs(steering.angular) > this.epsilon) {
        return steering
      }
    }

    // final group
    return steering
  }
}
