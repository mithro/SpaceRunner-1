/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, module, hullMaps*/
var Ship = require('../_common/shared-js').Ship,
    redis = require('redis');

module.exports = function(req, res, next) {
    'use strict';
    var shipType = req.query.type,
        rc = redis.createClient(),
        newShip;
    if (shipType) {
        //create new ship in the database
        newShip = new Ship({tmxName: shipType});
        rc.incr('next_hull_id', function(error, id) {
            if (error) {
                res.json({error: error});
                return;
            }
            rc.hmset('hull:' + id, {
                name: shipType,
                shipJson: JSON.stringify(newShip.toJson())
            }, function(error, reply) {
                if (error) {
                    res.json({error: error});
                    return;
                }
                rc.hset(['hulls', shipType, id], function(error, reply) {
                    res.redirect('/ship-builder?hull_id=' + id);
                });
            });
        });
    } else {
        res.render('ship-builder/view', {
            username: 'server-hardcoded username',
            hullMaps: JSON.stringify(hullMaps),
            path: '/ship-builder/',
            shipType: req.query.type
        });
    }

};