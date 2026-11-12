import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { requireAdminPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";
import AdminAppsList from "~/apps/components/AdminAppsList";

export const generateMetadata = async ({ params }: { params: Promise<{ category: string }> }) => {
  const { category } = await params;
  return await _generateMetadata(
    (t) => t("apps"),
    (t) => t("admin_apps_description"),
    undefined,
    undefined,
    `/settings/admin/apps/${category}`
  );
};

const Page = async ({ params }: { params: Promise<{ category: string }> }) => {
  const { category } = await params;
  await requireAdminPage(`/settings/admin/apps/${encodeURIComponent(category)}`);
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("apps")} description={t("admin_apps_description")}>
      <div className="flex">
        <AdminAppsList
          baseURL="/settings/admin/apps"
          classNames={{
            appCategoryNavigationRoot: "overflow-x-scroll",
          }}
        />
      </div>
    </SettingsHeader>
  );
};

export default Page;
