import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {dist, is_valid, getNearbyRobots, getClearLocations, getAttackOrder} from './utils.js'
import {COMM8, COMM16} from './comm.js'
import {num_moves} from './path.js'

const HORDE_SIZE = 10;

// TODO: rebuild dead pilgrims
// TODO: fix signalling to incorrect target

// FUTURE: clear out enemy resource spots.
// FUTURE: return pilgrims to spots that they were killed trying to get to

// DONE: contribute to future attacks.
// DONE redo clump ordering to be a little smarter (remove the ones AT the enemy locations lol)
// DONE if castles are at clusters, build workers for the clusters
// DONE spawn more pilgrims to clumps whenever we run low on resources

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

function local_cluster_info(self) {
  let minicurrent, minix, miniy;

  let count = 0
  let maxr = 0
  let visited = new Set()
  let miniqueue = [(self.me.y<<6)|self.me.x];

  while (miniqueue.length > 0) {
    minicurrent = miniqueue.shift();
    minix = minicurrent&63
    miniy = (minicurrent&4032)>>6

    if (visited.has(minicurrent)){ continue; }

    if (self.fuel_map[miniy][minix] || self.karbonite_map[miniy][minix]) {
      maxr = Math.max(maxr, dist([self.me.x, self.me.y], [minix, miniy]))
      count++;
    } else if (miniy !== self.me.y || minix !== self.me.x) {
      continue; // don't continue exploring a non-fuel or karb. spot
    }

    visited.add(minicurrent);
    for (const dir of CIRCLES[8]) {
      if (is_valid(minix+dir[0], miniy+dir[1], self.map.length)) {
        miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
      }
    }
  }

  return [count, maxr];
}

function determine_enemy_locations(horiSym, castle_locs, N) {
  let ret = [];
  for (const loc of castle_locs)
    ret.push(horiSym ? [loc[0], N - loc[1] - 1] : [N - loc[0] - 1, loc[1]])
  return ret;
}

function find_resource_clusters(self, map, fuel_map, karb_map) {
  // returns [{x: [], y: [], fuel: [], karb: []}, ...] where (x,y) is ideal church location
  // and fuel and karb return the counts of fuel and karbonite.

  let clusters = []

  let visited = new Set()
  let queue = [0]; // start at the top left
  let current, x, y, new_k, new_f, miniqueue, minicurrent, minix, miniy, churchx, churchy, foundvalidloc;

  while (queue.length > 0) {
    current = queue.shift()
    x = current&63
    y = (current&4032)>>6

    if (visited.has(current)){ continue; } // seen before.

    if (fuel_map[y][x] || karb_map[y][x]) { // bfs to find the entire cluster
      new_k = []
      new_f = []
      miniqueue = [current]
      while (miniqueue.length > 0) {
        minicurrent = miniqueue.shift();
        minix = minicurrent&63
        miniy = (minicurrent&4032)>>6

        if (visited.has(minicurrent)){ continue; }

        if (fuel_map[miniy][minix]) {
          new_f.push(minicurrent)
        } else if (karb_map[miniy][minix]){
          new_k.push(minicurrent)
        } else {
          continue; // don't continue exploring a non-fuel or karb. spot
        }

        visited.add(minicurrent);
        for (const dir of CIRCLES[8]) {
          if (is_valid(minix+dir[0], miniy+dir[1], map.length)) {
            miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
          }
        }
      }

      // now that you've found the cluster, find the best spot to put a church:
      churchx = 0;
      churchy = 0;
      for (const spot of new_f) {
        churchx += (spot&63);
        churchy += ((spot&4032)>>6)
      }
      for (const spot of new_k) {
        churchx += (spot&63);
        churchy += ((spot&4032)>>6)
      }

      churchx = Math.floor(churchx / (new_f.length + new_k.length));
      churchy = Math.floor(churchy / (new_f.length + new_k.length));

      // search in a circle of radius 2 to find the best place to put the church:
      foundvalidloc = map[churchy][churchx] && (!fuel_map[churchy][churchx]) && (!karb_map[churchy][churchx]);
      if (!foundvalidloc) {
        for (let i = CIRCLES[4].length - 1; i >= 0; i--) {
          if (map[churchy + CIRCLES[4][i][1]] && map[churchy + CIRCLES[4][i][1]][churchx + CIRCLES[4][i][0]]) {
            if (!fuel_map[churchy + CIRCLES[4][i][1]][churchx + CIRCLES[4][i][0]]) {
              if (!karb_map[churchy + CIRCLES[4][i][1]][churchx + CIRCLES[4][i][0]]) {
                foundvalidloc = true;
                churchx += CIRCLES[4][i][0];
                churchy += CIRCLES[4][i][1];
                break;
              }
            }
          }
        }
      }

      if (foundvalidloc && dist([churchx, churchy], [self.me.x, self.me.y]) > 8) {
        clusters.push({x:churchx, y:churchy, fuel:new_f.length, karbonite:new_k.length})
      }
    }

    visited.add(current) // mark as visited

    for (const dir of CIRCLES[1] ) {
      if (is_valid(x+dir[0], y+dir[1], map.length)) {
        queue.push(((y+dir[1])<<6)|(x+dir[0]));
      }
    }
  }

  return clusters;
}

