import { z } from "zod";
import { infrai } from "./infrai.js";

export const WorkOrderRequest = z.object({
  domain: z.string().min(3),
  technicianEmail: z.string().email(),
  workOrderId: z.string().min(1),
  dispatchStatus: z.enum(["queued", "en_route", "complete"]),
  photoCount: z.number().int().nonnegative(),
  followUp: z.string().min(1)
});
export type WorkOrder = z.infer<typeof WorkOrderRequest>;

export function followUpSubject(order: WorkOrder): string {
  return order.dispatchStatus === "complete" ? `Work order ${order.workOrderId} completed` : `Work order ${order.workOrderId} update`;
}

export async function onboardWorkOrder(input: unknown) {
  const order = WorkOrderRequest.parse(input);
  const verification = await infrai.email.domain.verify(order.domain);
  if (verification.verification.status !== "verified") return { status: "pending", verification: verification.verification.status };
  const message = await infrai.email.send({
    to: order.technicianEmail,
    subject: followUpSubject(order),
    html: `<p>Dispatch: ${order.dispatchStatus}. Photos attached: ${order.photoCount}. Follow-up: ${order.followUp}</p>`
  }, `work-order-${order.workOrderId}`);
  return { status: "notified", messageId: message.message_id, verification: verification.verification.status };
}
