/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global */

/*
Shared code between server and client

 */

(function(exports){

    exports.Extendable = {
/**
 * JavaScript Inheritance Helper
 * (the same as in melonJS)
 * */
        extends : function(prop) {
            // _super rename to parent to ease code reading
            var parent = this.prototype;

            // Instantiate a base class (but only create the instance,
            // don't run the init constructor)
            initializing = true;
            var proto = new this();
            initializing = false;

            // Copy the properties over onto the new prototype
            for ( var name in prop) {
                // Check if we're overwriting an existing function
                proto[name] = typeof prop[name] == "function"
                    && typeof parent[name] == "function"
                    && fnTest.test(prop[name]) ? (function(name, fn) {
                    return function() {
                        var tmp = this.parent;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this.parent = parent[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply(this, arguments);
                        this.parent = tmp;

                        return ret;
                    };
                })(name, prop[name]) : prop[name];
            }

            // The dummy class constructor
            function Class() {
                if (!initializing && this.init) {
                    this.init.apply(this, arguments);
                }
                //return this;
            }
            // Populate our constructed prototype object
            Class.prototype = proto;
            // Enforce the constructor to be what we expect
            Class.constructor = Class;
            // And make this class extendable
            Class.extend = Object.extend;//arguments.callee;

            return Class;
        }
    };

    exports.test = function(){
        return 'Shared code test.';
    };

    //should have access to the ship class
    exports.verifyOrder = function(orderJson){

    };




}(typeof exports === 'undefined' ? window.shared = {
        onClient: true
    } : exports));
