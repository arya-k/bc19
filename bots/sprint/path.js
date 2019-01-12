export function move_towards(pass_map, vis_map, start, end, attack_radius_min, attack_radius_max) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y], 
  // minimum_radius (1 for PREACHER), maximum_radius (16 for PREACHER)
  // This function will run A*, and just try to position you so that you are within attack range of
  // The enemy. It will NOT try to bring you exactly to the enemy
  // This is the function you use if you want to A* towards an enemy (so all the attack behavior)

  // if no path exists, it'll return null;
  // If a path exists, it'll return a single point, the ABSOLUTE coordinates of the move
  // Here is a sample use:
  // var move = astar(self.getPassableLocations(), self.getVisibleRobotMap(), start, end)
  // if (move !== null) {
  //   return self.move(move.x - self.me.x, move.y - self.me.y);
  // } else {
  //   return null; // NO MOVE POSSIBLE
  // }
}


export function move_to(pass_map, vis_map, start, end) {
  // given getPassableLocations(), getVisibleRobotMap(), [start_x, start_y], [end_x, end_y]
  // runs a standard A*. ~3ms if path exists, ~20-30ms if path does not exist.

  // if no path exists, it'll return null;
  // If a path exists, it'll return a single point, the ABSOLUTE coordinates of the move
  // Here is a sample use:
  // var move = astar(self.getPassableLocations(), self.getVisibleRobotMap(), start, end)
  // if (move !== null) {
  //   return self.move(move.x - self.me.x, move.y - self.me.y);
  // } else {
  //   return null; // NO MOVE POSSIBLE
  // }

  return [path] // the entire path, from start -> stop, as node objects. nodes have a .x and a .y
  return []; // no move
}