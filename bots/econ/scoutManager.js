import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {move_towards, move_to, move_away, num_moves} from './path.js'
import {dist, is_valid} from './utils.js'

export class ScoutManager {
  constructor(self) {
    this.mode = CONSTANTS.SCOUT;
    this.scout_location = null;
    this.base_location = null;
    this.seen_enemies = new Set();
    this.enemy_count = {SPECS.PILGRIM : 0, SPECS.CRUSADER : 0, SPECS.PROPHET : 0, SPECS.PREACHER : 0, SPECS.CHURCH : 0}

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
  }

  turn(step, self) {
    if (this.scout_location === null) {
      for (const r of self.getVisibleRobots()) {
        if (COMM16.type(r.signal) == COMM16.SCOUT_HEADER) {
          this.scout_location = COMM16.DECODE_SCOUT(r.signal);
        }
      }
    }
    let enemies = [];
    for (const r of self.getVisibleRobots()) {
      if (r.team !== null && r.team != self.me.team && SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE != 0) {
        if (!this.seen_enemies.has(r.id)) {
          this.seen_enemies.add(r.id);
          this.enemy_count[r.unit] += 1;
        }
        enemies.push(r);
      }
    }
    let move = move_away(self, enemies)
    if (move !== null) {
      self.castleTalk();
      self.move(...move);
    }


    // get as far in as you can while keeping out of vision
    // castle talk when 
    // chill until threatened or reinforcements come
    // if reinforcements come then signal the enemy locations 
  }
}