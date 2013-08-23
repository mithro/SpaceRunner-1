/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global */

/**
 * Draws stuff on the canvas based on canvas' primitives
 * @type {{}}
 */
var draw = {
    tileHighlight: function(ctx, x, y, color, thickness) {
        'use strict';
        var pixelPos = {x: x * TILE_SIZE,
            y: y * TILE_SIZE};
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.moveTo(pixelPos.x, pixelPos.y);
        ctx.strokeRect(pixelPos.x, pixelPos.y, TILE_SIZE, TILE_SIZE);
    },
    circle: function(ctx, position, size, color) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc((position.x  * TILE_SIZE) + HALF_TILE,
            (position.y * TILE_SIZE) + HALF_TILE,
            size, 0, Math.PI * 2, false);
        ctx.fill();
    }
}