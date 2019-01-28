// responsible for all signalling

const MASK16 = 0b1110110101011100

export const COMM8 = {
    ENEMY_DEAD: 10,
    ENEMY_CASTLE_DEAD: 11,

    NOT_AGGRO: 12,
    AGGRO: 13,
    ADDED_LATTICE: 14,
    REMOVED_LATTICE: 15,
    SENT_HORDE: 16,

    NEW_PILGRIM: 17,
    IM_ALIVE: 18,
    HINDERED: 19,

    // message type declarations
    X_HEADER: 0b10<<6,
    Y_HEADER: 0b11<<6,

    // check header:
    type: function(s) { return s&(0b11<<6); },

    // encode and decodes:
    ENCODE_X: function(x) {return (0b10<<6) + x; },
    ENCODE_Y: function(y) {return (0b11<<6) + y; },

    DECODE_X: function (s) { return s&63; },
    DECODE_Y: function (s) { return s&63; },

}

export const COMM16 = {
    // message type declarations:
    BASELOC_HEADER: 0b1000<<12,
    ENEMYSIGHTING_HEADER: 0b1001<<12,
    ENEMYCASTLE_HEADER: 0b1010<<12,
    LATTICE_HEADER: 0b1011<<12,
    SCOUT_HEADER: 0b1100<<12,
    ENEMYDEAD_HEADER: 0b1101<<12,

    // check header:
    type: function(s) { return s === -1 ? 0 : (s^MASK16) & (0b1111<<12); },

    // encode and decodes:
    ENCODE_BASELOC: function(x, y) { return ((0b1000<<12) + (y<<6) + x) ^ MASK16; }, // new base location for our units
    ENCODE_ENEMYSIGHTING: function(x, y) { return ((0b1001<<12) + (y<<6) + x) ^ MASK16; }, // enemy sighted, that tells attack units what to do to better defend.
    ENCODE_ENEMYCASTLE: function(x, y) { return ((0b1010<<12) + (y<<6) + x) ^ MASK16; }, // this tells our units to go into rush mode, and attack an enemycastle;
    ENCODE_LATTICE: function(region) { return ((0b1011<<12) + region) ^ MASK16; }, // this tells our units to lattice between a theta 1 and 2. If both are set to 0, then generic lattice,
    ENCODE_SCOUT: function(x, y) { return ((0b1100<<12) + (y<<6) + x) ^ MASK16; }, // tells pilgrims to act as scouts and provides an enemy location
    ENCODE_ENEMYDEAD: function(x, y) { return ((0b1101<<12) + (y<<6) + x) ^ MASK16; }, // this is signalled whenever an enemy is killed


    DECODE_BASELOC: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_ENEMYSIGHTING: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_ENEMYCASTLE: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_LATTICE: function(s) { return (s^MASK16)&4095; },
    DECODE_SCOUT: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
    DECODE_ENEMYDEAD: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
}