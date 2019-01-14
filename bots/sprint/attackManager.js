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
// All valid moves can be found with CIRCLES[SPECS.UNITS[self.me.unit].SPEED]
// if you want to make no move, you MUST return null.
// If you want just the 8 points around a given spot, use CIRCLES[2]

function dist(a,b){
  return (a[0]-b[0])**2 + (a[1]-b[1])**2
}
// PSEUDOCODE
function defensiveBehavior(self, mode_location, base_location) {
  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  var visibleRobots = self.getVisibleRobots()
  var unit = self.me.unit
  for (const r of visibleRobots){
    if (r.team !== null && self.me.team !== r.team){
      let distance = dist([self.me.x,self.me.y],[r.x,r.y])
      if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        let move = move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.me.x,self.me.y],[r.x,r.y],SPECS.UNITS[unit].SPEED,SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y);
        } else {
          return null; // NO MOVE POSSIBLE
        }
      } else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        return self.attack(r.x-self.me.x,r.y-self.me.y)
      }
    }
  }

  if (mode_location !== null) {
    if (dist([mode_location[0],mode_location[1]],[self.me.x,self.me.y]) > SPECS.UNITS[unit].VISION_RADIUS) {
        let move = move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.me.x,self.me.y],mode_location,SPECS.UNITS[unit].SPEED,SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y);
        } else {
          return null; // NO MOVE POSSIBLE
        }
    } else { // we've killed the enemy
        return CONSTANTS.ELIMINATED_ENEMY;
    }
  }
  
  if (mode_location === null) {
    if (Math.abs(base_location[0] - self.me.x) <= 1 && Math.abs(base_location[1] - self.me.y) <= 1)  {
       let move = move_towards(this.getPassableMap(),this.getVisibleRobotMap(),[self.me.x,self.me.y],base_location,SPECS.UNITS[unit].SPEED, 1, 2)
       if (move !== null) {
         return self.move(move.x - self.me.x, move.y - self.me.y);
       } else {
         return null; // NO MOVE POSSIBLE
       }
    } else if (self.me.karbonite > 0 || self.me.fuel > 0) {
       return self.give(base_location[0]-self.me.x,base_location[1]-self.me.y,self.me.karbonite,self.me.fuel)
    } else {
      return null; // nothing to do, just camp out.
    }
  }
}

function offensiveBehavior(self, mode_location) {
  // Attack enemies in range
  // OR
  // A* toward target
  var visibleRobots = self.getVisibleRobots()
  var unit = self.me.unit

  for (const r of visibleRobots){
    if (r.team !== null && self.me.team !== r.team){
      let distance = dist([self.me.x,self.me.y],[r.x,r.y])
      if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        let move = move_towards(self.getPassableMap(),self,getVisibleRobotMap(),[self.me.x,self.me.y],
                                [r.x,r.y],SPECS.UNITS[unit].SPEED,SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y);
        } else {
          return null; // NO MOVE POSSIBLE
        }
      } else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        return self.attack(r.x-self.me.x,r.y-self.me.y)
      }
    }
  }

  if (dist([mode_location[0],mode_location[1]],[self.me.x,self.me.y]) > SPECS.UNITS[unit].VISION_RADIUS) {
    let move = move_towards(self.getPassableMap(),self,getVisibleRobotMap(),[self.me.x,self.me.y],mode_location,
                        SPECS.UNITS[unit].SPEED,SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
    if (move !== null) {
      return self.move(move.x - self.me.x, move.y - self.me.y);
    } else {
      return null; // NO MOVE POSSIBLE
    }
  } else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
}
  
function escortBehavior(self, pilgrim_id) {
  var robotMap = self.getVisibleRobotMap()
  var pilgrim = self.getRobot(pilgrim_id)
  var pilgrimX = pilgrim.x
  var pilgrimY = pilgrim.y
  self.log("HERE1")
  for (const dir of CIRCLES[2]){
    if (robotMap[dir[1]+pilgrimY] && robotMap[dir[1]+pilgrimY][dir[0]+pilgrimX]) {
      if (robotMap[dir[1]+pilgrimY][dir[0]+pilgrimX] > 0) {
        let r = self.getRobot(robotMap[dir[1]+pilgrimY][dir[0]+pilgrimX])
        if (r.team == self.me.team && r.unit == SPECS.CHURCH) {
          return [CONSTANTS.ABANDON_ESCORT,self.getRobot[robotMap[dir[1]+pilgrimY][dir[0]+pilgrimX]].id]
        }
      }
    }
  }
  self.log("HERE2")
  self.log(pilgrimX)
  self.log(pilgrimY)
  var visibleRobots = self.getVisibleRobots()
  var unit = self.me.unit
  for (const r of visibleRobots) {
    if (r.team !== null && self.me.team !== r.team) {
      if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]) {
        return [0,self.attack(r.x-self.me.x,r.y-self.me.y)]
      }
    } else {
      let move = move_towards(self.getPassableMap(),self.getVisibleRobotMap(),[self.me.x,self.me.y],[pilgrimX, pilgrimY], SPECS.UNITS[self.me.unit].SPEED, 1, 2)
      self.log(move)
      if (move !== null) {
        return [0, self.move(move.x - self.me.x, move.y - self.me.y)]
      } else {
        return [0, null]
      }
    }
  }
}

