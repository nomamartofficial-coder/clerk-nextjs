import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { deleteCouponOnExpiry, syncUserCreation, syncUserDeletion, syncUserUpdation } from "@/inngest/functions";
import { processTask } from "@/src/innges/function";

// Create an API that serves zero Functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,
    processTask,
    deleteCouponOnExpiry
  ],
});