import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";
import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("two_factor_auth"),
    (t) => t("add_an_extra_layer_of_security"),
    undefined,
    undefined,
    "/settings/security/two-factor-auth"
  );
const Page = async () => {
  await requireAuthenticatedPage("/settings/security/two-factor-auth");
  const t = await getTranslate();

  return (
    <SettingsHeader
      title={t("2fa")}
      description={t("set_up_two_factor_authentication")}
      borderInShellHeader={true}>
      <TwoFactorAuthView />
    </SettingsHeader>
  );
};

export default Page;
