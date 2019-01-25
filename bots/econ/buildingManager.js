import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {COMM8, COMM16} from './comm.js'
import {num_moves} from './path.js'
import {getNearbyRobots, canAfford, getClearLocations, getAttackOrder, dist} from './utils.js'
import {find_resource_clusters, local_cluster_info, determine_cluster_plan, get_best_cluster_castle} from './clusters.js'

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

function determine_enemy_locations(horiSym, castle_locs, N) {
  let ret = [];
  for (const loc of castle_locs)
    ret.push(horiSym ? [loc[0], N - loc[1] - 1] : [N - loc[0] - 1, loc[1]])
  return ret;
}


function determine_attack_plan(self, c_locs, e_locs) {
  let timed_pairs = [];
  let empty_vis_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(-1));

  for (let i=0; i<c_locs.length; i++) {
    let dist = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PROPHET].SPEED, c_locs[i], e_locs[i]);
    timed_pairs.push([c_locs[i], e_locs[i], dist]) 
  }

  timed_pairs.sort(function (a,b) { return a[2] - b[2] })

  let to_ret = []
  for (const tp of timed_pairs) {
    to_ret.push({me:tp[0], enemy:tp[1], lattice:(tp[2] <= 9)});
  }
  return to_ret;
}

export class CastleManager {
  constructor(self) {
    self.log("CASTLE @ " + [self.me.x, self.me.y])
    this.isHori = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map);

    this.castle_locations = [];
    this.enemy_castle_locations = [];
    this.partial_points = [];

    this.horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map)

    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)];
    this.build_signal_queue = [];

    this.resource_clusters = find_resource_clusters(self, self.map, self.fuel_map, self.karbonite_map)
    this.nearby_numresources = local_cluster_info(self)[0];
  }

  turn(step, self) {

    /* GATHERING CASTLE LOCATIONS */

    if (step <= 2) {
      for (const r of self.getVisibleRobots()) {
        if (COMM8.type(r.castle_talk) == COMM8.X_HEADER) {
          this.partial_points[r.id] = COMM8.DECODE_X(r.castle_talk);
        } else if (COMM8.type(r.castle_talk) == COMM8.Y_HEADER) {
          this.castle_locations.push([this.partial_points[r.id], COMM8.DECODE_Y(r.castle_talk)])
        }
      }
    }

    if (step == 2) { // we've just gotten castle location information.
      this.enemy_castle_locations = determine_enemy_locations(this.horiSym, this.castle_locations, self.map.length);
      this.attack_plan = determine_attack_plan(self, this.castle_locations, this.enemy_castle_locations);
      this.cluster_plan = determine_cluster_plan(this.resource_clusters, this.attack_plan, this.horiSym, self.map.length, self);
      this.attack_index = 0; // we attack the closest enemy first
      this.attack_party = new Set(); // keep track of my robot_ids
      this.attacked = 0;
    }

    // Count up units, build_locations, etc.
    let building_locations = getClearLocations(self, 2);
    let myRobots = {preacher:[], prophet:[], crusader:[], pilgrim:[]};
    let enemyRobots = {preacher:false, prophet:false, crusader:false}
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          myRobots.crusader.push(r);
        else if (r.unit == SPECS.PREACHER)
          myRobots.preacher.push(r);
        else if (r.unit == SPECS.PROPHET)
          myRobots.prophet.push(r)
        else if (r.unit == SPECS.PILGRIM)
          myRobots.pilgrim.push(r);
      } else if (r.team !== self.me.team) {
        if (r.unit == SPECS.CRUSADER)
          enemyRobots.crusader = r;
        else if (r.unit == SPECS.PREACHER)
          enemyRobots.preacher = r;
        else if (r.unit == SPECS.PROPHET)
          enemyRobots.prophet = r;
      }
    }

    /* ACTIVE DEFENSE */

    // if we see an enemy crusader, build a preacher if possible:
    if (enemyRobots.crusader !== false && myRobots.preacher.length < 2 && 
        canAfford(SPECS.PREACHER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.crusader.x, enemyRobots.crusader.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if they're close enough to whack, then whack them.
    let attackableEnemy = getAttackOrder(self);
    if (attackableEnemy.length > 0) {
      return self.attack(attackableEnemy[0].x - self.me.x, attackableEnemy[0].y - self.me.y)
    }

    // otherwise if we see an enemy prophet, build a crusader
    if (enemyRobots.prophet !== false && myRobots.crusader.length < 3 && 
        canAfford(SPECS.CRUSADER, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.prophet.x, enemyRobots.prophet.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      return self.buildUnit(SPECS.CRUSADER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    // otherwise if we see an enemy preacher, build a prophet:
    if (enemyRobots.preacher !== false && myRobots.prophet.length < 3 && 
        canAfford(SPECS.PROPHET, self) && building_locations.length > 0) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemyRobots.preacher.x, enemyRobots.preacher.y),
                  dist([self.me.x, self.me.y], building_locations[0]))
      return self.buildUnit(SPECS.PROPHET, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
    }

    /* BUILDING PILGRIMS FOR THINGS */
    if (canAfford(SPECS.PILGRIM, self) && self.fuel > 200) {
      let pilgrimCount = 0;
      for (const r of myRobots.pilgrim)
        if (dist([r.x, r.y], [self.me.x, self.me.y]) <= 50)
          pilgrimCount++;

      if (pilgrimCount < this.nearby_numresources) {
        this.build_signal_queue.unshift([SPECS.PILGRIM, null]);
      } else if (step >= 2 && this.cluster_plan.length > 0) {
        if (this.cluster_plan[this.cluster_plan.length - 1].defend) {
          if (self.fuel > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) &&
              self.karbonite > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE)) {
            let best_cluster = this.cluster_plan.pop();
            let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations)
            if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
              self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
              this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
              this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
            }
          }
        } else {
          let best_cluster = this.cluster_plan.pop();
          let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations)
          if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) {
            self.log("SENDING PILRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y]);
            this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)])
          }
        }
      }
    }



    // now, do any cached activities.
    if (this.castle_talk_queue.length > 0)
      self.castleTalk(this.castle_talk_queue.pop()); // not performant: doesn't matter

    if (this.build_signal_queue.length > 0) {
      if (building_locations.length > 0) {
        if (self.karbonite > SPECS.UNITS[this.build_signal_queue[this.build_signal_queue.length - 1][0]].CONSTRUCTION_KARBONITE &&
            self.fuel > (SPECS.UNITS[this.build_signal_queue[this.build_signal_queue.length - 1][0]].CONSTRUCTION_FUEL + 2)) {
          let bs = this.build_signal_queue.pop();
          if (bs[1] !== null)
            self.signal(bs[1], dist([self.me.x, self.me.y], building_locations[0]));
          if (bs[0] !== null)
            return self.buildUnit(bs[0], building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
        }
      }
    }
  }
}