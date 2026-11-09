import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { ZGetInputSchema } from "../get.schema";

export const get = authedAdminProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
  const handler = (await import("../get.handler")).getHandler;

  return handler({
    ctx,
    input,
  });
});
