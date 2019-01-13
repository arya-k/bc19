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
  visibleRobots.forEach(function(r){
    if (self.team !== r.team){
      distance = ((r.x-self.x)**2)+((r.y-self.y)**2)
      if (distance > ATTACK_RANGES_MAX[unit]){
        return move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],ATTACK_RANGES_MIN[unit],ATTACK_RANGES_MAX[unit])
      }
      else if (distance <= ATTACK_RANGES_MAX[unit]){
        return this.attack(r.x-self.x,r.y-self.y)
      }
    }

  })
  if (mode_location !== null) {
    if ((((mode_location.x-self.x)**2)+((mode_location.y-self.y)**2)) > VISIBLE_RANGES[unit]) {
        return move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[r.x,r.y])
    } else { // we've killed the enemy
        return CONSTANTS.ELIMINATED_ENEMY;
    }
  }
  
  if (mode_location === null) {
    if ((((base_location.x-self.x)**2)+((base_location.y-self.y)**2)) > 2) {
       return move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[base_location.x,base_location.y])
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
  visibleRobots.forEach(function(r){
    if (self.team !== r.team){
      distance = ((r.x-self.x)**2)+((r.y-self.y)**2)
      if (distance > ATTACK_RANGES_MAX[unit]){
        return move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],ATTACK_RANGES_MIN[unit],ATTACK_RANGES_MAX[unit])
      }
      else if (distance <= ATTACK_RANGES_MAX[unit]){
        return this.attack(r.x-self.x,r.y-self.y)
      }
    }

  })
  else if ((((mode_location.x-self.x)**2)+((mode_location.y-self.y)**2)) > VISIBLE_RANGES[unit]) {
      return move_to(this.getPassableMap(),this.getVisibleRobotMap(),[self.x,self.y],[r.x,r.y])
  }
  else {
    return CONSTANTS.ELIMINATED_ENEMY;
  }
  
function escortBehavior(self, pilgrim_id) {
  var robotMap = this.getVisibleRobotMap()
  var pilgrim = this.getRobot(pilgrim_id)
  var pilgrimX = pilgrim.x
  var pilgrimY = pilgrim.y
  CIRCLES[2].forEach(function(r){
    if (this.getRobot[robotMap[r[1]+pilgrimY][r[0]+pilgrimX]].unit==1){
      return CONSTANTS.ABANDON_ESCORT
    }
  })

  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  visibleRobots.forEach(function(r){
    if (self.team !== r.team){
      if (distance <= ATTACK_RANGES_MAX[unit]){
        return this.attack(r.x-self.x,r.y-self.y)
      }
    }

  })
  
  else {
    var dx = pilgrimX-self.x
    dx = (dx/Math.abs(dx))*(Math.abs(dx)-1)
    var dy = pilgirmY-self.y
    dy = (dy/Math.abs(dy))*(Math.abs(dy)-1)
    var dr = (dx*dx)+(dy*dy)
    if (dr <= 9)
    {
      return this.move(dx,dy)
    }
    else{
      return this.move((dx/Math.abs(dx))*2,(dy/Math.abs(dy))*2)
    }
  }

}

function randomMoveBehavior() {
  var visibleRobots = this.getVisibleRobots()
  var unit = self.unit
  visibleRobots.forEach(function(r){
    if (self.team !== r.team){
      distance = ((r.x-self.x)**2)+((r.y-self.y)**2)
      if (distance > ATTACK_RANGES_MAX[unit]){
        return move_towards(this.getPassableMap(),this,getVisibleRobotMap(),[self.x,self.y],[r.x,r.y],ATTACK_RANGES_MIN[unit],ATTACK_RANGES_MAX[unit])
      }
      else if (distance <= ATTACK_RANGES_MAX[unit]){
        return this.attack(r.x-self.x,r.y-self.y)
      }
    }

  })
  var pass = this.getPassableMap()
  CIRCLES[1].forEach(function(r){
    if ((self.y+r[1])>0 && (self.x+r[0])>0 && (self.y+r[1])<pass.length && (self.x+r[0])<pass[0].length && pass[self.y+r[1]][self.x+r[0]]){
      return this.move(r.x-self.x,r.y-self.y)
    }
  })
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

    if (signal && COMM16.HEADER_MASK == COMM16.ESCORT_HEADER) { // this is how you figure out the signal type.
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
