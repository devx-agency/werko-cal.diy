import { getAppRegistry, getAppRegistryWithCredentials } from "@calcom/app-store/_appRegistry";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import type { AppCategories } from "@calcom/prisma/enums";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import AppsPage from "~/apps/apps-view";

export const generateMetadata = async () => {
  await requireAuthenticatedPage("/apps");
  return await _generateMetadata(
    (t) => t("app_store"),
    (t) => t("app_store_description"),
    undefined,
    undefined,
    "/apps"
  );
};

const ServerPage = async () => {
  const session = await requireAuthenticatedPage("/apps");
  const userRepo = new UserRepository(prisma);
  const userAdminTeams = await userRepo.getUserAdminTeams({ userId: session.user.id });
  const userAdminTeamsIds = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
  const appStore = await getAppRegistryWithCredentials(session.user.id, userAdminTeamsIds);

  const categoryQuery = appStore.map(({ categories }) => ({
    categories: categories || [],
  }));
  const categories = categoryQuery.reduce(
    (c, app) => {
      for (const category of app.categories) {
        c[category] = c[category] ? c[category] + 1 : 1;
      }
      return c;
    },
    {} as Record<string, number>
  );

  const props = {
    categories: Object.entries(categories)
      .map(([name, count]): { name: AppCategories; count: number } => ({
        name: name as AppCategories,
        count,
      }))
      .sort((a, b) => b.count - a.count),
    appStore,
    userAdminTeams: userAdminTeamsIds,
  };

  return <AppsPage {...props} isAdmin={session.user.role === "ADMIN"} />;
};

export default ServerPage;
