// routes/portalAuthRoutes.js

import express
  from "express";

import createPortalAuthController
  from "../controllers/portalAuthController.js";

import authenticatePortalAccessToken
  from "../middleware/authenticatePortalAccessToken.js";

import requireActivePortalSession
  from "../middleware/requireActivePortalSession.js";


export function createPortalAuthRouter({
  controller =
    createPortalAuthController(),

  authenticate =
    authenticatePortalAccessToken,

  requireActiveSession =
    requireActivePortalSession,
} = {}) {
  if (
    !controller ||
    typeof controller.login !==
      "function" ||
    typeof controller.refresh !==
      "function" ||
    typeof controller.logout !==
      "function" ||
    typeof controller.me !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_AUTH_CONTROLLER_INVALID"
    );
  }


  if (
    typeof authenticate !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_AUTH_MIDDLEWARE_INVALID"
    );
  }


  if (
    typeof requireActiveSession !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_ACTIVE_SESSION_MIDDLEWARE_INVALID"
    );
  }


  const router =
    express.Router();


  /*
  |--------------------------------------------------------------------------
  | Public authentication boundaries
  |--------------------------------------------------------------------------
  */

  router.post(
    "/login",
    controller.login
  );


  router.post(
    "/refresh",
    controller.refresh
  );


  /*
  |--------------------------------------------------------------------------
  | Authenticated + active-session boundaries
  |--------------------------------------------------------------------------
  */

  router.post(
    "/logout",
    authenticate,
    requireActiveSession,
    controller.logout
  );


  router.get(
    "/me",
    authenticate,
    requireActiveSession,
    controller.me
  );


  return router;
}


export default
  createPortalAuthRouter();
