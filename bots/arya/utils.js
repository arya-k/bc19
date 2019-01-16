import {CIRCLES} from './constants.js'

export function dist(a, b) {
    return ((a[0]-b[0])**2) + ((a[1]-b[1])**2) // return the r^2 distance
}

export function is_valid(x, y, dim) {
    // return whether the x,y point is within the map range
    return (x >=0 && x < dim && y >= 0 && y < dim);
}

export function getNearbyRobots(self, r_squared) {
    // returns the ids of all the robots within the range r_squared
    let ret = []
    const vis_map = self.getVisibleRobotMap()

    for (const dir of CIRCLES[r_squared]) {
        if (is_valid(self.me.x + dir[0], self.me.y + dir[1], self.map.length)) {
            if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] > 0) {
                ret.push(vis_map[self.me.y + dir[1]][self.me.x + dir[0]])
            }
        }
    }

    return ret;
}

export function getClearLocations(self, r_squared) {
    // returns the locations with no obstructions or robots:
    let ret = []
    const vis_map = self.getVisibleRobotMap()

    for (const dir of CIRCLES[r_squared]) {
        if (self.map[self.me.y + dir[1]] && self.map[self.me.y + dir[1]][self.me.x + dir[0]]) { // valid + passable
            if (vis_map[self.me.y + dir[1]][self.me.x + dir[0]] < 1) {
                ret.push([self.me.x + dir[0], self.me.y + dir[1]])
            }
        }
    }

    return ret;
}