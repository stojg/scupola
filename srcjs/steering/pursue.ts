import { PositionTarget, VelocityTarget } from './steering'
import { Seek } from './seek'
import NPC from '../core/npc'

export class Pursue extends Seek {
  constructor(
    protected character: NPC,
    protected target: PositionTarget & VelocityTarget,
    protected maxPrediction: number
  ) {
    super(character, target)
  }

  getSteering() {
    // work out the distance to target
    const direction = this.target.position.subtract(this.character.position)
    const distance = direction.length()

    // work out our current speed
    const speed = this.character.velocity.length()

    let prediction = this.maxPrediction
    if (speed >= distance / this.maxPrediction) {
      prediction = distance / speed
    }
    const lookAhead = this.target.velocity.scale(prediction)

    super.target.position.addInPlace(lookAhead)
    return super.getSteering()
  }
}
