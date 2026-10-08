import assert from "node:assert/strict";
import { followUpSubject, WorkOrderRequest } from "./service.js";

const order = WorkOrderRequest.parse({
  domain: "dispatch.example.com",
  technicianEmail: "tech@example.com",
  workOrderId: "WO-1042",
  dispatchStatus: "complete",
  photoCount: 3,
  followUp: "Confirm the replacement part serial number."
});
assert.equal(followUpSubject(order), "Work order WO-1042 completed");
console.log("business decision test passed");
