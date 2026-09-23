// middleware/authenticatePortalAccessToken.js

import env from "../config/env.js";

import {
  AUTHENTICATION_METHODS,
  AUTHENTICATION_STATUS,
  createAuthenticationResult,
  validateTokenAuthenticationInput,
} from "../services/security/authenticationHardeningService.js";

import {
  verifyAccessToken,
} from "../services/security/portalTokenService.js";


export const extractPortalBearerToken = (
  authorizationHeader
) => {
  if (
    typeof authorizationHeader !==
    "string"
  ) {
    return null;
  }

  const match =
    authorizationHeader.match(
      /^Bearer\s+(.+)$/i
    );

  if (
    !match ||
    !match[1]
  ) {
    return null;
  }

  const token =
    match[1].trim();

  return token !==
    ""
    ? token
    : null;
};


const respondUnauthorized = (
  res,
  message
) =>
  res
    .status(401)
    .json({
      success:
        false,

      message,
    });


const authenticatePortalAccessToken =
  (
    req,
    res,
    next
  ) => {
    try {
      const token =
        extractPortalBearerToken(
          req.headers
            ?.authorization
        );


      const input =
        validateTokenAuthenticationInput({
          token,
        });


      if (
        !input.valid
      ) {
        return respondUnauthorized(
          res,
          "Authentication is required."
        );
      }


      if (
        typeof env.jwtSecret !==
          "string" ||
        env.jwtSecret.trim() ===
          "" ||
        typeof env.jwtIssuer !==
          "string" ||
        env.jwtIssuer.trim() ===
          "" ||
        typeof env.jwtAudience !==
          "string" ||
        env.jwtAudience.trim() ===
          ""
      ) {
        console.error(
          "[Security] Portal JWT configuration is unavailable."
        );

        return res
          .status(503)
          .json({
            success:
              false,

            message:
              "Authentication service is unavailable.",
          });
      }


      const payload =
        verifyAccessToken({
          token,

          secret:
            env.jwtSecret,

          issuer:
            env.jwtIssuer,

          audience:
            env.jwtAudience,
        });


      const authentication =
        createAuthenticationResult({
          status:
            AUTHENTICATION_STATUS
              .AUTHENTICATED,

          method:
            AUTHENTICATION_METHODS
              .ACCESS_TOKEN,

          identity: {
            id:
              payload.subject,

            type:
              payload.role,
          },
        });


      req.auth =
        Object.freeze({
          authenticated:
            authentication
              .authenticated,

          identity:
            authentication
              .identity,

          userId:
            payload.subject,

          role:
            payload.role,

          sessionId:
            payload.sessionId,

          tokenId:
            payload.tokenId,
        });


      return next();
    } catch (
      error
    ) {
      if (
        error?.name ===
          "TokenExpiredError"
      ) {
        return respondUnauthorized(
          res,
          "Authentication token has expired."
        );
      }


      if (
        error?.name ===
          "JsonWebTokenError" ||
        error?.name ===
          "NotBeforeError"
      ) {
        return respondUnauthorized(
          res,
          "Invalid authentication token."
        );
      }


      const tokenContractErrors =
        new Set([
          "TOKEN_REQUIRED",
          "TOKEN_PAYLOAD_INVALID",
          "TOKEN_TYPE_MISMATCH",
          "TOKEN_SUBJECT_REQUIRED",
          "TOKEN_ROLE_REQUIRED",
          "TOKEN_SESSION_ID_REQUIRED",
          "TOKEN_ID_REQUIRED",
          "TOKEN_ROLE_UNKNOWN",
        ]);


      if (
        tokenContractErrors.has(
          error?.message
        )
      ) {
        return respondUnauthorized(
          res,
          "Invalid authentication token."
        );
      }


      console.error(
        `[Security] Portal authentication failure: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );


      return res
        .status(503)
        .json({
          success:
            false,

          message:
            "Authentication service is unavailable.",
        });
    }
  };


export default
  authenticatePortalAccessToken;
