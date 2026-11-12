import { _generateMetadata } from "app/_utils";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";

import LegacyPage from "~/upgrade/upgrade-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("upgrade"),
    () => "",
    undefined,
    undefined,
    "/upgrade"
  );

const ServerPage = async () => {
  await requireAuthenticatedPage("/upgrade");

  return <LegacyPage />;
};

export default ServerPage;
