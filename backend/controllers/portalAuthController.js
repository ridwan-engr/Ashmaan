// controllers/portalAuthController.js

import {
  DEFAULT_REFRESH_TOKEN_TTL_SECONDS,
  DEFAULT_SECURE_COOKIE_POLICY,
  isSecureCookiePolicy,
} from "../services/security/sessionTokenSecurityService.js";

import {
  PORTAL_AUTH_ERROR,
  createPortalAuthenticationService,
} from "../services/security/portalAuthenticationService.js";


export const PORTAL_REFRESH_COOKIE_NAME =
  "ashmaan_refresh";


export const PORTAL_REFRESH_COOKIE_OPTIONS =
  Object.freeze({
    ...DEFAULT_SECURE_COOKIE_POLICY,

    maxAge:
      DEFAULT_REFRESH_TOKEN_TTL_SECONDS *
      1000,
  });


export const PORTAL_REFRESH_COOKIE_CLEAR_OPTIONS =
  Object.freeze({
    httpOnly:
      DEFAULT_SECURE_COOKIE_POLICY
        .httpOnly,

    secure:
      DEFAULT_SECURE_COOKIE_POLICY
        .secure,

    sameSite:
      DEFAULT_SECURE_COOKIE_POLICY
        .sameSite,

    path:
      DEFAULT_SECURE_COOKIE_POLICY
        .path,
  });


if (
  !isSecureCookiePolicy(
    PORTAL_REFRESH_COOKIE_OPTIONS
  )
) {
  throw new Error(
    "PORTAL_REFRESH_COOKIE_POLICY_INVALID"
  );
}


export function readCookie(
  cookieHeader,
  cookieName
) {
  if (
    typeof cookieHeader !==
      "string" ||
    cookieHeader.trim() ===
      "" ||
    typeof cookieName !==
      "string" ||
    cookieName.trim() ===
      ""
  ) {
    return null;
  }


  const expectedName =
    cookieName.trim();


  for (
    const segment of
    cookieHeader.split(";")
  ) {
    const separatorIndex =
      segment.indexOf("=");


    if (
      separatorIndex <=
      0
    ) {
      continue;
    }


    const name =
      segment
        .slice(
          0,
          separatorIndex
        )
        .trim();


    if (
      name !==
        expectedName
    ) {
      continue;
    }


    const rawValue =
      segment
        .slice(
          separatorIndex +
            1
        )
        .trim();


    if (
      rawValue ===
        ""
    ) {
      return null;
    }


    try {
      return decodeURIComponent(
        rawValue
      );
    } catch {
      return null;
    }
  }


  return null;
}


function sendAuthFailure(
  res,
  error
) {
  const code =
    error?.code;


  if (
    code ===
      PORTAL_AUTH_ERROR
        .CONFIGURATION_UNAVAILABLE
  ) {
    return res
      .status(503)
      .json({
        success:
          false,

        message:
          "Authentication service is unavailable.",
      });
  }


  return res
    .status(401)
    .json({
      success:
        false,

      message:
        "Authentication failed.",
    });
}


function sendAuthenticatedResult(
  res,
  result
) {
  res.cookie(
    PORTAL_REFRESH_COOKIE_NAME,
    result.refreshToken,
    PORTAL_REFRESH_COOKIE_OPTIONS
  );


  return res
    .status(200)
    .json({
      success:
        true,

      accessToken:
        result.accessToken,

      user:
        result.user,
    });
}


export function createPortalAuthController({
  authenticationService =
    createPortalAuthenticationService(),
} = {}) {
  const login =
    async (
      req,
      res
    ) => {
      try {
        const result =
          await authenticationService
            .login({
              email:
                req.body
                  ?.email,

              password:
                req.body
                  ?.password,
            });


        return sendAuthenticatedResult(
          res,
          result
        );
      } catch (
        error
      ) {
        return sendAuthFailure(
          res,
          error
        );
      }
    };


  const refresh =
    async (
      req,
      res
    ) => {
      try {
        const refreshToken =
          readCookie(
            req.headers
              ?.cookie,

            PORTAL_REFRESH_COOKIE_NAME
          );


        if (
          !refreshToken
        ) {
          return res
            .status(401)
            .json({
              success:
                false,

              message:
                "Authentication failed.",
            });
        }


        const result =
          await authenticationService
            .refresh({
              refreshToken,
            });


        return sendAuthenticatedResult(
          res,
          result
        );
      } catch (
        error
      ) {
        return sendAuthFailure(
          res,
          error
        );
      }
    };


  const logout =
    async (
      req,
      res
    ) => {
      try {
        await authenticationService
          .logout({
            sessionId:
              req.auth
                ?.sessionId,
          });


        res.clearCookie(
          PORTAL_REFRESH_COOKIE_NAME,
          PORTAL_REFRESH_COOKIE_CLEAR_OPTIONS
        );


        return res
          .status(200)
          .json({
            success:
              true,
          });
      } catch (
        error
      ) {
        return sendAuthFailure(
          res,
          error
        );
      }
    };


  const me =
    async (
      req,
      res
    ) => {
      try {
        const user =
          await authenticationService
            .getCurrentUser({
              userId:
                req.auth
                  ?.userId,
            });


        if (
          !user
        ) {
          return res
            .status(401)
            .json({
              success:
                false,

              message:
                "Authentication failed.",
            });
        }


        return res
          .status(200)
          .json({
            success:
              true,

            user,
          });
      } catch (
        error
      ) {
        return sendAuthFailure(
          res,
          error
        );
      }
    };


  return Object.freeze({
    login,
    refresh,
    logout,
    me,
  });
}


export default
  createPortalAuthController;
