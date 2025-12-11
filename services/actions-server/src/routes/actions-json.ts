import { Router } from 'express';
import { config } from '../config';

export const actionsJsonRoute = Router();

/**
 * GET /actions.json
 * Returns the actions.json manifest for Blinks discovery
 */
actionsJsonRoute.get('/', (req, res) => {
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