function randomMoveBehavior() {
  var visibleRobots = self.getVisibleRobots()
  var unit = self.me.unit

  for (const r of visibleRobots){
    if (r.team !== null && self.me.team !== r.team){
      let distance = dist([self.me.x,self.me.y],[r.x,r.y])
      if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        let move = move_towards(self.getPassableMap(),self,getVisibleRobotMap(),[self.me.x,self.me.y],
                                [r.x,r.y],SPECS.UNITS[unit].SPEED,SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y);
        } else {
          return null; // NO MOVE POSSIBLE
        }
      } else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        return self.attack(r.x-self.me.x,r.y-self.me.y)
      }
    }
  }

  var pass = self.getPassableMap()
  for (const r of CIRCLES[SPECS.UNITS[unit].SPEED]){
    if (pass[self.me.y+r[1]] && pass[self.me.y+r[1]][self.me.x+r[0]]){
      if (self.getVisibleRobotMap()[self.me.y+r[1]][self.me.x+r[0]] < 1) {
        return self.move(r.x-self.me.x,r.y-self.me.y)
      }
    }
  }
}


export class CrusaderManager {
  constructor(self) {
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = [];

    const vis_map = self.getVisibleRobotMap()

    for (const r of self.getVisibleRobots()) {
      if (r.team !== null && r.team == self.me.team && (r.unit == SPECS.CASTLE || r.unit == SPECS.CHURCH)) {
        if (Math.abs(self.me.x - r.x) <= 1 && Math.abs(self.me.y - r.y) <= 1) {
          this.base_location = [r.x, r.y];
        }
      }
    }
  }
  turn(step, self) {
    for (const r of self.getVisibleRobots()){
      if ((r.signal & COMM16.HEADER_MASK) == COMM16.ESCORT_HEADER && this.mode != CONSTANTS.ESCORT){
        this.mode = CONSTANTS.ESCORT
        this.mode_location = null;
        this.base_location = COMM16.DECODE_ESCORT(r.signal)
      }
      else if ((r.signal & COMM16.HEADER_MASK) == COMM16.ATTACK_HEADER){
        this.mode = CONSTANTS.ATTACK
        this.mode_location = COMM16.DECODE_ATTACK(r.signal)
      }
      else if ((r.signal & COMM16.HEADER_MASK) == COMM16.DISTRESS_HEADER){
        this.mode = CONSTANTS.DEFENSE
        this.mode_location = COMM16.DECODE_DISTRESS(r.signal)
      }
    }

    if (this.mode == CONSTANTS.ESCORT) {
      let action = escortBehavior(self, this.base_location)
      self.log(action)
      if (action[0] == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSANTS.DEFENSE
        this.mode_location = null;
        this.base_location = action[1]  
      } else {
        return action[1];
      }
    }

    if (this.mode == CONSTANTS.DEFENSE) {
      let action = defensiveBehavior(self, this.mode_location, this.base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
        return null;
      } else {
        return action;
      }
    }

    if (this.mode == CONSTANTS.ATTACK && this.modeLocation !== null){
      let action = offensiveBehavior(self, this.mode_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
      } else {
        return action;
      }
    }
    
    return randomMoveBehavior(self);

  }
}

// NOT USING THIS, SO DON'T WRITE IT
class ProphetManager {
  constructor() {
  }
  turn(step, self) {
  }
}

// PREACHER BEHAVIOR is just CRUSADER - the escort stuff
class PreacherManager {
  constructor(startx,starty,pass_map,visibleRobots) {
    this.pass_map = pass_map;
    this.mode = CONSTANTS.DEFENSE
    this.mode_location = [];
    for (let r of CIRCLES[2]) {
      if (visibleRobots[starty+r[1]][startx+r[0]].unit == 0 || visibleRobots[starty+r[1]][startx+r[0]].unit == 1) {
        this.base_location={x:startx+r[0],y:starty+r[1],}
        break;
      }
    }
  }
  turn(step, self) {
    for (const r of self.getVisibleRobots()){
      if (r.signal){
        if (COMM16.HEADER_MASK == COMM16.ATTACK_HEADER){
          this.mode = CONSTANTS.ATTACK
          var tmp = COMM16.DECODE_ATTACK(attack_signal)
          this.mode_location = {x:tmp[0],y:tmp[1],}
        }
        else if (COMM16.HEADER_MASK == COMM16.DISTRESS_HEADER){
          this.mode = CONSTANTS.DEFENSE
          var tmp = COMM16.DECODE_DISTRESS(distress_signal)
          this.mode_location = {x:tmp[0],y:tmp[1],}
        }
      } 
    }
    if (this.mode == CONSTANTS.DEFENSE) {
      var action = defensiveBehavior(self, mode_location, base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
        return null;
      } 
      else {
        return action;
      }
    } 
    else if (this.mode == CONSTANTS.ATTACK && this.modeLocation !== null){
      var action = offensiveBehavior(self, mode_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
        return null;
      } else {
        return action;
      }
    } 
    else {
      return randomMoveBehavior(self);
    }
  }
}
