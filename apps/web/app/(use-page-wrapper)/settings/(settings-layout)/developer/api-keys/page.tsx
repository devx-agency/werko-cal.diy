import { PrismaApiKeyRepository } from "@calcom/features/api-keys-legacy/api-keys/repositories/PrismaApiKeyRepository";
import { APP_NAME } from "@calcom/lib/constants";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import ApiKeysView from "~/settings/developer/api-keys-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("api_keys"),
    (t) => t("create_first_api_key_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/api-keys"
  );

const getCachedApiKeys = unstable_cache(
  async (userId: number) => {
    const apiKeyRepository = await PrismaApiKeyRepository.withGlobalPrisma();
    return await apiKeyRepository.findApiKeysFromUserId({ userId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.apiKeys.list"] } // Cache for 1 hour
);

const Page = async () => {
  const session = await requireAuthenticatedPage("/settings/developer/api-keys");
  const userId = session.user.id;
  const apiKeys = await getCachedApiKeys(userId);

  return <ApiKeysView apiKeys={apiKeys} />;
};

export default Page;
