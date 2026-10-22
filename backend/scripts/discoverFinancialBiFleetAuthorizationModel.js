/**
 * P.1H-G4-B2
 * Financial/BI Fleet Membership / Authorization Model Discovery
 *
 * PURPOSE
 * -------
 * Determine whether ASHMAAN already contains an authoritative
 * authorization relationship for Financial/BI FLEET scope.
 *
 * This gate MUST NOT invent fleet authorization semantics.
 *
 * We are looking for evidence of one or more of:
 *
 *   user -> fleetId
 *   user -> fleet membership
 *   fleetId -> Installation
 *   fleetId -> vrmSiteId
 *   UserInstallationAccess -> fleetId
 *   authorized installation scope -> authoritative fleet membership
 *
 * IMPORTANT
 * ---------
 * A persisted/domain fleetId is NOT by itself authorization evidence.
 *
 * Discovery only. No production mutation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_ROOT = path.resolve(__dirname, "..");

const SEARCH_ROOTS = [
    "models",
    "services",
    "repositories",
    "controllers",
    "routes",
    "middleware",
    "config",
].map((directory) =>
    path.join(BACKEND_ROOT, directory)
);

const EXCLUDED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "coverage",
    "dist",
    "build",
]);

const SOURCE_EXTENSIONS = new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".json",
]);

const DISCOVERY_GROUPS = Object.freeze([
    {
        name: "FLEET DOMAIN / IDENTITY",
        patterns: [
            /\bFleet\b/i,
            /\bfleetId\b/i,
            /\bfleetIds\b/i,
            /\bfleetIdentity\b/i,
        ],
    },

    {
        name: "FLEET MEMBERSHIP",
        patterns: [
            /\bfleetMember\b/i,
            /\bfleetMembers\b/i,
            /\bfleetMembership\b/i,
            /\bfleetMemberships\b/i,
            /\bmemberFleet\b/i,
        ],
    },

    {
        name: "FLEET AUTHORIZATION / ENTITLEMENT",
        patterns: [
            /\bfleetAccess\b/i,
            /\bauthorizedFleet\b/i,
            /\bauthorizedFleets\b/i,
            /\ballowedFleet\b/i,
            /\ballowedFleets\b/i,
            /\bfleetEntitlement\b/i,
            /\bfleetEntitlements\b/i,
            /\buserFleet\b/i,
            /\buserFleets\b/i,
        ],
    },

    {
        name: "INSTALLATION AUTHORIZATION",
        patterns: [
            /\bUserInstallationAccess\b/i,
            /\buserInstallationAccess\b/i,
            /\buserInstallationScope\b/i,
            /\bauthorizedInstallation\b/i,
            /\bauthorizedInstallations\b/i,
            /\ballowedInstallation\b/i,
            /\ballowedInstallations\b/i,
            /\binstallationIds\b/i,
        ],
    },

    {
        name: "SITE / VRM IDENTITY",
        patterns: [
            /\bvrmSiteId\b/i,
            /\bvrmSiteIds\b/i,
            /\bsiteId\b/i,
            /\bsiteIds\b/i,
        ],
    },

    {
        name: "GENERIC MEMBERSHIP / TENANCY",
        patterns: [
            /\bmembership\b/i,
            /\bmemberships\b/i,
            /\bentitlement\b/i,
            /\bentitlements\b/i,
            /\btenantId\b/i,
            /\borganizationId\b/i,
            /\borganisationId\b/i,
        ],
    },

    {
        name: "AUTHORIZATION SERVICES",
        patterns: [
            /\bauthorization\b/i,
            /\bauthorize\b/i,
            /\bauthorized\b/i,
            /\baccessScope\b/i,
            /\bresolve.*Access\b/i,
            /\bresolve.*Scope\b/i,
        ],
    },
]);

const AUTHORIZATION_PATTERNS = [
    /\bfleetAccess\b/i,
    /\bauthorizedFleet/i,
    /\ballowedFleet/i,
    /\bfleetEntitlement/i,
    /\buserFleet/i,
    /\bfleetMembership/i,
];

const FLEET_INSTALLATION_PATTERNS = [
    /fleet.{0,100}installation/i,
    /installation.{0,100}fleet/i,
];

const FLEET_SITE_PATTERNS = [
    /fleet.{0,100}(vrmSite|siteId)/i,
    /(vrmSite|siteId).{0,100}fleet/i,
];

const USER_FLEET_PATTERNS = [
    /user.{0,100}fleet/i,
    /fleet.{0,100}user/i,
];

const INSTALLATION_ACCESS_FLEET_PATTERNS = [
    /UserInstallationAccess.{0,200}fleet/i,
    /fleet.{0,200}UserInstallationAccess/i,
    /userInstallationScope.{0,200}fleet/i,
    /fleet.{0,200}userInstallationScope/i,
];

function divider(character = "=") {
    console.log(character.repeat(68));
}

function normalizeRelative(filePath) {
    return path
        .relative(BACKEND_ROOT, filePath)
        .replaceAll("\\", "/");
}

function collectFiles(directory, result = []) {
    if (!fs.existsSync(directory)) {
        return result;
    }

    const entries = fs.readdirSync(
        directory,
        {
            withFileTypes: true,
        }
    );

    for (const entry of entries) {
        const fullPath = path.join(
            directory,
            entry.name
        );

        if (entry.isDirectory()) {
            if (
                !EXCLUDED_DIRECTORIES.has(
                    entry.name
                )
            ) {
                collectFiles(
                    fullPath,
                    result
                );
            }

            continue;
        }

        if (
            entry.isFile() &&
            SOURCE_EXTENSIONS.has(
                path.extname(entry.name)
            )
        ) {
            result.push(fullPath);
        }
    }

    return result;
}

function readSource(filePath) {
    try {
        return fs.readFileSync(
            filePath,
            "utf8"
        );
    } catch {
        return null;
    }
}

function printContext(
    lines,
    lineIndex,
    radius = 3
) {
    const start = Math.max(
        0,
        lineIndex - radius
    );

    const end = Math.min(
        lines.length - 1,
        lineIndex + radius
    );

    for (
        let index = start;
        index <= end;
        index += 1
    ) {
        const marker =
            index === lineIndex
                ? ">"
                : " ";

        console.log(
            `${marker} ${String(
                index + 1
            ).padStart(5, " ")} | ${lines[index]}`
        );
    }
}

function findLineMatches(
    source,
    patterns
) {
    const lines = source.split(/\r?\n/);
    const matches = [];

    for (
        let index = 0;
        index < lines.length;
        index += 1
    ) {
        const line = lines[index];

        if (
            patterns.some((pattern) =>
                pattern.test(line)
            )
        ) {
            matches.push({
                lineNumber: index + 1,
                lineIndex: index,
                line,
            });
        }
    }

    return {
        lines,
        matches,
    };
}

function containsAny(
    source,
    patterns
) {
    return patterns.some((pattern) =>
        pattern.test(source)
    );
}

divider();

console.log(
    "P.1H-G4-B2 — FINANCIAL/BI FLEET AUTHORIZATION MODEL DISCOVERY"
);

divider();

console.log();
console.log(
    "MODE: DISCOVERY ONLY — NO PRODUCTION MUTATION"
);

console.log();

const files = [];

for (const root of SEARCH_ROOTS) {
    collectFiles(
        root,
        files
    );
}

files.sort();

console.log(
    `Source files inspected: ${files.length}`
);

console.log();

const sources = [];

for (const filePath of files) {
    const source = readSource(filePath);

    if (source !== null) {
        sources.push({
            filePath,
            relativePath:
                normalizeRelative(filePath),
            source,
        });
    }
}

/*
 * ------------------------------------------------------------
 * 1. Structured discovery
 * ------------------------------------------------------------
 */

