// middleware/requireActivePortalSession.js

import Session from
  "../models/Session.js";


const respondUnauthorized = (
  res
) =>
  res
    .status(401)
    .json({
      success:
        false,

      message:
        "Authentication session is invalid or expired.",
    });


const respondUnavailable = (
  res
) =>
  res
    .status(503)
    .json({
      success:
        false,

      message:
        "Authentication service is unavailable.",
    });


export function createRequireActivePortalSession({
  SessionModel =
    Session,

  now =
    () =>
      new Date(),
} = {}) {
  if (
    !SessionModel ||
    typeof SessionModel.findOne !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_SESSION_MODEL_INVALID"
    );
  }


  if (
    typeof now !==
      "function"
  ) {
    throw new TypeError(
      "PORTAL_SESSION_CLOCK_INVALID"
    );
  }


  return async function requireActivePortalSession(
    req,
    res,
    next
  ) {
    try {
      const auth =
        req.auth;


      if (
        !auth ||
        auth.authenticated !==
          true ||
        typeof auth.sessionId !==
          "string" ||
        auth.sessionId.trim() ===
          "" ||
        typeof auth.userId !==
          "string" ||
        auth.userId.trim() ===
          ""
      ) {
        return respondUnauthorized(
          res
        );
      }


      const sessionId =
        auth.sessionId.trim();

      const userId =
        auth.userId.trim();


      const session =
        await SessionModel
          .findOne({
            sessionId,
          });


      if (
        !session ||
        typeof session.isUsable !==
          "function"
      ) {
        return respondUnauthorized(
          res
        );
      }


      const currentTime =
        now();


      if (
        !(currentTime instanceof Date) ||
        Number.isNaN(
          currentTime.getTime()
        )
      ) {
        throw new Error(
          "PORTAL_SESSION_CLOCK_INVALID"
        );
      }


      if (
        !session.isUsable(
          currentTime
        )
      ) {
        return respondUnauthorized(
          res
        );
      }


      if (
        String(
          session.user
        ) !==
        userId
      ) {
        return respondUnauthorized(
          res
        );
      }


      return next();
    } catch (
      error
    ) {
      console.error(
        `[Security] Portal session validation failure: ${
          error instanceof Error
            ? error.message
            : "Unknown error"
        }`
      );


      return respondUnavailable(
        res
      );
    }
  };
}


const requireActivePortalSession =
  createRequireActivePortalSession();


export default
  requireActivePortalSession;
