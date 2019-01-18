import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {dist, is_valid, getNearbyRobots, getClearLocations, getAttackOrder} from './utils.js'
import {COMM8, COMM16} from './comm.js'
import {num_moves} from './path.js'

const HORDE_SIZE = 10;

// redo clump ordering to be a little smarter
// spawn more pilgrims to clumps whenever we run low on resources
// plan hordes
// track horde sizes
// send the hordes out to attack.

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

function find_resource_clusters(map, fuel_map, karb_map) {
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

      if (foundvalidloc) {
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

function get_best_cluster(clusters, castle_locations) {
  let mean_x = 0;
  let mean_y = 0;

  for (const loc of castle_locations) {
    mean_x += loc[0];
    mean_y += loc[1];
  }

  mean_x = Math.floor(mean_x / castle_locations.length);
  mean_y = Math.floor(mean_y / castle_locations.length);

  // sort the array:
  clusters.sort(function(a, b) {
    if (a.fuel + a.karbonite > b.fuel + b.karbonite) {
      return -1; // a comes first;
    } else if (a.fuel + a.karbonite < b.fuel + b.karbonite) {
      return 1; // b comes first;
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return -1; // a has a batter ratio
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return 1; // b has a better ratio
    } else {
      return dist([a.x, a.y], [mean_x, mean_y]) > dist([b.x, b.y], [mean_x, mean_y]) ? 1 : -1;
    }
  })

  // then return the largest one:
  return clusters[0];
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
    to_ret.push(tp[1]);
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

    this.resource_clusters = find_resource_clusters(self.map, self.fuel_map, self.karbonite_map);
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

      this.best_cluster = get_best_cluster(this.resource_clusters, this.castle_locations)

      if (this.best_cluster === undefined) {
        self.log("ERROR! BROKEN MAP.");
        return;
      }

      this.best_castle = get_best_cluster_castle(self, this.best_cluster.x, this.best_cluster.y, this.castle_locations);

      if (this.best_castle[0] == self.me.x && this.best_castle[1] == self.me.y) {
        // build a pilgrim + prophet:
        this.build_signal_queue.unshift([SPECS.PILGRIM, COMM16.ENCODE_BASELOC(this.best_cluster.x, this.best_cluster.y)]);
        this.build_signal_queue.unshift([SPECS.PROPHET, COMM16.ENCODE_BASELOC(this.best_cluster.x, this.best_cluster.y)]);
      }
    }

    let myRobots = []; // gather my robots
    let enemy_crusader = null; // should spawn preacher
    let enemy_attacker = null; // non-crusader. should spawn prophet.
    for (const r_id of getNearbyRobots(self, SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS)) {
      let r = self.getRobot(r_id);
      if (r.team === self.me.team) {
        myRobots.push(r);
      } else if (r.team !== self.me.team) {
        if (r.unit == SPECS.CRUSADER){
          enemy_crusader = r;
        } else if (r.unit == SPECS.PROPHET || r.unit == SPECS.PREACHER) {
          enemy_attacker = r;
        }
      }
    }

    let building_locations = getClearLocations(self, 2);

    // if we see a crusader, it's gonna be in groups, so we should just build a preacher.
    if (enemy_crusader !== null &&
        self.fuel >= SPECS.UNITS[SPECS.PREACHER].FUEL_CAPACITY &&
        self.karbonite >= SPECS.UNITS[SPECS.PREACHER].KARBONITE_CAPACITY &&
        building_locations.length > 0 ) {
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(enemy_crusader.x, enemy_crusader.y), dist([self.me.x, self.me.y], building_locations[0]))
      return self.buildUnit(SPECS.PREACHER, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y)
    }

    // otherwise if they're close enough to whack, then whack them.
    let attackableEnemy = getAttackOrder(self);
    if (attackableEnemy.length > 0) {
      return self.attack(attackableEnemy[0].x - self.me.x, attackableEnemy[0].y - self.me.y);
    }

    // active defense: if we can't whack them, build units that CAN whack them:
    if ((enemy_crusader !== null || enemy_attacker !== null) &&
        self.fuel >= SPECS.UNITS[SPECS.PROPHET].FUEL_CAPACITY &&
        self.karbonite >= SPECS.UNITS[SPECS.PROPHET].KARBONITE_CAPACITY &&
        building_locations.length > 0 ) {
      let r = enemy_crusader !== null ? enemy_crusader : enemy_attacker;
      self.signal(COMM16.ENCODE_ENEMYSIGHTING(r.x, r.y), dist([self.me.x, self.me.y], building_locations[0]))
      return self.buildUnit(SPECS.PROPHET, building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y)
    }

    // passive defense: single prophet after 10 rounds if we can do it comfortably.
    if (step >= 10) // we'll build it sooner if we're attacked.
      if (self.karbonite > (2 * SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_KARBONITE) &&
          self.fuel > (2 * SPECS.UNITS[SPECS.PROPHET].CONSTRUCTION_FUEL))
        if (!myRobots.some(function(r) { return r.unit == SPECS.PROPHET })) // no prophets exist.
          if (!this.build_signal_queue.some(function (bs) { return bs[0] != SPECS.PROPHET }))
            this.build_signal_queue.unshift([SPECS.PROPHET, null]);


    // now, do any cached activities.
    if (this.castle_talk_queue.length > 0)
      self.castleTalk(this.castle_talk_queue.pop()); // not performant: doesn't matter

    if (this.build_signal_queue.length > 0) {
      let building_locations = getClearLocations(self, 2);
      if (building_locations.length > 0) {
        let bs = this.build_signal_queue.pop();
        if (bs[1] !== null)
          self.signal(bs[1], dist([self.me.x, self.me.y], building_locations[0]));
        if (bs[0] !== null)
          return self.buildUnit(bs[0], building_locations[0][0] - self.me.x, building_locations[0][1] - self.me.y);
      }
    }
  }
}