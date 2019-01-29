import {SPECS} from 'battlecode';
import {CONSTANTS, CIRCLES} from './constants.js'
import {move_towards, move_to, no_swarm, move_away} from './path.js'
import {COMM8,COMM16} from './comm.js'
import {getAttackOrder, has_adjacent_castle, getNearbyRobots, dist, is_valid, is_passable} from './utils.js'

function attack_behaviour_aggressive(self, mode_location, base_location){
  //Always pursue mode_location, and kill anyone seen

  //attack enemy if possible
  let targets = getAttackOrder(self)
  if (targets.length>0){
    return self.attack(targets[0].x-self.me.x,targets[0].y-self.me.y)
  }

  //pursue visible enemies without swarming
  for (const r of self.getVisibleRobots()) {
    if (self.isVisible(r) && r.unit !== null && r.team != self.me.team) {
      let move = no_swarm(self,[self.me.x,self.me.y],[r.x,r.y])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      }
    }
  }

  //If nobody is visible, just pursue the mode_location (which in this case would be the enemy)
  if (mode_location !== null) {
    let vis_map = self.getVisibleRobotMap()
    if (vis_map[mode_location[1]][mode_location[0]] != 0) {
      let move = move_towards(self, [self.me.x, self.me.y], [mode_location[0], mode_location[1]])
      if (move !== null) {
        return self.move(move.x - self.me.x, move.y - self.me.y);
      } else {
        return null;
      }
    } else {
      return CONSTANTS.ELIMINATED_ENEMY;
    }
  }
  return null
}
function isHorizontalSymmetry(pass_map, fuel_map, karb_map) {
  let N = pass_map.length;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < Math.floor(N/2); j++) {
      if (pass_map[j][i] != pass_map[N - j - 1][i] ||
          fuel_map[j][i] != fuel_map[N - j - 1][i] ||
          karb_map[j][i] != karb_map[N - j - 1][i]) {
        return false;
      }
    }
  }
  return true;
}
export class PreacherManager {
  constructor(self) {
    this.mode_location = null;
    this.base_location = null;

    const vis_map = self.getVisibleRobotMap()
    for (const dir of CIRCLES[2]) {
      if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) {
        if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
          let r = self.getRobot(vis_map[self.me.y + dir[1]][self.me.x + dir[0]]);
          if (r.team == self.me.team && SPECS.UNITS[r.unit].SPEED == 0) { // castle or church
            this.base_location = [r.x, r.y];
            break;
          }
        }
      }
    }

    if (isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map)) {
      this.mode_location = [this.base_location[0], self.map.length - this.base_location[1] - 1];
    } else {
      this.mode_location = [self.map.length - this.base_location[0] - 1, this.base_location[1]];
    }
  }

  turn(step, self) {
    let action = attack_behaviour_aggressive(self, this.mode_location, this.base_location)
    if (action == CONSTANTS.ELIMINATED_ENEMY) {
      action = null;
    }
    return action;
  }
}