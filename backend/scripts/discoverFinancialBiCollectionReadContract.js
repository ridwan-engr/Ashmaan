/**
 * P.1H-G4-D1
 * Financial/BI Collection Read Contract Discovery
 *
 * PURPOSE
 * -------
 * Establish the existing Financial/BI collection-read topology before
 * implementing collection ACL enforcement.
 *
 * This gate answers:
 *
 * 1. What performs Financial/BI collection reads?
 * 2. What filter shape reaches the read repository?
 * 3. Is vrmSiteId scalar-only or is multi-site scope already supported?
 * 4. Where can authorized SITE scope be injected?
 * 5. Can FLEET be rejected before repository execution?
 * 6. Can empty entitlement return [] without unrestricted repository access?
 * 7. Does Financial/BI already have HTTP/controller integration?
 *
 * DISCOVERY ONLY.
 * NO PRODUCTION MUTATION.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const BACKEND_ROOT =
    path.resolve(__dirname, "..");

const TARGETS = [
    "services/financialBi/mongooseFinancialBiReadRepository.js",
    "services/financialBi/financialBiApiContract.js",
    "services/financialBi/financialBiDashboardContract.js",
    "services/security/userInstallationScopeService.js",
    "services/security/vrmInstallationCollectionScopeService.js",
    "services/security/financialBiRecordAuthorizationService.js",
];

const SEARCH_ROOTS = [
    "controllers",
    "routes",
    "services/financialBi",
    "services/security",
];

const SOURCE_EXTENSIONS =
    new Set([
        ".js",
        ".mjs",
        ".cjs",
    ]);

const EXCLUDED_DIRECTORIES =
    new Set([
        "node_modules",
        ".git",
        "coverage",
        "dist",
        "build",
    ]);

function divider(
    character = "="
) {
    console.log(
        character.repeat(72)
    );
}

function relative(filePath) {
    return path
        .relative(
            BACKEND_ROOT,
            filePath
        )
        .replaceAll("\\", "/");
}

function read(filePath) {
    try {
        return fs.readFileSync(
            filePath,
            "utf8"
        );
    } catch {
        return null;
    }
}

function collectFiles(
    directory,
    output = []
) {
    if (
        !fs.existsSync(directory)
    ) {
        return output;
    }

    for (
        const entry of
        fs.readdirSync(
            directory,
            {
                withFileTypes: true,
            }
        )
    ) {
        const fullPath =
            path.join(
                directory,
                entry.name
            );

        if (
            entry.isDirectory()
        ) {
            if (
                !EXCLUDED_DIRECTORIES
                    .has(entry.name)
            ) {
                collectFiles(
                    fullPath,
                    output
                );
            }

            continue;
        }

        if (
            entry.isFile() &&
            SOURCE_EXTENSIONS.has(
                path.extname(
                    entry.name
                )
            )
        ) {
            output.push(
                fullPath
            );
        }
    }

    return output;
}

function printContext({
    source,
    lineIndex,
    radius = 5,
}) {
    const lines =
        source.split(/\r?\n/);

    const start =
        Math.max(
            0,
            lineIndex - radius
        );

    const end =
        Math.min(
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

function findMatches(
    source,
    patterns
) {
    const lines =
        source.split(/\r?\n/);

    const matches = [];

    for (
        let index = 0;
        index < lines.length;
        index += 1
    ) {
        if (
            patterns.some(
                (pattern) =>
                    pattern.test(
                        lines[index]
                    )
            )
        ) {
            matches.push({
                lineIndex:
                    index,

                lineNumber:
                    index + 1,

                line:
                    lines[index],
            });
        }
    }

    return matches;
}

function inspectFile(
    filePath,
    patterns,
    {
        maxMatches = 20,
        radius = 5,
    } = {}
) {
    const source =
        read(filePath);

    if (
        source === null
    ) {
        console.log(
            `MISSING: ${relative(filePath)}`
        );

        return {
            exists: false,
            matches: [],
        };
    }

    const matches =
        findMatches(
            source,
            patterns
        );

    console.log();
    console.log(
        `FILE: ${relative(filePath)}`
    );

    console.log(
        `MATCHES: ${matches.length}`
    );

    for (
        const match of
        matches.slice(
            0,
            maxMatches
        )
    ) {
        console.log();
        console.log(
            `MATCH @ line ${match.lineNumber}`
        );

        printContext({
            source,
            lineIndex:
                match.lineIndex,
            radius,
        });
    }

    if (
        matches.length >
        maxMatches
    ) {
        console.log();

        console.log(
            `... ${
                matches.length -
                maxMatches
            } additional match(es) omitted`
        );
    }

    return {
        exists: true,
        source,
        matches,
    };
}

divider();

console.log(
    "P.1H-G4-D1 — FINANCIAL/BI COLLECTION READ CONTRACT DISCOVERY"
);

divider();

console.log();
console.log(
    "MODE: DISCOVERY ONLY — NO PRODUCTION MUTATION"
);

/*
|--------------------------------------------------------------------------
| 1. Required target existence
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "1. REQUIRED CONTRACT SURFACES"
);

divider("-");

for (
    const target of TARGETS
) {
    const absolute =
        path.join(
            BACKEND_ROOT,
            target
        );

    console.log(
        `${
            fs.existsSync(
                absolute
            )
                ? "FOUND"
                : "MISSING"
        } ${target}`
    );
}

/*
|--------------------------------------------------------------------------
| 2. Repository contract
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "2. FINANCIAL/BI READ REPOSITORY CONTRACT"
);

divider("-");

const repositoryPath =
    path.join(
        BACKEND_ROOT,
        "services/financialBi/mongooseFinancialBiReadRepository.js"
    );

inspectFile(
    repositoryPath,
    [
        /\bexport\b/i,
        /\bfind\s*\(/i,
        /\bfindOne\s*\(/i,
        /\bfilters\b/i,
        /\bvrmSiteId\b/i,
        /\bvrmSiteIds\b/i,
        /\bfleetId\b/i,
        /\bscope\b/i,
        /\bscopeIdentity\b/i,
        /\$in\b/i,
        /\blimit\b/i,
        /\bsort\b/i,
        /\bskip\b/i,
    ],
    {
        maxMatches: 35,
        radius: 5,
    }
);

/*
|--------------------------------------------------------------------------
| 3. API query contract
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "3. FINANCIAL/BI API QUERY CONTRACT"
);

divider("-");

const apiContractPath =
    path.join(
        BACKEND_ROOT,
        "services/financialBi/financialBiApiContract.js"
    );

inspectFile(
    apiContractPath,
    [
        /\bbuildFinancialBiKpiListQuery\b/i,
        /\bvrmSiteId\b/i,
        /\bvrmSiteIds\b/i,
        /\bfleetId\b/i,
        /\bscope\b/i,
        /\bfilters\b/i,
        /\bquery\b/i,
        /\blimit\b/i,
        /\boffset\b/i,
        /\bpage\b/i,
    ],
    {
        maxMatches: 40,
        radius: 5,
    }
);

/*
|--------------------------------------------------------------------------
| 4. Dashboard/read consumer contract
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "4. FINANCIAL/BI DASHBOARD / READ CONSUMER CONTRACT"
);

divider("-");

const dashboardContractPath =
    path.join(
        BACKEND_ROOT,
        "services/financialBi/financialBiDashboardContract.js"
    );

inspectFile(
    dashboardContractPath,
    [
        /\bvrmSiteId\b/i,
        /\bvrmSiteIds\b/i,
        /\bfleetId\b/i,
        /\bscope\b/i,
        /\bfilter\b/i,
        /\bquery\b/i,
        /\blist\b/i,
        /\bread\b/i,
    ],
    {
        maxMatches: 30,
        radius: 5,
    }
);

/*
|--------------------------------------------------------------------------
| 5. Existing collection authorization primitives
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "5. EXISTING COLLECTION AUTHORIZATION PRIMITIVES"
);

divider("-");

for (
    const target of [
        "services/security/userInstallationScopeService.js",
        "services/security/vrmInstallationCollectionScopeService.js",
        "services/security/financialBiRecordAuthorizationService.js",
    ]
) {
    inspectFile(
        path.join(
            BACKEND_ROOT,
            target
        ),
        [
            /\bgetUserInstallationScope\b/i,
            /\bgetEntitledVrmSiteIds\b/i,
            /\binstallationIds\b/i,
            /\bvrmSiteId\b/i,
            /\bvrmSiteIds\b/i,
            /\bUserInstallationAccess\b/i,
            /\bAUTHORIZED\b/i,
            /\bFORBIDDEN\b/i,
            /\bUNAVAILABLE\b/i,
            /\bFLEET_AUTHORIZATION_UNAVAILABLE\b/i,
        ],
        {
            maxMatches: 30,
            radius: 4,
        }
    );
}

/*
|--------------------------------------------------------------------------
| 6. Financial/BI call-site discovery
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "6. FINANCIAL/BI READ CALL-SITE DISCOVERY"
);

divider("-");

const searchFiles = [];

for (
    const root of SEARCH_ROOTS
) {
    collectFiles(
        path.join(
            BACKEND_ROOT,
            root
        ),
        searchFiles
    );
}

const uniqueSearchFiles =
    [
        ...new Set(
            searchFiles
        ),
    ].sort();

const CALL_SITE_PATTERNS = [
    /mongooseFinancialBiReadRepository/i,
    /buildFinancialBiKpiListQuery/i,
    /listFinancialBi/i,
    /getFinancialBi/i,
    /findFinancialBi/i,
    /readFinancialBi/i,
    /financialBi.*Repository/i,
    /repository.*financialBi/i,
    /FINANCIAL_BI/i,
];

let callSiteFiles = 0;

for (
    const filePath of
    uniqueSearchFiles
) {
    const source =
        read(filePath);

    if (
        source === null
    ) {
        continue;
    }

    const matches =
        findMatches(
            source,
            CALL_SITE_PATTERNS
        );

    if (
        matches.length === 0
    ) {
        continue;
    }

    callSiteFiles += 1;

    console.log();
    console.log(
        `CALL-SITE FILE: ${relative(filePath)}`
    );

    console.log(
        `MATCHES: ${matches.length}`
    );

    for (
        const match of
        matches.slice(0, 15)
    ) {
        console.log();

        console.log(
            `MATCH @ line ${match.lineNumber}`
        );

        printContext({
            source,
            lineIndex:
                match.lineIndex,
            radius: 4,
        });
    }

    if (
        matches.length > 15
    ) {
        console.log(
            `... ${
                matches.length - 15
            } additional match(es) omitted`
        );
    }
}

console.log();

console.log(
    `Financial/BI candidate call-site files: ${callSiteFiles}`
);

/*
|--------------------------------------------------------------------------
| 7. HTTP/controller/route discovery
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "7. FINANCIAL/BI HTTP SURFACE DISCOVERY"
);

divider("-");

for (
    const root of [
        "controllers",
        "routes",
    ]
) {
    const files = [];

    collectFiles(
        path.join(
            BACKEND_ROOT,
            root
        ),
        files
    );

    for (
        const filePath of files
    ) {
        const source =
            read(filePath);

        if (
            source === null
        ) {
            continue;
        }

        const matches =
            findMatches(
                source,
                [
                    /\bfinancialBi\b/i,
                    /\bfinancial-bi\b/i,
                    /\bfinancial_bi\b/i,
                    /\bFINANCIAL_BI\b/i,
                    /\bREAD_FINANCIAL_BI\b/i,
                ]
            );

        if (
            matches.length === 0
        ) {
            continue;
        }

        console.log();
        console.log(
            `HTTP FILE: ${relative(filePath)}`
        );

        for (
            const match of
            matches.slice(
                0,
                15
            )
        ) {
            console.log();

            console.log(
                `MATCH @ line ${match.lineNumber}`
            );

            printContext({
                source,
                lineIndex:
                    match.lineIndex,
                radius: 4,
            });
        }
    }
}

/*
|--------------------------------------------------------------------------
| 8. Scalar versus collection identity discovery
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "8. SCALAR VS MULTI-SITE FILTER DISCOVERY"
);

divider("-");

const repositorySource =
    read(repositoryPath) ?? "";

const apiSource =
    read(apiContractPath) ?? "";

const combinedContractSource =
    `${repositorySource}\n${apiSource}`;

const hasScalarVrmSiteId =
    /\bvrmSiteId\b/.test(
        combinedContractSource
    );

const hasPluralVrmSiteIds =
    /\bvrmSiteIds\b/.test(
        combinedContractSource
    );

const hasMongoIn =
    /\$in\b/.test(
        repositorySource
    );

console.log();

console.log(
    `SCALAR_VRM_SITE_ID = ${
        hasScalarVrmSiteId
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `PLURAL_VRM_SITE_IDS = ${
        hasPluralVrmSiteIds
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log(
    `REPOSITORY_MONGO_IN = ${
        hasMongoIn
            ? "FOUND"
            : "NOT_FOUND"
    }`
);

console.log();

if (
    hasScalarVrmSiteId &&
    !hasPluralVrmSiteIds
) {
    console.log(
        "CANDIDATE FINDING: existing Financial/BI contract appears scalar-site oriented."
    );
}

if (
    hasPluralVrmSiteIds
) {
    console.log(
        "CANDIDATE FINDING: existing contract contains a plural site identity surface; inspect authority before reuse."
    );
}

if (
    !hasMongoIn
) {
    console.log(
        "CANDIDATE FINDING: no existing repository $in constraint was discovered."
    );
}

/*
|--------------------------------------------------------------------------
| 9. D1 conclusions requiring review
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "9. G4-D1 REVIEW QUESTIONS"
);

divider("-");

console.log(`
REVIEW 1:
What exact function performs the collection read?

REVIEW 2:
What exact filters are accepted by that function/repository?

REVIEW 3:
Is authorized multi-site filtering already supported?

REVIEW 4:
If not, what is the smallest safe repository extension?

REVIEW 5:
Where can user installation scope be resolved before repository execution?

REVIEW 6:
Can explicit FLEET requests be rejected before repository execution?

REVIEW 7:
Can zero authorized sites return [] without an unrestricted DB read?

REVIEW 8:
Does a production Financial/BI HTTP/controller surface already exist?
`);

/*
|--------------------------------------------------------------------------
| 10. Safety
|--------------------------------------------------------------------------
*/

divider("-");

console.log(
    "10. G4-D1 DISCOVERY SAFETY"
);

divider("-");

console.log();

console.log(
    "PASS 1: Financial/BI read repository inspected"
);

console.log(
    "PASS 2: Financial/BI API query contract inspected"
);

console.log(
    "PASS 3: Financial/BI dashboard/read contract inspected"
);

console.log(
    "PASS 4: user installation scope primitive inspected"
);

console.log(
    "PASS 5: VRM installation collection scope primitive inspected"
);

console.log(
    "PASS 6: G4-C record authorization primitive inspected"
);

console.log(
    "PASS 7: Financial/BI call sites inspected"
);

console.log(
    "PASS 8: Financial/BI HTTP surfaces inspected"
);

console.log(
    "PASS 9: scalar versus multi-site repository capability inspected"
);

console.log(
    "PASS 10: no collection authorization semantics were invented"
);

console.log();

divider();

console.log(
    "P.1H-G4-D1 DISCOVERY COMPLETE"
);

console.log(
    "PRODUCTION MUTATION: NONE"
);

console.log(
    "NEXT DECISION: G4-D2 COLLECTION ACL DESIGN"
);

divider();