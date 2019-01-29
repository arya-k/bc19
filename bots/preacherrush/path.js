import {SPECS} from 'battlecode';
import {CIRCLES} from './constants.js'
import {dist, is_valid, getClearLocations, getNearbyRobots, has_adjacent_attacker, has_adjacent_castle} from './utils.js'

function Point(x, y, parent = null){
  this.x = x;
  this.y = y;
  this.parent = parent;
}

function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.push(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

function heuristic(pos0, pos1) {
  var D = 1;
  var D2 = Math.sqrt(2);
  var d1 = Math.abs(pos1.x - pos0.x);
  var d2 = Math.abs(pos1.y - pos0.y);
  return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
}

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    this.content.push(element);
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    var result = this.content[0];
    var end = this.content.pop();
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);
    var end = this.content.pop();
    if (i !== this.content.length - 1) {
      this.content[i] = end;
      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    var element = this.content[n];
    while (n > 0) {
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      }
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);
    while (true) {
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      var swap = null;
      var child1Score;
      if (child1N < length) {
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      else {
        break;
      }
    }
  }
};

function GridNode(x, y, isWall) {
  this.x = x;
  this.y = y;
  this.isWall = isWall
}

GridNode.prototype.getCost = function(nbr) {
  let dx = Math.abs(this.x - nbr.x);
  let dy = Math.abs(this.y - nbr.y);
  if (dx == 2 && dy == 0) {
    return 2;
  } else if (dx == 1 && dy == 0) {
    return 1;
  } else if (dx == 1 && dy == 1) {
    return 1.41421;
  } else if (dx == 0 && dy == 1) {
    return 1;
  } else if (dx == 0 && dy == 2) {
    return 2;
  } else {
    return Math.sqrt((dx*dx) + (dy*dy));
  }
};

export function Graph(pass_map, vis_map, speed) {
  this.nodes = [];
  this.grid = [];
  this.speed = speed;
  for (var y = 0; y < pass_map.length; y++) {
    this.grid[y] = [];
    for (var x = 0; x < pass_map.length; x++) {
      let isWall = !pass_map[y][x] || vis_map[y][x] > 0;
      var node = new GridNode(x, y, isWall);
      this.grid[y][x] = node;
      this.nodes.push(node);
    }
  }
  this.dirtyNodes = [];
  for (var i = 0; i < this.nodes.length; i++) {
    this.nodes[i].f = 0;
    this.nodes[i].g = 0;
    this.nodes[i].h = 0;
    this.nodes[i].visited = false;
    this.nodes[i].closed = false;
    this.nodes[i].parent = null;
  }
}

Graph.prototype.markDirty = function(node) {
  this.dirtyNodes.push(node);
};

Graph.prototype.neighbors = function(node) {
  var ret = [];
  for (const dir of CIRCLES[this.speed]) {
    if (this.grid[node.y + dir[1]] &&
        this.grid[node.y + dir[1]][node.x + dir[0]]) {
        ret.push(this.grid[node.y + dir[1]][node.x + dir[0]])
    }
  }
  return ret;
};

export function move_towards(self, a, b) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y], 
  // minimum_radius (1 for PREACHER), maximum_radius (16 for PREACHER)
  // This function will run A*, and just try to position you so that you are within attack range of
  // The enemy. It will NOT try to bring you exactly to the enemy
  // This is the function you use if you want to A* towards an enemy (so all the attack behavior)


  const pass_map = self.map;
  const vis_map = self.getVisibleRobotMap();
  const speed = SPECS.UNITS[self.me.unit].SPEED;
  let attack_radius_min = null;
  let attack_radius_max = null;

  if (self.me.unit == SPECS.PILGRIM) {
    attack_radius_max = 2;
    attack_radius_min = 1;
  } else {
    attack_radius_min = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
    attack_radius_max = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
  }


  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]]
  var end = graph.grid[b[1]][b[0]]


  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);

  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    var dist = (currentNode.x-end.x)**2 + (currentNode.y-end.y)**2

    if (dist >= attack_radius_min && dist <= attack_radius_max) {
      let path = pathTo(currentNode);
      if (path.length > 0) {
        return path[path.length - 1]; // the first step along the way
      } else {
        return null; // you were already at the goal node
      }
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);

        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}


export function move_to(self, a, b) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y]
  // runs a standard A*. ~3ms if path exists, ~20-30ms if path does not exist.
  // if no path exists, it'll return null;
  // If a path exists, it'll return a single point, the ABSOLUTE coordinates of the move

  // If we can see the end point, and there's someone else on it, return null:
  const pass_map = self.map;
  const vis_map = self.getVisibleRobotMap();
  const speed = SPECS.UNITS[self.me.unit].SPEED;

  if (vis_map[b[1]][b[0]] > 0) {
    return null;
  }

  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]]
  var end = graph.grid[b[1]][b[0]]

  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);


  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    if (currentNode.x == end.x && currentNode.y == end.y) {
      let path = pathTo(currentNode);
      if (path.length > 0) {
        return path[path.length - 1]; // the first step along the way
      } else {
        return null; // you were already at the goal node
      }
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);


        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}

