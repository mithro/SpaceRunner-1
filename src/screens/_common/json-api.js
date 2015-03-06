/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports*/

var url = require('url'),
    chat = require('./../../chat'),
    sh = require('shared');

exports.chat = {
    /**
     * Gets all the chat lines.
     * @param {*} req
     * @param {*} res
     */
    getlines: function(req, res) {
        'use strict';
        var lastLineId = parseInt(req.body.last, 10),
            maxLines = req.body.max,
            lastLineIndex,
            i,
            forSending = [];
        for (i = 0; i < chat.lines.length; i++) {
            if (chat.lines[i].id === lastLineId) {
                lastLineIndex = i;
                break;
            }
        }
        if (maxLines && chat.lines.length - lastLineIndex > maxLines) {
            lastLineIndex = chat.lines.length - maxLines - 1;
        }
        for (i = lastLineIndex + 1; i < chat.lines.length; i++) {
            forSending.push(chat.lines[i]);
        }
        res.json(forSending);
    },
    /**
     * Send a line to the server
     * @param {*} req
     * @param {*} res
     */
    send: function(req, res) {
        'use strict';
        var line = req.body.line;
        chat.addLine(req.user.email, line.message);
        res.json({});
    }
};

exports.general = {
    /**
     * Checks if the server is online.
     * @param {Object} req
     * @param {Object} res
     */
    ping: function(req, res) {
        'use strict';
        res.json({ ok: true });
    },
    /**
     * Gets an array of all the properties of sh , (the namespace for the
     * shared code between server and client.
     * This is used to compare the properties of server and client to
     * ensure that they are the same.
     * @param {Object} req
     * @param {Object} res
     */
    sharedprops: function(req, res) {
        'use strict';
        res.json({properties: sh.getProperties(sh)});
    }
};

