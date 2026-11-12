import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { FlagListingView } from "@calcom/web/modules/feature-flags/views/flag-listing-view";
import { requireAdminPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("feature_flags"),
    (t) => t("admin_flags_description"),
    undefined,
    undefined,
    "/settings/admin/flags"
  );
};

const Page = async () => {
  await requireAdminPage("/settings/admin/flags");
  const t = await getTranslate();
  return (
    <SettingsHeader title={t("feature_flags")} description={t("admin_flags_description")}>
      <FlagListingView />
    </SettingsHeader>
  );
};

export default Page;
