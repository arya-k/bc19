import {SPECS} from 'battlecode';
import {CONSTANTS,COMM8,COMM16,CIRCLES} from './constants.js'
import {move_towards, move_to} from './path.js'

function dist(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2
}

// PSEUDOCODE
function defensiveBehavior(self, mode_location, base_location) {
  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  const vis_map = self.getVisibleRobotMap()
  self.log("HERE")
  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }
  self.log("HERE2")
  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }
  self.log("HERE3")
  if (mode_location !== null) {
    if (vis_map[mode_location[1]][mode_location[0]] == -1) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], mode_location, SPECS.UNITS[self.me.unit].SPEED,
                            SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    } else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  } else {
    self.log("HERE4")
    if (Math.abs(self.me.x - base_location[0]) > 1 || Math.abs(self.me.y - base_location[1]) > 1) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], mode_location, SPECS.UNITS[self.me.unit].SPEED, 1, 2)
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    } else if (self.me.karbonite > 0 || self.me.fuel > 0) {
      return self.give(base_location[0] - self.me.x, base_location[1] - self.me.y, self.me.karbonite, self.me.fuel);
    } else {
      return null; // nothing to do, just camp out.
    }
  }
}

function offensiveBehavior(self, mode_location) {
  const vis_map = self.getVisibleRobotMap()

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  if (vis_map[mode_location[1]][mode_location[0]] == -1) {
    let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], mode_location, SPECS.UNITS[self.me.unit].SPEED,
                            SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
    if (move !== null) {
      return self.move(move.x - self.me.x, move.y - self.me.y);
    } else {
      return null;
    }
  } else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
}

  
function escortBehavior(self, pilgrim_id) {
  let pilgrim = self.getRobot(pilgrim_id);
  const vis_map = self.getVisibleRobotMap();

  for (const dir of CIRCLES[2]) {
    if (self.map[pilgrim.y + dir[1]] && self.map[pilgrim.y + dir[1]][pilgrim.x + dir[0]]) {
      if (vis_map[pilgrim.y + dir[1]][pilgrim.x + dir[0]] > 0) {
        let r = self.getRobot(vis_map[pilgrim.y + dir[1]][pilgrim.x + dir[0]]);
        if (r.unit == SPECS.CHURCH && r.team == self.me.team) {
          return [CONSTANTS.ABANDON_ESCORT, [r.x, r.y]]
        } 
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return [0, self.attack(r.x - self.me.x, r.y - self.me.y)]
      }
    }
  }

  let move = move_towards(self.map, vis_map, [self.me.x, self.me.y], [pilgrim.x, pilgrim.y], SPECS.UNITS[self.me.unit].SPEED, 1, 2);
  if (move !== null) {
    return self.move(move.x - self.me.x, move.y - self.me.y);
  } else {
    return [0, null];
  }
}

function randomMoveBehavior() {
  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      if (dist([r.x, r.y], [self.me.x, self.me.y]) <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
        return self.attack(r.x - self.me.x, r.y - self.me.y)
      }
    }
  }

  for (const r of self.getVisibleRobots()) {
    if (r.unit !== null && r.team != self.me.team) {
      let move = move_towards(self.map, self.getVisibleRobotMap(), [self.me.x, self.me.y], [r.x, r.y], SPECS.UNITS[self.me.unit].SPEED,
                              SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0], SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]) {
    if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
      if (self.getVisibleRobotMap()[self.me.y + dir[1]][self.me.x + dir[0]] < 1) {
        return self.move(dir[0], dir[1])
      }
    }
  }
}


export class CrusaderManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = [];
    this.base_location = null;

    const vis_map = self.getVisibleRobotMap()
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED === null) { // castle or church
            this.base_location = [r.x, r.y];
            break;
          }
        }
      }
    }
  }

  turn(step, self) {
    for (const r of self.getVisibleRobots()) {
      if ((r.signal & COMM16.HEADER_MASK) == COMM16.ESCORT_HEADER) {
        if (this.mode != CONSTANTS.ESCORT) {
          this.mode = CONSTANTS.ESCORT
          this.mode_location = null;
          this.base_location = COMM16.DECODE_ESCORT(r.signal)
        }
      } else if ((r.signal & COMM16.HEADER_MASK) == COMM16.ATTACK_HEADER) {
        this.mode = CONSTANTS.ATTACK
        this.mode_location = COMM16.DECODE_ATTACK(r.signal)
      } else if ((r.signal & COMM16.HEADER_MASK) == COMM16.DISTRESS_HEADER) {
        this.mode = CONSTANTS.DEFENSE
        this.mode_location = COMM16.DECODE_DISTRESS(r.signal)
      }
    }

    if (this.mode == CONSTANTS.ESCORT) {
      let action = escortBehavior(self, this.base_location);
      if (action[0] == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSTANTS.DEFENSE;
        this.mode_location = null;
        this.base_location = action[1];
      } else {
        return action[1];
      }
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensiveBehavior(self, this.mode_location, this.base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
        action = defensiveBehavior(self, this.mode_location, this.base_location)
      }
      return action;
    }

    if (this.mode == CONSTANTS.ATTACK && this.mode_location !== null) {
      let action = offensiveBehavior(self, this.mode_location);
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.mode_location = null;
      } else {
        return action
      }
    }

    return randomMoveBehavior(self);
  }
}

// NOT USING THIS, SO DON'T WRITE IT
class ProphetManager {
  constructor(self) {
  }

  turn(step, self) {
  }
}

// PREACHER BEHAVIOR is just CRUSADER - the escort stuff
class PreacherManager {
  constructor(self) {
  }

  turn(step, self) {
  }
}