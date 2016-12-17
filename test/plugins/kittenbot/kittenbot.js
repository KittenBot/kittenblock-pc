/**
 * Created by Riven on 2016/12/17.
 */

var KittenBot = function (runtime) {
    this.runtime = runtime
    this.color = {
        "primary": "#4a7d9b",
        "secondary": "#b7cbd7",
        "tertiary": "#e3e3e3"
    };

};

KittenBot.prototype.getBlocks = function () {
    return {
        'rosbot_stepperspeed': {
            init: function() {
                this.jsonInit({
                    "id": "rosbot_stepperspeed",
                    "message0": "stepper at speed %1",
                    "args0": [
                        {
                            "type": "input_value",
                            "name": "SPEED"
                        }
                    ],
                    "inputsInline": true,
                    "previousStatement": null,
                    "nextStatement": null,
                    "colour": KittenBot.Colours.primary,
                    "colourSecondary": KittenBot.Colours.secondary,
                    "colourTertiary": KittenBot.Colours.tertiary
                });
            }
        },

    };
};

KittenBot.prototype.getPrimitives = function() {
    return {
        'rosbot_motorturn': this.motorTurn,
    };
};

KittenBot.prototype.motorTurn = function(argValues, util) {
    var spd = argValues.SPEED;
    var cmd = "M200 L"+spd+" R"+spd;
    util.ioQuery('serial', 'sendMsg', cmd);
};

KittenBot.prototype.getToolbox = function () {
    return '<category name="Rosbot" colour="#FF6680" secondaryColour="#FF3355">' +
        '<block type="rosbot_motorspeed">' +
        '<value name="SPEED">' +
        '<shadow type="math_number">' +
        '<field name="NUM">150</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_motorturn">' +
        '<value name="SPEED">' +
        '<shadow type="math_number">' +
        '<field name="NUM">100</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<sep></sep>' +
        '<block type="rosbot_steppermove">' +
        '<value name="LENGTH">' +
        '<shadow type="math_number">' +
        '<field name="NUM">100</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_stepperturn">' +
        '<value name="DEGREE">' +
        '<shadow type="math_number">' +
        '<field name="NUM">90</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_stepperspeed">' +
        '<value name="SPEEDL">' +
        '<shadow type="math_number">' +
        '<field name="NUM">200</field>' +
        '</shadow>' +
        '</value>' +
        '<value name="SPEEDR">' +
        '<shadow type="math_number">' +
        '<field name="NUM">200</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_stop">' +
        '</block>' +
        '<block type="rosbot_rgb">' +
        '<value name="PINNUM">' +
        '<shadow type="math_number">' +
        '<field name="NUM">4</field>' +
        '</shadow>' +
        '</value>' +
        '<value name="PIXEL">' +
        '<shadow type="math_number">' +
        '<field name="NUM">0</field>' +
        '</shadow>' +
        '</value>' +
        '<value name="COLOR">' +
        '<shadow type="colour_picker">' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_distance">' +
        '<value name="PINNUM">' +
        '<shadow type="text">' +
        '<field name="TEXT">A3</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '<block type="rosbot_power">' +
        '</block>' +
        '<block type="rosbot_ping">' +
        '<value name="TRIGPIN">' +
        '<shadow type="text">' +
        '<field name="TEXT">11</field>' +
        '</shadow>' +
        '</value>' +
        '<value name="ECHOPIN">' +
        '<shadow type="text">' +
        '<field name="TEXT">12</field>' +
        '</shadow>' +
        '</value>' +
        '</block>' +
        '</category>';
}


module.exports = KittenBot;
