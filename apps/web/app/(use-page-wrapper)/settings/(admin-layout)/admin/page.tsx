import { requireAdminPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("admin"),
    () => "",
    undefined,
    undefined,
    "/settings/admin"
  );
};

const Page = async () => {
  await requireAdminPage("/settings/admin");
  return <h1>Admin index</h1>;
};
export default Page;
