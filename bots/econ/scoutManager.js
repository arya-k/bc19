import {SPECS} from 'battlecode';
import {CONSTANTS,CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {move_towards, move_to, move_away, num_moves, sneak} from './path.js'
import {dist, is_valid, getAttackOrder} from './utils.js'

export class ScoutManager {
  constructor(self) {
    this.mode = CONSTANTS.SCOUT;
    this.scout_location = null;
    this.base_location = null;
    this.seen_enemies = new Set();
    this.enemy_count = {};
    this.enemy_count[SPECS.PILGRIM] = 0;
    this.enemy_count[SPECS.CRUSADER] = 0;
    this.enemy_count[SPECS.PROPHET] = 0;
    this.enemy_count[SPECS.PREACHER] = 0;
    this.enemy_count[SPECS.CHURCH] = 0;

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
    let allies = [];
    let signal = false;
    for (const r of self.getVisibleRobots()) {
      if (r.team !== null && r.team != self.me.team && SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE != 0) {
        if (!this.seen_enemies.has(r.id)) {
          this.seen_enemies.add(r.id);
          this.enemy_count[r.unit] += 1;
        }
        enemies.push(r);
      }
      if (r.team !== null && r.team == self.me.team && SPECS.UNITS[r.unit].ATTACK_DAMAGE !== null && SPECS.UNITS[r.unit].ATTACK_DAMAGE != 0) {
        if (dist([self.me.x, self.me.y], [r.x, r.y]) <= 25) {
          signal = true;
        }
        allies.push(r);
      }
    }
    let move = move_away(self, enemies)
    if (move !== null) {
      //TODO self.castleTalk();
      return self.move(...move);
    }

    if (this.mode == CONSTANTS.SCOUT) {
      let move_node = sneak(self, [self.me.x, self.me.y], this.scout_location);
      if (move_node !== null) {
        return self.move(move_node.x - self.me.x, move_node.y - self.me.y);
      } else {
        this.mode = CONSTANTS.CHILLIN;
        //TODO self.castleTalk();
      }
    }

    if (this.mode == CONSTANTS.CHILLIN) {
      if (signal) {
        let temp = getAttackOrder(self)[0];
        self.signal(COMM16.ENCODE_ENEMYSIGHTING(temp.x, temp.y), 100);
      }
      return null;
    }

    return null;

    // get as far in as you can while keeping out of vision
    // castle talk when as far in, or have to move_away
    // chill until threatened or reinforcements come
    // if reinforcements come then signal the enemy locations 
  }
}