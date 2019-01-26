import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {is_valid, dist} from './utils.js'
import {num_moves} from './path.js'

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
    for (const dir of CIRCLES[10]) {
      if (is_valid(minix+dir[0], miniy+dir[1], self.map.length)) {
        miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
      }
    }
  }

  return [count, maxr];
}

function pick_church_location(new_f, new_k, map, fuel_map, karb_map, self) {
  // now that you've found the cluster, find the best spot to put a church:
  let churchx = 0;
  let churchy = 0;
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

  // consider the point at the center.
  let best_point = [churchx, churchy];
  let best_score = 0;
  if (!fuel_map[churchy][churchx] && 
      !karb_map[churchy][churchx] &&
      map[churchy][churchx]) {
    for (const spot of new_f)
      best_score += dist([churchx, churchy], [spot&63, (spot&4032)>>6]);
    for (const spot of new_k)
      best_score += dist([churchx, churchy], [spot&63, (spot&4032)>>6]);
  } else {
    best_score = 1<<12; // infinity
  }

  // now, consider other points
  for (const dir of CIRCLES[16]) {
    if (is_valid(churchx+dir[0], churchy+dir[1], map.length) && 
        !fuel_map[churchy+dir[1]][churchx+dir[0]] &&
        !karb_map[churchy+dir[1]][churchx+dir[0]] &&
        map[churchy+dir[1]][churchx+dir[0]]) {
      let score = 0;
      for (const spot of new_f)
        score += dist([churchx+dir[0], churchy+dir[1]], [spot&63, (spot&4032)>>6]);
      for (const spot of new_k)
        score += dist([churchx+dir[0], churchy+dir[1]], [spot&63, (spot&4032)>>6]);
      
      if (score < best_score) {
        best_score = score;
        best_point = [churchx+dir[0], churchy+dir[1]];
      }
    }
  }

  return best_point
}

export function find_resource_clusters(self, map, fuel_map, karb_map) {
  // returns [{x: [], y: [], fuel: [], karb: []}, ...] where (x,y) is ideal church location
  // and fuel and karb return the counts of fuel and karbonite.

  let clusters = []

  let visited = new Set()
  let queue = [0]; // start at the top left
  let current, x, y, new_k, new_f, miniqueue, minicurrent, minix, miniy, churchx, churchy;

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
        for (const dir of CIRCLES[10]) {
          if (is_valid(minix+dir[0], miniy+dir[1], map.length)) {
            miniqueue.push(((miniy+dir[1])<<6)|(minix+dir[0]));
          }
        }
      }
      [churchx, churchy] = pick_church_location(new_f, new_k, map, fuel_map, karb_map, self);
      clusters.push({x:churchx, y:churchy, fuel:new_f.length, karbonite:new_k.length})
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

export function determine_cluster_plan(clusters_in, attack_plan, horiSym, maplen, self) {
  // clusters at castles are not considered:
  let valid_clusters = clusters_in.filter(function (cl) {
    for (const ap of attack_plan) {
      if (dist([cl.x, cl.y], ap.me) <= 10 || dist([cl.x, cl.y], ap.enemy) <= 10)
        return false;
    }
    return true;
  })

  // first we need to figure out if there are any clusters that we should fight over, near the center:
  let clusters_on_our_side = valid_clusters.filter(function (cl) {
    if (horiSym && attack_plan[0].me[1] <= (Math.ceil(maplen / 2) + 1)) // top
      return cl.y <= (Math.ceil(maplen / 2) + 1);
    else if (horiSym && attack_plan[0].me[1] >= (Math.ceil(maplen / 2) - 1)) // bottom
      return cl.y >= (Math.ceil(maplen / 2) - 1);
    else if (!horiSym && attack_plan[0].me[0] <= (Math.ceil(maplen / 2) + 1)) // left
      return cl.x <= (Math.ceil(maplen / 2) + 1);
    else if (!horiSym && attack_plan[0].me[0] >= (Math.ceil(maplen / 2) - 1)) // right
      return cl.x >= (Math.ceil(maplen / 2) - 1);
  })

  // protect the clusters near the center (if any).
  for (let cl of clusters_on_our_side) {
    if ((horiSym && (Math.abs(cl.y - (maplen/2)) <= 6)) ||
        (!horiSym && (Math.abs(cl.x - (maplen/2)) <= 6))) { // cluster near center:
      cl.defend = true;
    } else {
      cl.defend = false;
    }
  }

  let mean_x = 0, mean_y = 0;
  for (const ap of attack_plan){
    mean_x += ap.me[0];
    mean_y += ap.me[1];
  }
  mean_x = Math.floor(mean_x / attack_plan.length);
  mean_y = Math.floor(mean_y / attack_plan.length);

  // sort the array:
  clusters_on_our_side.sort(function(a, b) {
    if (a.defend && !b.defend) {
      return 1; // the ones that have to be defended are priority (a has to be defended)
    } else if (!a.defend && b.defend) {
      return -1; // b has do be defended
    } else if (a.fuel + a.karbonite > b.fuel + b.karbonite) {
      return 1; // a comes first;
    } else if (a.fuel + a.karbonite < b.fuel + b.karbonite) {
      return -1; // b comes first;
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return 1; // a has a batter ratio
    } else if (Math.abs(a.fuel - a.karbonite) < Math.abs(b.fuel - b.karbonite)){
      return -1; // b has a better ratio
    } else {
      return dist([a.x, a.y], [mean_x, mean_y]) > dist([b.x, b.y], [mean_x, mean_y]) ? 1 : -1;
    }
  })

  // then return the clusters:
  return clusters_on_our_side;
}