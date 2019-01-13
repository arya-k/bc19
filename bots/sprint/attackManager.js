import {SPECS} from 'battlecode';
import {CONSTANTS,ATTACK_RANGES_MAX,ATTACK_RANGES_MIN,VISIBLE_RANGES,COMM8,COMM16,CIRCLES} from './constants.js'
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

function dist(my_location,other_location){
  return (my_location[0]-other_location.x)**2 + (my_location.y-other_location.y)**2
}
// PSEUDOCODE
function defensiveBehavior(self, mode_location, base_location) {
  // If you see the enemy, engage (moving towards if you need to).
  // Once you've killed the enemy, return to castle/church and deposit resources.
  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  for (const r of visibleRobots){
    if (self.team !== r.team){
      distance = dist([self.x,self.y],[r.x,r.y])
      if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        var move = move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
        if (move !== null) {
          return self.move(move.x - self.me.x, move.y - self.me.y);
        } else {
          return null; // NO MOVE POSSIBLE
        }
      }
      else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        return this.attack(r.x-self.x,r.y-self.y)
      }
    }
  
}  if (mode_location !== null) {
    if (dist([mode_location.x,mode_location.y],[self.x,self.y]) > SPECS.UNITS[unit].VISION_RADIUS) {
        move = move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[mode_location.x,mode_location.y])
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
    if (dist([base_location.x,base_location.y],[self.x,self.y]) > 2) {
       move= move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[base_location.x,base_location.y])
       if (move !== null) {
         return self.move(move.x - self.me.x, move.y - self.me.y);
       } else {
         return null; // NO MOVE POSSIBLE
       }
    }
    
    else if (self.karbonite > 0) {
       return(base_location.x-self.x,base_location.y-self.y,self.karbonite,0)
    } else {
      return null; // nothing to do, just camp out.
    }
  }
}

function offensiveBehavior(self, mode_location) {
  // Attack enemies in range
  // OR
  // A* toward target
  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  for (const r of visibleRobots){
      if (self.team !== r.team){
        distance = dist([self.x,self.y],[r.x,r.y])
        if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
          move= move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
          if (move !== null) {
            return self.move(move.x - self.me.x, move.y - self.me.y);
          } else {
            return null; // NO MOVE POSSIBLE
          }
        }
        else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
          return this.attack(r.x-self.x,r.y-self.y)
        }
      }
    
  }
  else if (dist([mode_location.x,mode_location.y],[self.x,self.y]) > SPECS.UNITS[unit].VISION_RADIUS) {
      move= move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[mode_location.x,mode_location.y])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null; // NO MOVE POSSIBLE
      }
  }
  else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
  
function escortBehavior(self, pilgrim_id) {
  var robotMap = this.getVisibleRobotMap()
  var pilgrim = this.getRobot(pilgrim_id)
  var pilgrimX = pilgrim.x
  var pilgrimY = pilgrim.y
  for (const r of CIRCLES[2]){
    if (this.getRobot[robotMap[r[1]+pilgrimY][r[0]+pilgrimX]].unit==1){
      return [CONSTANTS.ABANDON_ESCORT,this.getRobot[robotMap[r[1]+pilgrimY][r[0]+pilgrimX]].id]
    }
  }

  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  for (const r of visibleRobots){
    if (self.team !== r.team){
      if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
        return [0,this.attack(r.x-self.x,r.y-self.y)]
      }
    }

  }
  
  else {
    var dx = pilgrimX-self.x
    dx = (dx/Math.abs(dx))*(Math.abs(dx)-1)
    var dy = pilgirmY-self.y
    dy = (dy/Math.abs(dy))*(Math.abs(dy)-1)
    var dr = (dx*dx)+(dy*dy)
    if (dr <= 9)
    {
      return [0,this.move(dx,dy)]
    }
    else{
      return [0,this.move((dx/Math.abs(dx))*2,(dy/Math.abs(dy))*2)]
    }
  }

}

function randomMoveBehavior() {
  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  for (const r of visibleRobots){
      if (self.team !== r.team){
        distance = dist([self.x,self.y],[r.x,r.y])
        if (distance > SPECS.UNITS[unit].ATTACK_RADIUS[1]){
          move= move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],SPECS.UNITS[unit].ATTACK_RADIUS[0],SPECS.UNITS[unit].ATTACK_RADIUS[1])
          if (move !== null) {
            return self.move(move.x - self.me.x, move.y - self.me.y);
          } else {
            return null; // NO MOVE POSSIBLE
          }
        }
        else if (distance <= SPECS.UNITS[unit].ATTACK_RADIUS[1]){
          return this.attack(r.x-self.x,r.y-self.y)
        }
      } 
  }
  var pass = this.getPassableMap()
  for (const r of CIRCLES[SPECS.UNITS[unit].SPEED]){
    if ((self.y+r[1])>0 && (self.x+r[0])>0 && (self.y+r[1])<pass.length && (self.x+r[0])<pass[0].length && pass[self.y+r[1]][self.x+r[0]]){
      return this.move(r.x-self.x,r.y-self.y)
    }
  }
}


class CrusaderManager() {
  function constructor(startx,starty,pass_map,visibleRobots) {
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
  function turn(step, self) {
    for (const r of self.getVisibleRobots()){
      if (r.signal){
        if (COMM16.HEADER_MASK == COMM16.ESCORT_HEADER){
          this.mode = CONSTANTS.ESCORT
          this.mode_location = null;
          var tmp = COMM16.DECODE_ESCORT(escort_signal)
          this.base_location = {x:tmp[0],y:tmp[1],}
        }
        else if (COMM16.HEADER_MASK == COMM16.ATTACK_HEADER){
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

    if (this.mode == CONSTANTS.ESCORT) {
      var action = escortBehavior(self, base_location)
      if (action[0] == CONSTANTS.ABANDON_ESCORT) {
        this.mode = CONSANTS.DEFENSE
        this.mode_location = null;
        this.base_location = action[1]  
      } else {
        return action[1];
      }
    } else if (this.mode == CONSTANTS.DEFENSE) {
      var action = defensiveBehavior(self, mode_location, base_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
        return null;
      } else {
        return action;
      }
    } else if (this.mode == CONSTANTS.OFFENSE && this.modeLocation !== null){
      var action = offensiveBehavior(self, mode_location)
      if (action == CONSTANTS.ELIMINATED_ENEMY) {
        this.modeLocation = null;
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
  function init(startx,starty,pass_map,visibleRobots) {
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
  function turn(step, self) {
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
    else if (this.mode == CONSTANTS.OFFENSE && this.modeLocation !== null){
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