function sort_clusters(clusters_in, castle_locations, enemy_castle_locations) {
  let mean_x = 0;
  let mean_y = 0;

  for (const loc of castle_locations) {
    mean_x += loc[0];
    mean_y += loc[1];
  }

  mean_x = Math.floor(mean_x / castle_locations.length);
  mean_y = Math.floor(mean_y / castle_locations.length);

  // remove the clusters that we should NOT go to:
  let clusters = clusters_in.filter(function (cl) {
    for (const c of castle_locations)
      if (dist(c, [cl.x, cl.y]) <= 8)
        return false;

    for (const c of enemy_castle_locations)
      if (dist(c, [cl.x, cl.y]) <= 8)
        return false;

    return true;
  })

  // sort the array:
  clusters.sort(function(a, b) {
    if (a.fuel + a.karbonite > b.fuel + b.karbonite) {
      return 1; // a comes first;
    } else if (a.fuel + a.karbonite < b.fuel + b.karbonite) {
      return -1; // b comes first;
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return 1; // a has a batter ratio
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return -1; // b has a better ratio
    } else {
      return dist([a.x, a.y], [mean_x, mean_y]) < dist([b.x, b.y], [mean_x, mean_y]) ? 1 : -1;
    }
  })

  // then return the clusters:
  return clusters;
}

function get_best_cluster_castle(self, x, y, castle_locations) {
  let best_dist = null;
  let best_castle = null;
  let empty_vis_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(-1));

  for (const c of castle_locations) {
    let dist = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PILGRIM].SPEED, [x,y], c);
    if (dist !== null) {
      if (best_dist === null || dist < best_dist) {
        best_dist = dist;
        best_castle = c;
      }
    }
  }

  return best_castle;
}

function sort_enemy_attack_order(self, c_locs, e_locs) {
  let timed_pairs = [];
  let empty_vis_map = [...Array(self.map.length)].map(e => Array(self.map.length).fill(-1));

  for (let i=0; i<c_locs.length; i++) {
    let dist = num_moves(self.map, empty_vis_map, SPECS.UNITS[SPECS.PREACHER].SPEED, c_locs[i], e_locs[i]);
    timed_pairs.push([c_locs[i], e_locs[i], dist]) 
  }

  timed_pairs.sort(function (a,b) {
    if (a[2] !== null && b[2] !== null) {
      return a[2] - b[2];
    } else if (a[2] === null && b[2] !== null) {
      return 1;
    } else if (a[2] !== null && b[2] === null) {
      return -1;
    } else {
      return 0; 
    }
  })

  let to_ret = []
  for (const tp of timed_pairs)
    to_ret.push([tp[0], tp[1]]);
  return to_ret;
}


export class CastleManager {
  constructor(self) {
    self.log("CASTLE @ " + [self.me.x, self.me.y]);
    this.castle_locations = [];
    this.enemy_castle_locations = [];
    this.partial_points = [];

    this.horiSym = isHorizontalSymmetry(self.map, self.fuel_map, self.karbonite_map)

    this.castle_talk_queue = [COMM8.ENCODE_Y(self.me.y), COMM8.ENCODE_X(self.me.x)];
    this.build_signal_queue = [];

    this.resource_clusters = find_resource_clusters(self, self.map, self.fuel_map, self.karbonite_map)
    this.nearby_numresources = local_cluster_info(self)[0];

    this.church_claims = 0;
  }

  turn(step, self) {
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
      this.attack_targets = sort_enemy_attack_order(self, this.castle_locations, this.enemy_castle_locations);
      this.resource_clusters = sort_clusters(this.resource_clusters, this.castle_locations, this.enemy_castle_locations);
      this.attack_index = 0; // we attack the closest enemy first
      this.attack_party = new Set(); // keep track of my robot_ids
      this.attacked = 0;
    }

