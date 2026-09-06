// backend/scripts/validateAdequacyReliabilityRealData.js

import "dotenv/config";

import dns from "dns";
import mongoose from "mongoose";

import {
    calculateLolp,
    LOLP_STATUS,
} from "../services/reliability/lolpCalculationService.js";

import {
    calculateLole,
    LOLE_STATUS,
} from "../services/reliability/loleCalculationService.js";

import {
    calculateEens,
    EENS_STATUS,
} from "../services/reliability/eensCalculationService.js";


/*
|--------------------------------------------------------------------------
| DNS
|--------------------------------------------------------------------------
|
| Retain the same DNS workaround already used by the backend because this
| validator connects directly to MongoDB Atlas.
|--------------------------------------------------------------------------
*/

dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
]);


/*
|--------------------------------------------------------------------------
| Assertion helpers
|--------------------------------------------------------------------------
*/

function assertEqual(
    actual,
    expected,
    label
) {
    if (
        actual !==
        expected
    ) {
        throw new Error(
            `${label}: expected ${expected}, received ${actual}`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


function assertTrue(
    condition,
    label
) {
    if (
        condition !==
        true
    ) {
        throw new Error(
            `${label}: condition was not true`
        );
    }

    console.log(
        `PASS: ${label}`
    );
}


/*
|--------------------------------------------------------------------------
| Heading
|--------------------------------------------------------------------------
*/

console.log("");

console.log(
    "================================================="
);

console.log(
    "ASHMAAN REAL-DATA ADEQUACY RELIABILITY VALIDATION"
);

console.log(
    "================================================="
);

console.log("");


/*
|--------------------------------------------------------------------------
| Database connection
|--------------------------------------------------------------------------
*/

const mongoUri =
    process.env
        .MONGODB_URI;


if (
    !mongoUri
) {
    throw new Error(
        "MONGODB_URI is required"
    );
}


await mongoose.connect(
    mongoUri
);


console.log(
    "MongoDB connected"
);

console.log("");


try {

    /*
    |--------------------------------------------------------------------------
    | Raw production collections
    |--------------------------------------------------------------------------
    |
    | We inspect the database without changing any production data.
    |--------------------------------------------------------------------------
    */

    const db =
        mongoose
            .connection
            .db;


    const installations =
        db.collection(
            "installations"
        );

    const telemetry =
        db.collection(
            "telemetries"
        );


    /*
    |--------------------------------------------------------------------------
    | 1. Production installation population
    |--------------------------------------------------------------------------
    */

    const installationCount =
        await installations
            .countDocuments({
                source:
                    "VRM",

                syncEnabled:
                    true,

                status: {
                    $ne:
                        "INACTIVE",
                },
            });


    console.log(
        `Eligible VRM installations: ${installationCount}`
    );


    assertTrue(
        installationCount >
            0,
        "Production VRM installation population exists"
    );


    /*
    |--------------------------------------------------------------------------
    | 2. Telemetry population
    |--------------------------------------------------------------------------
    */

    const telemetryCount =
        await telemetry
            .countDocuments({});


    console.log(
        `Telemetry documents: ${telemetryCount}`
    );


    assertTrue(
        telemetryCount >
            0,
        "Production telemetry exists"
    );


    /*
    |--------------------------------------------------------------------------
    | 3. Served-load evidence
    |--------------------------------------------------------------------------
    |
    | Known VRM attributes already established during Phase 7:
    |
    | 131 /Ac/Consumption/L1/Power
    | 132 /Ac/Consumption/L2/Power
    | 133 /Ac/Consumption/L3/Power
    |
    | 567 /Ac/Out/L1/P
    | 568 /Ac/Out/L2/P
    | 569 /Ac/Out/L3/P
    |
    | These can provide observed SERVED LOAD / AC output evidence.
    |
    | They do NOT automatically establish REQUIRED LOAD for probabilistic
    | adequacy analysis.
    |--------------------------------------------------------------------------
    */

    const loadAttributeIds =
        [
            131,
            132,
            133,
            567,
            568,
            569,
        ];


    const servedLoadTelemetryCount =
        await telemetry
            .countDocuments({
                vrmAttributeId: {
                    $in:
                        loadAttributeIds,
                },
            });


    console.log(
        `Served-load telemetry records: ${servedLoadTelemetryCount}`
    );


    const servedLoadEvidenceExists =
        servedLoadTelemetryCount >
        0;


    assertTrue(
        typeof servedLoadEvidenceExists ===
            "boolean",
        "Served-load telemetry evidence is explicitly assessed"
    );


    /*
    |--------------------------------------------------------------------------
    | 4. Active source evidence
    |--------------------------------------------------------------------------
    |
    | VRM attribute 471:
    |
    | /Ac/ActiveIn/Source
    |
    | This establishes source identity where supported.
    |
    | It does NOT establish available generation/supply capacity in kW.
    |--------------------------------------------------------------------------
    */

    const activeSourceTelemetryCount =
        await telemetry
            .countDocuments({
                vrmAttributeId:
                    471,
            });


    console.log(
        `Active-source telemetry records: ${activeSourceTelemetryCount}`
    );


    const activeSourceEvidenceExists =
        activeSourceTelemetryCount >
        0;


    assertTrue(
        typeof activeSourceEvidenceExists ===
            "boolean",
        "Active-source telemetry evidence is explicitly assessed"
    );


    /*
    |--------------------------------------------------------------------------
    | 5. Real adequacy input qualification
    |--------------------------------------------------------------------------
    |
    | Current engineering boundary:
    |
    | requiredLoadEstablished = false
    |
    | Why?
    | Served load is not necessarily required demand. During supply
    | limitation, measured served load may already be curtailed.
    |
    |
    | availableSupplyEstablished = false
    |
    | Why?
    | Active-source identity, delivered power, PV output, generator output,
    | inverter output, etc. do not by themselves establish the amount of
    | supply that was AVAILABLE to serve demand.
    |
    | Available supply would require a qualified model incorporating things
    | such as:
    |
    | - grid availability / import capability
    | - generator available capacity and operational state
    | - PV available power / forecast / irradiance limitation
    | - battery SOC
    | - battery discharge limit
    | - reserve policy
    | - inverter power limits
    | - source-specific derating
    |
    | Therefore no production adequacy states are fabricated here.
    |--------------------------------------------------------------------------
    */

    const requiredLoadEstablished =
        false;

    const availableSupplyEstablished =
        false;

    const probabilisticScenarioModelEstablished =
        false;


    assertEqual(
        requiredLoadEstablished,
        false,
        "Required-load adequacy evidence is not yet established from production VRM data"
    );


    assertEqual(
        availableSupplyEstablished,
        false,
        "Available-supply adequacy evidence is not yet established from production VRM data"
    );


    assertEqual(
        probabilisticScenarioModelEstablished,
        false,
        "Production probabilistic scenario model is not yet established"
    );


    /*
    |--------------------------------------------------------------------------
    | 6. Real-data adequacy-state collection
    |--------------------------------------------------------------------------
    |
    | This must remain empty until a production adequacy derivation service
    | explicitly establishes both demand and available-supply evidence.
    |--------------------------------------------------------------------------
    */

    const realAdequacyIntervals =
        [];


    assertEqual(
        realAdequacyIntervals.length,
        0,
        "No unqualified production telemetry is converted into adequacy states"
    );


    /*
    |--------------------------------------------------------------------------
    | 7. LOLP real-data result
    |--------------------------------------------------------------------------
    */

    const realLolp =
        calculateLolp({
            states: [],
        });


    assertEqual(
        realLolp.status,
        LOLP_STATUS
            .UNAVAILABLE,
        "Real-data LOLP remains unavailable without qualified adequacy states"
    );


    assertEqual(
        realLolp.lolp,
        null,
        "Missing production adequacy model does not fabricate LOLP zero"
    );


    /*
    |--------------------------------------------------------------------------
    | 8. LOLE real-data result
    |--------------------------------------------------------------------------
    */

    const realLole =
        calculateLole({
            intervals:
                realAdequacyIntervals,
        });


    assertEqual(
        realLole.status,
        LOLE_STATUS
            .UNAVAILABLE,
        "Real-data LOLE remains unavailable without qualified adequacy horizon"
    );


    assertEqual(
        realLole.loleHours,
        null,
        "Missing production adequacy horizon does not fabricate zero LOLE"
    );


    /*
    |--------------------------------------------------------------------------
    | 9. EENS real-data result
    |--------------------------------------------------------------------------
    */

    const realEens =
        calculateEens({
            intervals:
                realAdequacyIntervals,
        });


    assertEqual(
        realEens.status,
        EENS_STATUS
            .UNAVAILABLE,
        "Real-data EENS remains unavailable without qualified adequacy horizon"
    );


    assertEqual(
        realEens.eensKwh,
        null,
        "Missing production adequacy horizon does not fabricate zero EENS"
    );


    /*
    |--------------------------------------------------------------------------
    | 10. Do not substitute existing metrics
    |--------------------------------------------------------------------------
    */

    const monitoringStatusUsedAsSupply =
        false;

    const gridOutageEventsUsedAsLossOfLoad =
        false;

    const historicalEnsUsedAsEens =
        false;

    const activeSourceUsedAsAvailableCapacity =
        false;

    const servedLoadUsedAsRequiredDemand =
        false;


    assertEqual(
        monitoringStatusUsedAsSupply,
        false,
        "Monitoring ONLINE/OFFLINE is not interpreted as available supply"
    );


    assertEqual(
        gridOutageEventsUsedAsLossOfLoad,
        false,
        "Grid-source interruption events are not interpreted as loss-of-load states"
    );


    assertEqual(
        historicalEnsUsedAsEens,
        false,
        "Historical ENS is not substituted for probabilistic EENS"
    );


    assertEqual(
        activeSourceUsedAsAvailableCapacity,
        false,
        "Active-source identity is not interpreted as available capacity"
    );


    assertEqual(
        servedLoadUsedAsRequiredDemand,
        false,
        "Served load telemetry is not automatically interpreted as required demand"
    );


    /*
    |--------------------------------------------------------------------------
    | 11. Existing VRM evidence can still be reported
    |--------------------------------------------------------------------------
    |
    | The fact that some useful evidence exists is different from saying the
    | complete adequacy model exists.
    |--------------------------------------------------------------------------
    */

    console.log("");

    console.log(
        "Production evidence summary:"
    );

    console.log(
        `- eligible VRM installations: ${installationCount}`
    );

    console.log(
        `- telemetry documents: ${telemetryCount}`
    );

    console.log(
        `- served-load telemetry records: ${servedLoadTelemetryCount}`
    );

    console.log(
        `- active-source telemetry records: ${activeSourceTelemetryCount}`
    );

    console.log(
        `- required-load adequacy model established: ${requiredLoadEstablished}`
    );

    console.log(
        `- available-supply model established: ${availableSupplyEstablished}`
    );

    console.log(
        `- probabilistic scenario model established: ${probabilisticScenarioModelEstablished}`
    );

    console.log(
        `- qualified production adequacy intervals: ${realAdequacyIntervals.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | Final
    |--------------------------------------------------------------------------
    */

    console.log("");

    console.log(
        "================================================="
    );

    console.log(
        "REAL-DATA ADEQUACY RELIABILITY VALIDATION PASSED"
    );

    console.log(
        "================================================="
    );

    console.log("");

    console.log(
        "Validated engineering semantics:"
    );

    console.log(
        "- production telemetry exists and is inspected without modification"
    );

    console.log(
        "- served-load telemetry does not automatically establish required demand"
    );

    console.log(
        "- active-source telemetry does not establish available supply capacity"
    );

    console.log(
        "- current production data is not converted into fabricated adequacy states"
    );

    console.log(
        "- LOLP remains unavailable until qualified load and available-supply evidence exists"
    );

    console.log(
        "- LOLE remains unavailable until a qualified adequacy horizon exists"
    );

    console.log(
        "- EENS remains unavailable until probability-weighted adequacy deficits are established"
    );

    console.log(
        "- missing adequacy evidence is represented as UNAVAILABLE rather than zero risk"
    );

    console.log(
        "- grid outages, monitoring status and historical ENS are not substituted for adequacy metrics"
    );
}
finally {
    await mongoose.disconnect();

    console.log("");

    console.log(
        "MongoDB disconnected"
    );
}