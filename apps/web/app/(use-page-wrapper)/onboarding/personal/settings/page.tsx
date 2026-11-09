import { APP_NAME } from "@calcom/lib/constants";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import { PersonalSettingsView } from "~/onboarding/personal/settings/personal-settings-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("personal_settings")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/settings"
  );
};

const ServerPage = async (props: { searchParams: Promise<{ fromTeamOnboarding?: string }> }) => {
  const searchParams = await props.searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath("/onboarding/personal/settings", searchParams)
  );
  const userEmail = session.user.email || "";
  const userName = session.user.name || "";
  const fromTeamOnboarding = searchParams?.fromTeamOnboarding === "true";

  return (
    <PersonalSettingsView userEmail={userEmail} userName={userName} fromTeamOnboarding={fromTeamOnboarding} />
  );
};

export default ServerPage;
