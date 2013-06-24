/*
 -*- coding: utf-8 -*-
 * vim: set ts=4 sw=4 et sts=4 ai:
 * Copyright 2013 MITHIS
 * All rights reserved.
 */

var shared = require('./public/js/shared'),
    fs = require('fs'),
    tmx = require('tmx'),
    mapNames = [
        'cyborg_battleship1',
        'cyborg_cruiser',
        'cyborg_drone',
        'cyborg_frigate',
        'humanoid_battleship',
        'humanoid_cruiser',
        'humanoid_drone',
        'humanoid_frigate',
        'liquid_battleship',
        'liquid_cruiser',
        'liquid_drone',
        'liquid_frigate',
        'mechanoid_battleship',
        'mechanoid_cruiser',
        'mechanoid_drone',
        'mechanoid_frigate'
    ];


function getPath(mapName){
    'use strict';
    return __dirname + '/public/data/outlines/' + mapName + '.tmx';
}

function getCollisionTileChar(tileId) {
    'use strict';
    switch(tileId) {
        case 0: return shared.tiles.clear;
        case 49: return shared.tiles.solid;
        case 50: return shared.tiles.back;
        case 51:
        case 52: return shared.tiles.front;
        default: return '?';
    }
}

/**
 * Converts the map given by tmx package to map with a 2d array of
 * shared.tiles . The map.hull should be identical to the one
 * returned on the client on hullMap.get(TMXTileMap)
 * @param tmxMap Map generated by tmx.
 * @returns {{width: (int), height: (int), hull: Array}}
 * @param mapName {String} The map name.
 */
function toMapWithHull(tmxMap, mapName) {
    'use strict';
    var colLayer = tmxMap.layers[2].data,
        y, x, hull = [], row, i = 0;
    if(tmxMap.layers[2].name !== 'collision') {
        throw 'Collision layer name should be "collision" instead of "' +
            colLayer.name + '". (' + mapName +')';
    }
    for (y = 0; y < tmxMap.height; y++) {
        row = [];
        for (x = 0; x < tmxMap.width; x++, i++) {
            row.push(getCollisionTileChar(colLayer[i]));
        }
        hull.push('');
        hull[y] = row.join('');
    }
    return {
        width: tmxMap.width,
        height: tmxMap.height,
        hull: hull
    };
}

function loadMap(maps, index, end) {
    'use strict';
    var file, parser,
        mapName;
    mapName = mapNames[index];
    file = fs.createReadStream(getPath(mapName));
    parser = tmx.createParser();
    parser.on('data', function(buffer){
        maps[mapName] = JSON.parse(buffer.toString());
        maps[mapName] = toMapWithHull(maps[mapName], mapName);
        if(index < mapNames.length - 1) {
            loadMap(maps, index + 1, end);
        } else{
            end(maps);
        }
    });
    file.pipe(parser);
}

//loads the maps one by one
exports.loadMaps = function (callback) {
    'use strict';
   loadMap({}, 0, callback);
};