export function move_away(self, enemies) {
  let threat_points = new Set();
  let set = new Set();

  let p, d;
  for (let enemy of enemies) {
    threat_points.add((enemy.y<<6) + enemy.x);
    let max_radius = enemy.unit == SPECS.PREACHER ? 50 : SPECS.UNITS[enemy.unit].ATTACK_RADIUS[1]
    for (let dir of CIRCLES[max_radius]){
      p = [enemy.x + dir[0], enemy.y + dir[1]];
      d = dist(p, [enemy.x, enemy.y]);
      if (d >= SPECS.UNITS[enemy.unit].ATTACK_RADIUS[0]) { // prophets have a min_radius too.
        if (is_valid(p[0], p[1], self.map.length)){
          if (self.map[p[1]][p[0]]){
            threat_points.add((p[1]<<6) + p[0]);
          }
        }
      }
    }
  }

  if (!threat_points.has((self.me.y<<6) + self.me.x))
    return null;


  let max = [0, null];
  let max_safe = [0, null]
  for (const dir of CIRCLES[SPECS.UNITS[self.me.unit].SPEED]){
    let point = [self.me.x + dir[0], self.me.y + dir[1]];
    if (!is_valid(point[0], point[1], self.map.length) || !self.map[point[1]][point[0]] || self.getVisibleRobotMap()[point[1]][point[0]] != 0){
      continue;
    }
    let sum = 0;
    if (!threat_points.has((point[1]<<6) + point[0])) {
      for (let enemy of enemies)
        sum += dist([enemy.x, enemy.y], point);
      if (sum > max_safe[0])
        max_safe = [sum, dir];
    }
    else {
      for (let enemy of enemies)
        sum += dist([enemy.x, enemy.y], point);
      if (sum > max[0])
        max = [sum, dir];
    }
  }

  if (max_safe[1] !== null)
    return max_safe[1];
  else
    return max[1];
}

export function num_moves(pass_map, vis_map, speed, a, b) {
  if (vis_map[b[1]][b[0]] > 0) {
    return null;
  }

  var graph = new Graph(pass_map, vis_map, speed);
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]]
  var end = graph.grid[b[1]][b[0]]

  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);


  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    if (currentNode.x == end.x && currentNode.y == end.y) {
      return pathTo(currentNode).length;
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);

        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; // no path found.
}

export function no_swarm(self, a, b) { // bascially move_towards but not moving adjacent to other attacking allies
  const pass_map = self.map;
  const vis_map = self.getVisibleRobotMap();
  const speed = SPECS.UNITS[self.me.unit].SPEED;
  let attack_radius_min = null;
  let attack_radius_max = null;

  if (self.me.unit == SPECS.PILGRIM) {
    attack_radius_max = 2;
    attack_radius_min = 1;
  } else {
    attack_radius_min = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
    attack_radius_max = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
  }

  var graph = new Graph(pass_map, vis_map, speed);
  for (var y = 0; y < pass_map.length; y++) {
    for (var x = 0; x < pass_map.length; x++) {
      let id = vis_map[y][x];
      if (id > 0){
        let r = self.getRobot(id);
        if (r.team !== null && r.team == self.me.team && SPECS.UNITS[self.me.unit].SPEED > 0 && 
            SPECS.UNITS[self.me.unit].ATTACK_DAMAGE !== null){
          for (let dir of CIRCLES[2]){
            let p = [x + dir[0], y + dir[1]];
            if (is_valid(p[0], p[1], self.map.length)){
              graph.grid[p[1]][p[0]].isWall = true;
            }
          }
        }
      }
    }
  }
  var openHeap = getHeap();

  var start = graph.grid[a[1]][a[0]]
  var end = graph.grid[b[1]][b[0]]


  start.h = heuristic(start, end);
  graph.markDirty(start);
  openHeap.push(start);

  while (openHeap.size() > 0) {
    var currentNode = openHeap.pop();

    var dist = (currentNode.x-end.x)**2 + (currentNode.y-end.y)**2

    if (dist >= attack_radius_min && dist <= attack_radius_max) {
      let path = pathTo(currentNode);
      if (path.length > 0) {
        return path[path.length - 1]; // the first step along the way
      } else {
        return null; // you were already at the goal node
      }
    }

    currentNode.closed = true;
    var neighbors = graph.neighbors(currentNode);

    for (var i = 0; i < neighbors.length; i++) {
      var neighbor = neighbors[i];
      //self.log("iswal2")
      if (neighbor.closed || neighbor.isWall) { continue; }

      var gScore = currentNode.g + neighbor.getCost(currentNode);
      var beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        neighbor.visited = true;
        neighbor.parent = currentNode;
        neighbor.h = neighbor.h || heuristic(neighbor, end);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        graph.markDirty(neighbor);

        if (!beenVisited) {
          openHeap.push(neighbor);
        } else {
          openHeap.rescoreElement(neighbor);
        }
      }
    }
  }
  return null; 
}