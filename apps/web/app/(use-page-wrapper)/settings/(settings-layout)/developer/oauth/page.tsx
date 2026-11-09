import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata, getTranslate } from "app/_utils";
import OAuthClientsView from "~/settings/developer/oauth-clients-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("oauth_clients"),
    (t) => t("oauth_clients_description"),
    undefined,
    undefined,
    "/settings/developer/oauth"
  );

const Page = async () => {
  await requireAuthenticatedPage("/settings/developer/oauth");
  const t = await getTranslate();

  return <OAuthClientsView />;
};

export default Page;
