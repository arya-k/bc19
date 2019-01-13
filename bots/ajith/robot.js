import {BCAbstractRobot, SPECS} from 'battlecode';
import * as nav from 'nav.js';

var built = false;
var step = -1;

/*
communication
trading
*/

class MyRobot extends BCAbstractRobot {
    turn() {
        step++;

        if (this.me.unit === SPECS.CRUSADER) {
            //this.log("START TURN " + step)
            //this.log("Crusader health: " + this.me.health)

            var visible = this.getVisibleRobots()
            
            // this sucks I'm sorry...
            var self = this // 'this' fails to properly identify MyRobot when used inside of anonymous function below :(

            // get attackable robots
            var attackable = visible.filter(function(r){
                if (! self.isVisible(r)){
                    return false
                }
                var dist = (r.x-self.me.x)**2 + (r.y-self.me.y)**2
                if (r.team !== self.me.team
                    && SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[0] <= dist
                    && dist <= SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS[1] ){
                return true
                }
                return false
            })
            //this.log(attackable)

            if (attackable.length>0){
                // attack first robot
                var r = attackable[0]
                //this.log(""+r)
                //this.log('attacking! ' + r + ' at loc ' + (r.x - this.me.x, r.y - this.me.y))
                return this.attack(r.x - this.me.x, r.y - this.me.y)
            }
            //this.log("works1")
            var loc = {
                x: this.me.x,
                y: this.me.y,
            }

            //this.log("works2")
            if (this.destination === undefined){
                this.destination = nav.reflect(loc,this.map,true)
            }

            //this.log("works3")
            //this.log(this.destination.x)
            var new_direction = nav.goto(loc,this.destination,this.map,this.getVisibleRobotMap())
            return this.move(new_direction.x,new_direction.y)
            //this.log("works4")
            
        }

        else if (this.me.unit === SPECS.CASTLE) {
            var self = this
            if (step % 10 === 0) {
                //this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
                for (var i=0;i<choices.length;i++){
                    if (this.map[self.me.x+choices[i][0]][self.me.y+choices[i][1]]==true && (self.me.x+choices[i][0])<(this.map.length) && (self.me.y+choices[i][1])<(this.map[0].length)){
                            return this.buildUnit(SPECS.CRUSADER, choices[i][0], choices[i][1]);
                        }
                }
                
            } else {
                return // this.log("Castle health: " + this.me.health);
            }
        }

    }
}

var robot = new MyRobot();