divider("-");

console.log(
    "1. STRUCTURED AUTHORIZATION SURFACE DISCOVERY"
);

divider("-");

for (const group of DISCOVERY_GROUPS) {
    console.log();
    console.log(
        `### ${group.name}`
    );

    let groupMatchCount = 0;

    for (const item of sources) {
        const {
            lines,
            matches,
        } = findLineMatches(
            item.source,
            group.patterns
        );

        if (matches.length === 0) {
            continue;
        }

        groupMatchCount +=
            matches.length;

        console.log();
        console.log(
            `FILE: ${item.relativePath}`
        );

        /*
         * Limit repetitive output per file while still
         * exposing enough surrounding implementation
         * evidence for architectural classification.
         */
        for (
            const match of matches.slice(
                0,
                12
            )
        ) {
            console.log();
            console.log(
                `MATCH @ line ${match.lineNumber}`
            );

            printContext(
                lines,
                match.lineIndex,
                3
            );
        }

        if (matches.length > 12) {
            console.log();
            console.log(
                `... ${matches.length - 12} additional match(es) omitted for this file`
            );
        }
    }

    console.log();
    console.log(
        `TOTAL MATCHES: ${groupMatchCount}`
    );
}

/*
 * ------------------------------------------------------------
 * 2. Relationship discovery
 * ------------------------------------------------------------
 */

divider("-");

console.log(
    "2. POSSIBLE AUTHORIZATION RELATIONSHIPS"
);

divider("-");

const relationshipResults = {
    fleetAuthorization: [],
    fleetInstallation: [],
    fleetSite: [],
    userFleet: [],
    installationAccessFleet: [],
};

