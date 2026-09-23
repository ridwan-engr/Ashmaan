// middleware/requirePortalPermission.js

import {
  AUTHORIZATION_DECISION,
  authorizePermission,
  isKnownPermission,
} from "../services/security/authorizationRbacService.js";


function sendAuthorizationFailure(
  res,
  status,
  code
) {
  return res.status(
    status
  ).json({
    success:
      false,

    error:
      code,
  });
}


export function createRequirePortalPermission({
  authorize =
    authorizePermission,
} = {}) {
  if (
    typeof authorize !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_AUTHORIZATION_SERVICE_REQUIRED"
    );
  }


  return function requirePortalPermission(
    permission
  ) {
    if (
      !isKnownPermission(
        permission
      )
    ) {
      throw new TypeError(
        "PORTAL_PERMISSION_INVALID"
      );
    }


    return function portalPermissionMiddleware(
      req,
      res,
      next
    ) {
      try {
        const authenticated =
          req?.auth
            ?.authenticated ===
          true;

        const role =
          req?.auth
            ?.role ??
          null;


        const result =
          authorize({
            authenticated,
            role,
            permission,
          });


        if (
          !result ||
          typeof result !==
            "object"
        ) {
          return sendAuthorizationFailure(
            res,
            503,
            "AUTHORIZATION_UNAVAILABLE"
          );
        }


        if (
          result.decision ===
            AUTHORIZATION_DECISION
              .UNAVAILABLE
        ) {
          return sendAuthorizationFailure(
            res,
            503,
            "AUTHORIZATION_UNAVAILABLE"
          );
        }


        if (
          result.decision ===
            AUTHORIZATION_DECISION
              .ALLOW &&
          result.allowed ===
            true
        ) {
          return next();
        }


        if (
          !authenticated
        ) {
          return sendAuthorizationFailure(
            res,
            401,
            "AUTHENTICATION_REQUIRED"
          );
        }


        return sendAuthorizationFailure(
          res,
          403,
          "PERMISSION_DENIED"
        );
      } catch (
        error
      ) {
        console.error(
          "[Security] Portal authorization failure:",
          error?.code ??
            error?.message ??
            "UNKNOWN"
        );


        return sendAuthorizationFailure(
          res,
          503,
          "AUTHORIZATION_UNAVAILABLE"
        );
      }
    };
  };
}


export const requirePortalPermission =
  createRequirePortalPermission();


export default requirePortalPermission;