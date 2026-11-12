import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { requireAdminPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";
import UsersAddView from "~/users/views/users-add-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("add_new_user"),
    (t) => t("admin_users_add_description"),
    undefined,
    undefined,
    "/settings/admin/users/add"
  );
};

const Page = async () => {
  await requireAdminPage("/settings/admin/users/add");
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("add_new_user")} description={t("admin_users_add_description")}>
      <UsersAddView />
    </SettingsHeader>
  );
};

export default Page;
