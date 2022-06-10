import { SteeringOutput } from './steering'
import { Align } from './align'
import NPC from '../core/npc'

export class LookWhereGoing extends Align {
  constructor(protected character: NPC) {
    super(character, { orientation: 0 })
  }

  getSteering(): SteeringOutput {
    const steering = this.steeringOutput()
    if (this.character.velocity.length() === 0) {
      return steering
    }
    this.target = {
      orientation: Math.atan2(this.character.velocity.x, this.character.velocity.z),
    }
    return super.getSteering()
  }
}
