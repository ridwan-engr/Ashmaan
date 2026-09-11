import jwt from "jsonwebtoken";

import env from "../config/env.js";

import {
  AUTHENTICATION_METHODS,
  AUTHENTICATION_STATUS,
  createAuthenticationResult,
  validateTokenAuthenticationInput,
} from "../services/security/authenticationHardeningService.js";


const extractBearerToken = (
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

  return match[1].trim();
};


const authenticateJwt =
  (
    req,
    res,
    next
  ) => {
    try {
      const token =
        extractBearerToken(
          req.headers.authorization
        );

      const input =
        validateTokenAuthenticationInput({
          token,
        });

      if (
        !input.valid
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication is required.",
          });
      }


      if (
        !env.jwtSecret
      ) {
        console.error(
          "[Security] JWT_SECRET is not configured."
        );

        return res
          .status(503)
          .json({
            success: false,
            message:
              "Authentication service is unavailable.",
          });
      }


      const payload =
        jwt.verify(
          token,
          env.jwtSecret,
          {
            algorithms: [
              "HS256",
            ],
          }
        );


      if (
        !payload ||
        typeof payload !==
          "object" ||
        typeof payload.sub !==
          "string" ||
        payload.sub.trim() === "" ||
        typeof payload.role !==
          "string" ||
        payload.role.trim() === ""
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid authentication token.",
          });
      }


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
              payload.sub,

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

          role:
            payload.role,

          tokenId:
            typeof payload.jti ===
              "string"
              ? payload.jti
              : null,
        });


      return next();
    } catch (
      error
    ) {
      if (
        error?.name ===
          "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication token has expired.",
          });
      }


      if (
        error?.name ===
          "JsonWebTokenError" ||
        error?.name ===
          "NotBeforeError"
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Invalid authentication token.",
          });
      }


      console.error(
        `[Security] Authentication failure: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );


      return res
        .status(503)
        .json({
          success: false,
          message:
            "Authentication service is unavailable.",
        });
    }
  };


export default authenticateJwt;