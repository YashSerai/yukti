import { z } from "zod";

export const actionStateSchema = z.enum(["detected", "contextualizing", "needs_input", "researching", "ready_for_approval", "approved", "purchasing", "completed", "failed", "outcome_unknown"]);
export type ActionState = z.infer<typeof actionStateSchema>;

const transitions: Record<ActionState, readonly ActionState[]> = {
  detected: ["contextualizing"], contextualizing: ["needs_input", "researching", "failed"], needs_input: ["contextualizing", "failed"],
  researching: ["ready_for_approval", "needs_input", "failed"], ready_for_approval: ["approved", "researching", "failed"],
  approved: ["purchasing", "failed"], purchasing: ["completed", "failed", "outcome_unknown"], completed: [], failed: [], outcome_unknown: ["completed", "failed"],
};

export function transition(from: ActionState, to: ActionState): ActionState {
  if (!transitions[from].includes(to)) throw new Error(`Illegal action transition: ${from} -> ${to}`);
  return to;
}
