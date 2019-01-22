import {CIRCLES} from './constants.js'
import {is_valid, dist} from './utils.js'

export function local_cluster_info(self) {
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

export function find_resource_clusters(self, map, fuel_map, karb_map) {
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

export function get_best_cluster_castle(self, x, y, castle_locations) {
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


export function sort_clusters(clusters_in, castle_locations, enemy_castle_locations) {
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