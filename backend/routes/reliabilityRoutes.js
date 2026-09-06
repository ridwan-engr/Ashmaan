// backend/routes/reliabilityRoutes.js

import express
    from "express";

import {
    getLolp,
    getLole,
    getEens,
} from "../controllers/adequacyReliabilityController.js";

import {
    getReliabilityIndices,
    getSaidi,
    getSaifi,
    getCaidi,
    getAsai,
    getAsui,
} from "../controllers/reliabilityIndicesController.js";


import {
    getMtbf,
    getMttr,
    getFailureRate,
    getRepairRate,
    getTechnicalAvailability,
    getEquipmentReliability,
} from "../controllers/technicalReliabilityController.js";


const router =
    express.Router();


/*
|--------------------------------------------------------------------------
| Service / distribution reliability
|--------------------------------------------------------------------------
*/

router.get(
    "/indices",
    getReliabilityIndices
);


router.get(
    "/saidi",
    getSaidi
);


router.get(
    "/saifi",
    getSaifi
);


router.get(
    "/caidi",
    getCaidi
);


router.get(
    "/asai",
    getAsai
);


router.get(
    "/asui",
    getAsui
);


/*
|--------------------------------------------------------------------------
| Equipment technical reliability
|--------------------------------------------------------------------------
*/

router.get(
    "/mtbf",
    getMtbf
);


router.get(
    "/mttr",
    getMttr
);


router.get(
    "/failure-rate",
    getFailureRate
);


router.get(
    "/repair-rate",
    getRepairRate
);


router.get(
    "/technical-availability",
    getTechnicalAvailability
);


router.get(
    "/reliability",
    getEquipmentReliability
);

router.get(
    "/lolp",
    getLolp
);

router.get(
    "/lole",
    getLole
);

router.get(
    "/eens",
    getEens
);


export default router;