for (const item of sources) {
    if (
        containsAny(
            item.source,
            AUTHORIZATION_PATTERNS
        )
    ) {
        relationshipResults
            .fleetAuthorization
            .push(item.relativePath);
    }

    if (
        containsAny(
            item.source,
            FLEET_INSTALLATION_PATTERNS
        )
    ) {
        relationshipResults
            .fleetInstallation
            .push(item.relativePath);
    }

    if (
        containsAny(
            item.source,
            FLEET_SITE_PATTERNS
        )
    ) {
        relationshipResults
            .fleetSite
            .push(item.relativePath);
    }

    if (
        containsAny(
            item.source,
            USER_FLEET_PATTERNS
        )
    ) {
        relationshipResults
            .userFleet
            .push(item.relativePath);
    }

    if (
        containsAny(
            item.source,
            INSTALLATION_ACCESS_FLEET_PATTERNS
        )
    ) {
        relationshipResults
            .installationAccessFleet
            .push(item.relativePath);
    }
}

function printRelationship(
    label,
    values
) {
    console.log();
    console.log(label);

    if (values.length === 0) {
        console.log(
            "  NONE DISCOVERED"
        );

        return;
    }

    for (
        const value of [
            ...new Set(values),
        ]
    ) {
        console.log(
            `  ${value}`
        );
    }
}

printRelationship(
    "A. Explicit fleet authorization / membership surfaces:",
    relationshipResults.fleetAuthorization
);

printRelationship(
    "B. Possible fleet -> Installation relationship:",
    relationshipResults.fleetInstallation
);

printRelationship(
    "C. Possible fleet -> VRM/site relationship:",
    relationshipResults.fleetSite
);

printRelationship(
    "D. Possible user -> fleet relationship:",
    relationshipResults.userFleet
);

printRelationship(
    "E. Possible UserInstallationAccess -> fleet relationship:",
    relationshipResults.installationAccessFleet
);

/*
 * ------------------------------------------------------------
 * 3. Candidate classification
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * These are discovery candidates, NOT authorization proof.
 * Human/code review must establish whether a relationship
 * is authoritative before G4-C may use it.
 * ------------------------------------------------------------
 */

divider("-");

console.log(
    "3. DISCOVERY CLASSIFICATION"
);

divider("-");

const hasExplicitFleetAuthorization =
    relationshipResults
        .fleetAuthorization
        .length > 0;

const hasFleetInstallationMapping =
    relationshipResults
        .fleetInstallation
        .length > 0;

const hasFleetSiteMapping =
    relationshipResults
        .fleetSite
        .length > 0;

const hasUserFleetRelationship =
    relationshipResults
        .userFleet
        .length > 0;

const hasInstallationAccessFleetBridge =
    relationshipResults
        .installationAccessFleet
        .length > 0;

console.log();

console.log(
    `EXPLICIT_FLEET_AUTHORIZATION_CANDIDATE = ${
        hasExplicitFleetAuthorization
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `FLEET_TO_INSTALLATION_CANDIDATE = ${
        hasFleetInstallationMapping
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `FLEET_TO_SITE_CANDIDATE = ${
        hasFleetSiteMapping
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `USER_TO_FLEET_CANDIDATE = ${
        hasUserFleetRelationship
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `INSTALLATION_ACCESS_TO_FLEET_CANDIDATE = ${
        hasInstallationAccessFleetBridge
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log();

console.log(
    "IMPORTANT: FOUND means candidate evidence only."
);

console.log(
    "It does NOT prove authorization authority."
);

/*
 * ------------------------------------------------------------
 * 4. Safety assertions
 * ------------------------------------------------------------
 */

divider("-");

console.log(
    "4. G4-B2 DISCOVERY SAFETY"
);

divider("-");

console.log();

console.log(
    "PASS 1: fleet domain/identity surfaces inspected"
);

console.log(
    "PASS 2: fleet membership surfaces inspected"
);

console.log(
    "PASS 3: fleet authorization/entitlement surfaces inspected"
);

console.log(
    "PASS 4: installation authorization surfaces inspected"
);

console.log(
    "PASS 5: VRM/site identity surfaces inspected"
);

console.log(
    "PASS 6: generic membership/tenancy surfaces inspected"
);

console.log(
    "PASS 7: possible fleet-to-installation/site relationships inspected"
);

console.log(
    "PASS 8: possible user-to-fleet relationships inspected"
);

console.log(
    "PASS 9: UserInstallationAccess-to-fleet bridge inspected"
);

console.log(
    "PASS 10: domain identity was not treated as authorization proof"
);

console.log();

/*
 * Do NOT automatically declare EXISTING_ACL or DERIVED_ACL
 * merely because textual candidates were found.
 *
 * The output must be reviewed before selecting:
 *
 *   EXISTING_ACL
 *   DERIVED_ACL
 *   FAIL_CLOSED
 */

divider();

console.log(
    "P.1H-G4-B2 DISCOVERY COMPLETE"
);

console.log();

console.log(
    "FINAL AUTHORIZATION DECISION: REVIEW REQUIRED"
);

console.log();

console.log(
    "Permitted post-review classifications:"
);

console.log(
    "  EXISTING_ACL"
);

console.log(
    "  DERIVED_ACL"
);

console.log(
    "  FAIL_CLOSED"
);

divider();