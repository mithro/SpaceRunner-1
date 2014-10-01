/*
 -*- coding: utf-8 -*-
 * vim: set ts=4 sw=4 et sts=4 ai:
 * Copyright 2013 MITHIS
 * All rights reserved.
 */

/*global HTMLIFrameElement, $, gs, TILE_SIZE, _*/

var ShipFrame = (function() {
    'use strict';
    /**
     *
     * @param battle sh.Battle A battle.
     * @param ship sh.Ship The relevant ship in the battle.
     * @param eventHandler Function Handler to catch messages from the iframe.
     * @constructor
     */
    function ShipFrame(battle, ship, eventHandler) {
        this.battle = battle;
        this.ship = ship;
        this.eventHandlers = [eventHandler];
    }

    ShipFrame.prototype = {
        /**
         * Appear on screen
         */
        init: function(width, height) {
            //create an iframe, pass the model and bind with onEvent
            var self = this,
                url = 'ship-frame/?width=' + (self.ship.width * TILE_SIZE) +
                    '&height=' + (self.ship.height * TILE_SIZE),
                iframe = $('<iframe src="' + url + '" width="' + width +
                    '" height="' + height + '"/>')
                    .css({display: 'inline'})[0];
            $('#frames').append(iframe);
            //listen to messages from the iframe
            window.addEventListener('message', function(event) {
                if (event.source === iframe.contentWindow) {
                    if (event.data.eventName === 'ready') {
                        self.sendData({
                            type: 'start battle',
                            playerJson: gs.player.toJson(),
                            battleJson: self.battle.toJson(),
                            shipID: self.ship.id
                        });
                    } else {
                        _.each(self.eventHandlers, function(handler) {
                            handler(event.data);
                        });
                    }
                }
            }, false);
            this.iframe = iframe;
        },
        runScript: function(scriptJson) {
            //pass the script to iframe
            this.sendData(scriptJson);
        },
        keyPressed: function(key) {
            this.sendData({type: 'key pressed', key: key});
        },
        sendData: function(data) {
            this.iframe.contentWindow.postMessage(data, '*');
        }
    };
    return ShipFrame;
}());