    // see if we've killed one of the enemies:
    for (const r of self.getVisibleRobots()) {
      if (r.castle_talk == COMM8.SWITCH_ENEMY_TARGET) {
        self.log("ENEMY CASTLE IS DEAD")
        this.attack_index += 1;
      } else if (r.castle_talk == COMM8.CLAIM_CASTLE) {
        this.church_claims++;
      } else if (r.castle_talk == COMM8.NEW_CASTLE) {
        this.church_claims--;
      }
    }

    let reportEnemyDead = false;
    for (const r of self.getVisibleRobots())
      if (r.castle_talk == COMM8.ENEMY_CASTLE_DEAD && this.attack_party.has(r.id))
        if (this.attack_targets[this.attack_index][0][0] == self.me.x &&
            this.attack_targets[this.attack_index][0][1] == self.me.y) // is it our turn to attack?
          reportEnemyDead = true;

    if (reportEnemyDead)
      this.castle_talk_queue.unshift(COMM8.SWITCH_ENEMY_TARGET);

    let building_locations = getClearLocations(self, 2);

    let myRobots = []; // gather my robots

    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team === self.me.team)
        myRobots.push(r);
    }

    // otherwise if they're close enough to whack, then whack them.
    let attackableEnemy = getAttackOrder(self);
    if (attackableEnemy.length > 0) {
      return self.attack(attackableEnemy[0].x - self.me.x, attackableEnemy[0].y - self.me.y);
    }

    // if you can build pilgrims, you should probably do that:
    if (step >= 2) { // only do it every 3 turns or so.
      let pilgrimCount = 0;
      for (const r of myRobots)
        if (r.unit == SPECS.PILGRIM)
          if (dist([r.x, r.y], [self.me.x, self.me.y]) <= 50)
            pilgrimCount++;

      if (pilgrimCount < this.nearby_numresources && self.fuel > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL &&
          self.karbonite > SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE) {
        this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(self.me.x, self.me.y)])
      } else {
        this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(self.me.x, self.me.y)]);
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

export class ChurchManager {
  constructor(self) {
    self.log("CHURCH @ " + [self.me.x, self.me.y])
    self.castleTalk(COMM8.NEW_CASTLE)

    let cluster_info = local_cluster_info(self);
    this.resource_count = cluster_info[0];
    this.resource_radius = cluster_info[1];

    this.build_queue = []
    for (let i = 1; i < this.resource_count; i++)
      this.build_queue.unshift(SPECS.PILGRIM)
  }

  turn(step, self) {
    let building_locations = getClearLocations(self, 2);

    let pilgrimCount = 0
    for (const r_id of getNearbyRobots(self, [self.me.x, self.me.y], SPECS.UNITS[SPECS.CHURCH].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team == self.me.team && r.unit == SPECS.PILGRIM) {
        if (dist([r.x, r.y], [self.me.x, self.me.y]) <= this.resource_radius) {
          pilgrimCount++;
        }
      }
    }
    // if we need to build more pilgrims, do that:
    if (this.build_queue.length == 0 && pilgrimCount < this.resource_count)
      this.build_queue.unshift(SPECS.PILGRIM)
    else if (this.build_queue.length == 0)
      this.build_queue.unshift(SPECS.PROPHET)

    if (this.build_queue.length > 0) {
      if (building_locations.length > 0 && 
          self.karbonite > SPECS.UNITS[this.build_queue[this.build_queue.length - 1]].CONSTRUCTION_KARBONITE &&
          self.fuel > SPECS.UNITS[this.build_queue[this.build_queue.length - 1]].CONSTRUCTION_FUEL) {
        return self.buildUnit(this.build_queue.pop(), building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y)
      } else if (available_karbonite > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_KARBONITE + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE) && 
          available_fuel > (SPECS.UNITS[SPECS.PILGRIM].CONSTRUCTION_FUEL + SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL) && 
          this.resource_clusters.length > 0 && (step % 10) == 0) {
        let best_cluster = this.resource_clusters.pop()
        let best_castle = get_best_cluster_castle(self, best_cluster.x, best_cluster.y, this.castle_locations);

        if (best_castle[0] == self.me.x && best_castle[1] == self.me.y) { // build a pilgrim + prophet:
          self.log("SENDING PILGRIM TO CLUSTER: " + [best_cluster.x, best_cluster.y])
          this.castle_talk_queue.unshift(COMM8.CLAIM_CASTLE)
          this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)]);
          this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(best_cluster.x, best_cluster.y)]);
        }
      }
    }

  }
}