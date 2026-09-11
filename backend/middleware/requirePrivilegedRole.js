import {
  RBAC_ROLES,
} from "../services/security/authorizationRbacService.js";


const ALLOWED_PRIVILEGED_ROLES =
  new Set([
    RBAC_ROLES.OPERATOR,
    RBAC_ROLES.ADMINISTRATOR,
    RBAC_ROLES.SERVICE,
  ]);


const requirePrivilegedRole =
  (
    req,
    res,
    next
  ) => {
    if (
      req.auth
        ?.authenticated !==
      true
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
      !ALLOWED_PRIVILEGED_ROLES
        .has(
          req.auth.role
        )
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Authorization denied.",
        });
    }


    return next();
  };


export default requirePrivilegedRole;