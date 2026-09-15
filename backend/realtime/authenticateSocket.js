import jwt from "jsonwebtoken";

import env from "../config/env.js";

import {
  AUTHENTICATION_METHODS,
  AUTHENTICATION_STATUS,
  createAuthenticationResult,
  validateTokenAuthenticationInput,
} from "../services/security/authenticationHardeningService.js";


/*
|--------------------------------------------------------------------------
| Extract Socket.IO access token
|--------------------------------------------------------------------------
|
| Preferred:
|
| socket.handshake.auth.token
|
| Also accepts the normal HTTP Authorization header so non-browser clients
| can use the same Bearer-token convention as the REST API.
|
*/

const extractSocketToken = (
  socket
) => {
  const authToken =
    socket.handshake
      ?.auth
      ?.token;

  if (
    typeof authToken ===
      "string" &&
    authToken.trim() !== ""
  ) {
    return authToken.trim();
  }


  const authorizationHeader =
    socket.handshake
      ?.headers
      ?.authorization;

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


/*
|--------------------------------------------------------------------------
| Socket JWT authentication
|--------------------------------------------------------------------------
*/

const authenticateSocket =
  (
    socket,
    next
  ) => {
    try {
      const token =
        extractSocketToken(
          socket
        );

      const input =
        validateTokenAuthenticationInput({
          token,
        });


      if (
        !input.valid
      ) {
        const error =
          new Error(
            "Authentication is required."
          );

        error.data = {
          code:
            "AUTHENTICATION_REQUIRED",
        };

        return next(
          error
        );
      }


      if (
        !env.jwtSecret
      ) {
        console.error(
          "[Security] JWT_SECRET is not configured for Socket.IO."
        );

        const error =
          new Error(
            "Authentication service is unavailable."
          );

        error.data = {
          code:
            "AUTHENTICATION_UNAVAILABLE",
        };

        return next(
          error
        );
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
        const error =
          new Error(
            "Invalid authentication token."
          );

        error.data = {
          code:
            "INVALID_AUTHENTICATION_TOKEN",
        };

        return next(
          error
        );
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


      socket.data.auth =
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
        const socketError =
          new Error(
            "Authentication token has expired."
          );

        socketError.data = {
          code:
            "AUTHENTICATION_TOKEN_EXPIRED",
        };

        return next(
          socketError
        );
      }


      if (
        error?.name ===
          "JsonWebTokenError" ||
        error?.name ===
          "NotBeforeError"
      ) {
        const socketError =
          new Error(
            "Invalid authentication token."
          );

        socketError.data = {
          code:
            "INVALID_AUTHENTICATION_TOKEN",
        };

        return next(
          socketError
        );
      }


      console.error(
        `[Security] Socket authentication failure: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );


      const socketError =
        new Error(
          "Authentication service is unavailable."
        );

      socketError.data = {
        code:
          "AUTHENTICATION_UNAVAILABLE",
      };

      return next(
        socketError
      );
    }
  };


export default authenticateSocket;
