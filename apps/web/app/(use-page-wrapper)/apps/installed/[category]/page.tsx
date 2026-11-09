import { AppCategories } from "@calcom/prisma/enums";
import { appsRouter } from "@calcom/trpc/server/routers/viewer/apps/_router";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/_router";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { createRouterCaller } from "app/_trpc/context";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import { z } from "zod";
import InstalledApps from "~/apps/installed/[category]/installed-category-view";

const querySchema = z.object({
  category: z.nativeEnum(AppCategories),
});

export const generateMetadata = async ({ params }: { params: Promise<{ category: string }> }) => {
  const { category } = await params;
  await requireAuthenticatedPage(`/apps/installed/${encodeURIComponent(category)}`);
  return await _generateMetadata(
    (t) => t("installed_apps"),
    (t) => t("manage_your_connected_apps"),
    undefined,
    undefined,
    `/apps/installed/${category}`
  );
};

const InstalledAppsWrapper = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/apps/installed/${encodeURIComponent(`${resolvedParams.category}`)}`)
  );
  const parsedParams = querySchema.safeParse(resolvedParams);

  if (!parsedParams.success) {
    redirect("/apps/installed/calendar");
  }

  const [calendarsCaller, appsCaller] = await Promise.all([
    createRouterCaller(calendarsRouter),
    createRouterCaller(appsRouter),
  ]);

  const [connectedCalendars, installedCalendars] = await Promise.all([
    calendarsCaller.connectedCalendars(),
    appsCaller.integrations({
      variant: "calendar",
      onlyInstalled: true,
    }),
  ]);

  return (
    <InstalledApps
      connectedCalendars={connectedCalendars}
      installedCalendars={installedCalendars}
      category={parsedParams.data.category}
    />
  );
};

export default InstalledAppsWrapper;
