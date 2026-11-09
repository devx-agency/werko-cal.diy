import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { getCachedHasTeamPlan } from "@calcom/web/app/cache/membership";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description"),
    undefined,
    undefined,
    "/settings/my-account/appearance"
  );

const Page = async () => {
  const session = await requireAuthenticatedPage("/settings/my-account/appearance");
  const userId = session.user.id;

  const [meCaller, hasTeamPlan] = await Promise.all([
    createRouterCaller(meRouter),
    getCachedHasTeamPlan(userId),
  ]);

  const user = await meCaller.get();

  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fsettings%2Fmy-account%2Fappearance");
  }
  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;
  const hasPaidPlan = IS_SELF_HOSTED ? true : hasTeamPlan?.hasTeamPlan || isCurrentUsernamePremium;

  return <AppearancePage user={user} hasPaidPlan={hasPaidPlan} />;
};

export default Page;
