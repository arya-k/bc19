import {SPECS} from 'battlecode';
import {CONSTANTS,COMM8,COMM16,CIRCLES} from './constants.js'
import {move_towards, move_to} from './path.js'


// crusader, prophet, preacher
// CONSIDERATIONS FOR FUTURE (not now)
// Tell the castle if you're about to die. (potential death message/jk)

// NOTES FOR AJITH:
// Before you code this, read through Arya's code once.
// He had to handle a lot of these problems, and he has a similar structure, so
// reading his code will give you a feel for how to code this up.
// CIRCLES[r] gives you all relative directions within r range.
// So when I say find the move that minimizes the r^2 between something,
// All valid moves can be found with CIRCLES[SPECS.UNITS[self.unit].SPEED]
// if you want to make no move, you MUST return null.
// If you want just the 8 points around a given spot, use CIRCLES[2]

// PSEUDOCODE
function defensiveBehavior(self, mode_location, base_location) {
  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  if (can see enemy outside attackrange) {
    A* towards enemy
  } else if (can see enemy in attackrange) {
    attack the enemy
  } else if (modelocation is not null) {
    if (mode_location is out of visible range) {
      A* towards modelocation
    } else { // we've killed the enemy
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  }
  
  if (mode_location === null) {
    if (not adjacent to base_location) {
      A* towards base_location
    } else if (have resources) {
      deposit resources
    } else {
      return null; // nothing to do, just camp out.
    }
  }
}

function offensiveBehavior(self, mode_location) {
  // Attack enemies in range
  // OR
  // A* toward target
  visibleRobots = self.visibleRobots()
  if (enemy in attack_range)
    return self.attack(enemy)
  else if (enemy in visibleRobots)
    return self.move(A* in enemydirection)
  else if (cant see mode_location) {
    return self.move(A* toward mode_location)
  } else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
  
function escortBehavior(self, pilgrim_id) {
  if (church is next to pilgrim_id) {
    return CONSTANTS.ABANDON_ESCORT
  }
  else
    // you don't need A* for this one, just for loop through all possible moves.
    return self.move(smallest step that minimizes r^2 between me and my pilgrim)
}

function randomMoveBehavior() {
  // Just move randomly.
  visibleRobots = self.visibleRobots()
  if (enemy in attack_range)
    return this.attack(enemy)
  else if (enemy in visibleRobots)
    return this.move(A* in enemydirection)
  else
    move in a random direction;
}


class CrusaderManager() {
  function init() {
    this.pass_map = getPassableLocations();
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = [];
    this.base_location == the church OR castle immediately next to you;
  }
  function turn(step, self) {

    if (signal & COMM16.HEADER_MASK == COMM16.ESCORT_HEADER) { // this is how you figure out the signal type.
      this.mode = CONSTANTS.ESCORT
      this.mode_location = null;
      this.base_location = COMM16.DECODE_ESCORT(escort_signal) // base_location is the pilgrim id
    } else if (attack_signal) {
      this.mode = CONSTANTS.ATTACK
      this.mode_location = COMM16.DECODE_ATTACK(attack_signal)
    } else if (distress_signal) {
      this.mode = CONSTANTS.DEFENSE
      this.mode_location = COMM16.DECODE_DISTRESS(distress_signal)
    }

    if (mode is ESCORT) {
      action = escortBehavior(self, base_location)
      if (action == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSANTS.DEFENSE
        this.mode_location = null;
        this.base_location = (church next to pilgrim with id base_location)
      } else {
        return action;
      }
    } else if (mode is DEFENSE) {
      action = defensiveBehavior(self, mode_location, base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation == null;
        return null;
      } else {
        return action;
      }
    } else if (mode is ATTACK && this.modeLocation !== null){
      action = offensiveBehavior(self, mode_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation == null;
        return null;
      } else {
        return action;
      }
    } else {
      return randomMoveBehavior(self);
    }
  }
}

// NOT USING THIS, SO DON'T WRITE IT
class ProphetManager() {
  function init() {
  }
  function turn(step, self) {
  }
}

// PREACHER BEHAVIOR is just CRUSADER - the escort stuff
class PreacherManager() {
  function init() {
    this.pass_map = getPassableLocations();
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = [];
    this.base_location == the church OR castle immediately next to you;
  }
  function turn(step, self) {

    if (attack_signal) {
      this.mode = CONSTANTS.ATTACK
      this.mode_location = COMM16.DECODE_ATTACK(attack_signal)
    } else if (distress_signal) {
      this.mode = CONSTANTS.DEFENSE
      this.mode_location = COMM16.DECODE_DISTRESS(distress_signal)
    }

    if (mode is DEFENSE) {
      action = defensiveBehavior(self, mode_location, base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation == null;
        return null;
      } else {
        return action;
      }
    } else if (mode is ATTACK && this.modeLocation !== null){
      action = offensiveBehavior(self, mode_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation == null;
        return null;
      } else {
        return action;
      }
    } else {
      return randomMoveBehavior(self);
    }
  }
}
