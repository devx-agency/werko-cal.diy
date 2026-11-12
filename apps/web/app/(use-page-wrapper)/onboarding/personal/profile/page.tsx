import { APP_NAME } from "@calcom/lib/constants";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import { PersonalSettingsView } from "~/onboarding/personal/settings/personal-settings-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("personal_profile")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/profile"
  );
};

const ServerPage = async () => {
  const session = await requireAuthenticatedPage("/onboarding/personal/profile");

  const userEmail = session.user.email || "";

  return <PersonalSettingsView userEmail={userEmail} />;
};

export default ServerPage;
