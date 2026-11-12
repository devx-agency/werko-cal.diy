import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";
import PasswordViewWrapper from "~/settings/security/password-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("password"),
    (t) => t("password_description"),
    undefined,
    undefined,
    "/settings/security/password"
  );

const Page = async () => {
  await requireAuthenticatedPage("/settings/security/password");
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("password")} description={t("password_description")} borderInShellHeader={true}>
      <PasswordViewWrapper />
    </SettingsHeader>
  );
};

export default Page;
