import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import ProfileView from "~/settings/my-account/profile-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("profile"),
    (t) => t("profile_description"),
    undefined,
    undefined,
    "/settings/my-account/profile"
  );

const Page = async () => {
  await requireAuthenticatedPage("/settings/my-account/profile");
  const meCaller = await createRouterCaller(meRouter);
  const user = await meCaller.get({ includePasswordAdded: true });
  if (!user) {
    redirect("/auth/login");
  }

  return <ProfileView user={user} />;
};

export default Page;
