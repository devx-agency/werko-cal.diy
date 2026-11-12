import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { getTravelSchedule } from "@calcom/web/app/cache/travelSchedule";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import GeneralView from "~/settings/my-account/general-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("general"),
    (t) => t("general_description"),
    undefined,
    undefined,
    "/settings/my-account/general"
  );

const Page = async () => {
  const session = await requireAuthenticatedPage("/settings/my-account/general");
  const userId = session.user.id;

  const meCaller = await createRouterCaller(meRouter);
  const [user, travelSchedules] = await Promise.all([meCaller.get(), getTravelSchedule(userId)]);
  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fsettings%2Fmy-account%2Fgeneral");
  }
  return <GeneralView user={user} travelSchedules={travelSchedules ?? []} />;
};

export default Page;
