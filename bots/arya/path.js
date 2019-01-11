import {CONSTANTS, CIRCLES} from './constants.js'
import {SPECS} from 'battlecode';

function Point(x, y) {
  this.x = x;
  this.y = y;
}

export function create_resource_map(x, y, pass_map, fuel_map, karbonite_map) {
    var resource_map = {fuel: [], karbonite: []};

    // Generate the visited set:
    let visited = new Set()
    let queue = [new Point(x,y)]

    while (queue.length > 0) {
        let current = queue.shift()

        if (visited.has((current.y*64) + current.x)) { continue; } // seen before.
        visited.add((current.y*64) + current.x) // mark as visited

        // check for fuel + karbonite:
        if (fuel_map[current.y][current.x]) {
            resource_map.fuel.push([current.x, current.y, 0, CONSTANTS.NO_ROBOT_ASSIGNED, -1000])
        } else if (karbonite_map[current.y][current.x]) {
            resource_map.karbonite.push([current.x, current.y, 0, CONSTANTS.NO_ROBOT_ASSIGNED, -1000])
        }

        CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED].forEach(function(dir) { // add nbrs
            if ((current.x + dir[0]) >= 0 && (current.x + dir[0]) < pass_map[0].length) {
                if ((current.y + dir[1]) >= 0 && (current.y + dir[1]) < pass_map.length) { // in map range
                    if (pass_map[current.y + dir[1]][current.x + dir[0]]) { // can go here
                        queue.push(new Point(current.x + dir[0], current.y + dir[1]))
                    }
                }
            }
        })
    }


    return resource_map;
}

export function get_viable_castle_loc(x, y, pass_map, fuel_map, karbonite_map, visible_map){
    let visited = new Set()
    let queue = [new Point(x,y)]

    while (queue.length > 0) {
        let current = queue.shift()

        if (visited.has((current.y*64) + current.x)) { continue; } // seen before.
        visited.add((current.y*64) + current.x) // mark as visited

        // make sure that there's nothing else there:
        if (!fuel_map[current.y][current.x] && !karbonite_map[current.y][current.x]) {
            if (visible_map[current.y][current.x] < 1) {
                return [current.x, current.y] // valid location
            }
        }

        CIRCLES[SPECS.UNITS[SPECS.PREACHER].SPEED].forEach(function(dir) { // add nbrs
            if ((current.x + dir[0]) >= 0 && (current.x + dir[0]) < pass_map[0].length &&
                (current.y + dir[1]) >= 0 && (current.y + dir[1]) < pass_map.length) { // in map range
                if (pass_map[current.y + dir[1]][current.x + dir[0]]) { // can go here
                    queue.push(new Point(current.x + dir[0], current.y + dir[1]))
                }
            }
        })
    }
}

export function move_towards(){return}