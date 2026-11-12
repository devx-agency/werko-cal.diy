import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";
import { EventTypeWebWrapper } from "@calcom/web/modules/event-types/components/EventTypeWebWrapper";
import { createLocalPath, requireAdminPage } from "app/_lib/pageAuthorization";
import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("event_type")}`,
    () => "",
    undefined,
    undefined,
    "/event-types"
  );
};

const getCachedEventType = unstable_cache(
  async (eventTypeId: number, headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const caller = await createRouterCaller(eventTypesRouter, await getTRPCContext(headers, cookies));
    return await caller.get({ id: eventTypeId });
  },
  ["viewer.eventTypes.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

const ServerPage = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  await requireAdminPage(createLocalPath(`/event-types/${encodeURIComponent(`${resolvedParams.type}`)}`));
  const parsed = querySchema.safeParse(resolvedParams);
  if (!parsed.success) {
    throw new Error("Invalid Event Type id");
  }
  const eventTypeId = parsed.data.type;
  const _headers = await headers();
  const _cookies = await cookies();

  const data = await getCachedEventType(eventTypeId, _headers, _cookies);
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }

  // Fetch permissions for the event type's team
  const permissions = {
    eventTypes: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
  };

  return <EventTypeWebWrapper data={data} id={eventTypeId} permissions={permissions} />;
};

export default ServerPage;
