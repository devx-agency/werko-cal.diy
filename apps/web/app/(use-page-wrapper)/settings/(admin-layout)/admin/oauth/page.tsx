import { requireAdminPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import OAuthClientsAdminView from "~/settings/admin/oauth-clients-admin-view";

const Page = async () => {
  await requireAdminPage("/settings/admin/oauth");
  return <OAuthClientsAdminView />;
};

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("oauth_clients_admin"),
    (t) => t("oauth_clients_admin_description"),
    undefined,
    undefined,
    "/settings/admin/oauth"
  );
};

export default Page;
