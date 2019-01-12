import {SPECS} from 'battlecode';
// church, castle

class ChurchManager(){
  function init(self) {
    self.castleTalk(COMM8.BUILDUP_STAGE); // let castles know that the buildup stage has started.

    this.stage = CONSTANTS.BUILDUP
    // every time kryptonite > 70, we increment to_attack. 
    // If kryptonite <70, we set to_attack to 0. 
    // if to_attack >= 3, switch stage to ATTACK
    this.to_attack = 0; 

    // Every time a church is created, the pilgrim that created it will tell it where enemy castles are.
    if (signal & COMM16.HEADER_MASK == COMM16.ENEMYLOC_HEADER) {
      this.enemy_loc = COMM16.DECODE_ENEMYLOC(signal);
    }

  }
  function step(step, self) {
    // check if stage can change:
    if (this.stage == CONSTANTS.BUILDUP) { // check if we need to change the stage
      if (this.kryptonite > 70) {
        this.to_attack++;
      } else {
        this.to_attack = 0
      }

      if (this.to_attack >= 3) {
        this.stage = CONSTANTS.ATTACK
      }
    }

    if (this.stage == CONSTANTS.BUILDUP) {
      if (see any enemies) { // Look through arya's code -> he loops through visibleRobots to basically do this.
        if (see my crusader and have the fuel to message it) {
          self.signal(COMM16.DISTRESS(nearest enemy))
        }
      }
      return null;
    } else if (this.stage == CONSTANTS.ATTACK) {
      if (have resources to build crusader) {
        if (have room to build a crusader) {
          self.signal(COMM16.ATTACK(this.enemy_loc[0], this.enemy_loc[1])) // That way the crusader will attack the enemy
          return build crusader;
        }
      }
    }

  }
}