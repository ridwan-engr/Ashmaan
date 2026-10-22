import express
  from "express";

import {
  listAlarmRecords,
  getAlarmSummaryRecord,
} from "../controllers/alarmController.js";


const router =
  express.Router();


router.get(
  "/",
  listAlarmRecords
);


router.get(
  "/summary",
  getAlarmSummaryRecord
);


export default router;