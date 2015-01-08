/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, module*/
//HOME
var players = require('../../state/players'),
    hulls = require('../../state/prebuilt-ships'),
    _ = require('underscore')._;

module.exports = function(req, res, next) {
    'use strict';
    var view = req.query.edit ? 'edit' : 'view';
    hulls.getAll().then(function(hulls) {
        res.render('ship-list/' + view, {
            path: '/ship-list/',
            hulls: hulls,
            player: players.getPlayer(req)
        });
    }).catch(function(e) {
        next(e);
    });
};