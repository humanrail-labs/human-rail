"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionsJsonRoute = void 0;
const express_1 = require("express");
exports.actionsJsonRoute = (0, express_1.Router)();
/**
 * GET /actions.json
 * Returns the actions.json manifest for Blinks discovery
 */
exports.actionsJsonRoute.get('/', (req, res) => {
    const actionsJson = {
        rules: [
            {
                pathPattern: '/actions/tasks/*',
                apiPath: '/actions/tasks/*',
            },
            {
                pathPattern: '/actions/payments/*',
                apiPath: '/actions/payments/*',
            },
        ],
    };
    res.json(actionsJson);
});
