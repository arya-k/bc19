// responsible for all signalling

const MASK8 = 0b01110001
const MASK16 = 0b0010000001101000

export const COMM8 = {
    // message type declarations
    X_HEADER: 0b10<<6,
    Y_HEADER: 0b11<<6,

    // check header:
    type: function(s) { return (s^MASK8) & (0b11<<6); },

    // encode and decodes:
    ENCODE_X: function(x) {return ((0b10<<6) + x)^MASK8; },
    ENCODE_Y: function(y) {return ((0b11<<6) + y)^MASK8; },

    DECODE_X: function (s) { return (s^MASK8)&63; },
    DECODE_Y: function (s) { return (s^MASK8)&63; },

}

export const COMM16 = {
    // message type declarations:
    BASELOC_HEADER: 0b1000<<12,

    // check header:
    type: function(s) { return (s^MASK16) & (0b1111<<12); },

    // encode and decodes:
    ENCODE_BASELOC: function(x, y) { return ((0b1000<<12) + (y<<6) + x) ^ MASK16; },

    DECODE_BASELOC: function(s) { return [(s^MASK16)&63,((s^MASK16)&4032)>>6]; },
}