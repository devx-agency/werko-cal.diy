import { logP } from "@calcom/lib/perf";
import { z } from "zod";
import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZExportHostsForWeightsInputSchema } from "./exportHostsForWeights.schema";
import { ZGetActiveOnOptionsSchema } from "./getActiveOnOptions.schema";
import { ZEventTypeInputSchema, ZGetEventTypesFromGroupSchema } from "./getByViewer.schema";
import { ZGetChildrenForAssignmentInputSchema } from "./getChildrenForAssignment.schema";
import { ZGetHashedLinkInputSchema } from "./getHashedLink.schema";
import { ZGetHashedLinksInputSchema } from "./getHashedLinks.schema";
import { ZGetHostsForAssignmentInputSchema } from "./getHostsForAssignment.schema";
import { ZGetHostsForAvailabilityInputSchema } from "./getHostsForAvailability.schema";
import { ZGetHostsWithLocationOptionsInputSchema } from "./getHostsWithLocationOptions.schema";
import { ZMassApplyHostLocationInputSchema } from "./massApplyHostLocation.schema";
import { get } from "./procedures/get";
import { ZSearchTeamMembersInputSchema } from "./searchTeamMembers.schema";

export const eventTypesRouter = router({
  // REVIEW: What should we name this procedure?
  getByViewer: authedAdminProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getByViewerHandler } = await import("./getByViewer.handler");

    const timer = logP(`getByViewer(${ctx.user.id})`);

    const result = await getByViewerHandler({
      ctx,
      input,
    });

    timer();

    return result;
  }),
  getUserEventGroups: authedAdminProcedure.input(ZEventTypeInputSchema).query(async ({ ctx, input }) => {
    const { getUserEventGroups } = await import("./getUserEventGroups.handler");

    const timer = logP(`getUserEventGroups(${ctx.user.id})`);

    const result = await getUserEventGroups({
      ctx,
      input,
    });

    timer();

    return result;
  }),

  getEventTypesFromGroup: authedAdminProcedure
    .input(ZGetEventTypesFromGroupSchema)
    .query(async ({ ctx, input }) => {
      const { getEventTypesFromGroup } = await import("./getEventTypesFromGroup.handler");

      const timer = logP(`getEventTypesFromGroup(${ctx.user.id})`);

      const result = await getEventTypesFromGroup({
        ctx,
        input,
      });

      timer();

      return result;
    }),

  getActiveOnOptions: authedAdminProcedure.input(ZGetActiveOnOptionsSchema).query(async ({ ctx, input }) => {
    const { getActiveOnOptions } = await import("./getActiveOnOptions.handler");

    const timer = logP(`getActiveOnOptions(${ctx.user.id})`);

    const result = await getActiveOnOptions({
      ctx,
      input,
    });

    timer();

    return result;
  }),

  list: authedAdminProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
    });
  }),

  listWithTeam: authedProcedure.query(async ({ ctx }) => {
    const { listWithTeamHandler } = await import("./listWithTeam.handler");

    return listWithTeamHandler({
      ctx,
    });
  }),

  get,

  delete: authedAdminProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  bulkEventFetch: authedProcedure.query(async ({ ctx }) => {
    const { bulkEventFetchHandler } = await import("./bulkEventFetch.handler");

    return bulkEventFetchHandler({
      ctx,
    });
  }),

  bulkUpdateToDefaultLocation: authedAdminProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bulkUpdateToDefaultLocationHandler } = await import("./bulkUpdateToDefaultLocation.handler");

      return bulkUpdateToDefaultLocationHandler({
        ctx,
        input,
      });
    }),

  getHashedLink: authedAdminProcedure.input(ZGetHashedLinkInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinkHandler } = await import("./getHashedLink.handler");

    return getHashedLinkHandler({
      ctx,
      input,
    });
  }),

  getHashedLinks: authedAdminProcedure.input(ZGetHashedLinksInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinksHandler } = await import("./getHashedLinks.handler");

    return getHashedLinksHandler({
      ctx,
      input,
    });
  }),

  getHostsForAvailability: authedAdminProcedure
    .input(ZGetHostsForAvailabilityInputSchema)
    .query(async ({ ctx, input }) => {
      const { getHostsForAvailabilityHandler } = await import("./getHostsForAvailability.handler");

      return getHostsForAvailabilityHandler({
        ctx,
        input,
      });
    }),

  getHostsForAssignment: authedAdminProcedure
    .input(ZGetHostsForAssignmentInputSchema)
    .query(async ({ ctx, input }) => {
      const { getHostsForAssignmentHandler } = await import("./getHostsForAssignment.handler");

      return getHostsForAssignmentHandler({
        ctx,
        input,
      });
    }),

  exportHostsForWeights: authedAdminProcedure
    .input(ZExportHostsForWeightsInputSchema)
    .query(async ({ ctx, input }) => {
      const { exportHostsForWeightsHandler } = await import("./exportHostsForWeights.handler");

      return exportHostsForWeightsHandler({
        ctx,
        input,
      });
    }),

  getChildrenForAssignment: authedAdminProcedure
    .input(ZGetChildrenForAssignmentInputSchema)
    .query(async ({ ctx, input }) => {
      const { getChildrenForAssignmentHandler } = await import("./getChildrenForAssignment.handler");

      return getChildrenForAssignmentHandler({
        ctx,
        input,
      });
    }),

  getHostsWithLocationOptions: authedAdminProcedure
    .input(ZGetHostsWithLocationOptionsInputSchema)
    .query(async ({ ctx, input }) => {
      const { getHostsWithLocationOptionsHandler } = await import("./getHostsWithLocationOptions.handler");

      return getHostsWithLocationOptionsHandler({
        ctx,
        input,
      });
    }),

  massApplyHostLocation: authedAdminProcedure
    .input(ZMassApplyHostLocationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { massApplyHostLocationHandler } = await import("./massApplyHostLocation.handler");

      return massApplyHostLocationHandler({
        ctx,
        input,
      });
    }),

  searchTeamMembers: authedAdminProcedure
    .input(ZSearchTeamMembersInputSchema)
    .query(async ({ ctx, input }) => {
      const { searchTeamMembersHandler } = await import("./searchTeamMembers.handler");

      return searchTeamMembersHandler({
        ctx,
        input,
      });
    }),
});
