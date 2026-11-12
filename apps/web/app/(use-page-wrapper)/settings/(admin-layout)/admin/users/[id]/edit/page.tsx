import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { requireAdminPage } from "app/_lib/pageAuthorization";
import type { Params } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { z } from "zod";
import { UsersEditView } from "~/users/views/users-edit-view";

const userIdSchema = z.object({ id: z.coerce.number() });

export const generateMetadata = async ({ params }: { params: Params }) => {
  return await _generateMetadata(
    (t) => t("editing_user"),
    (t) => t("admin_users_edit_description"),
    undefined,
    undefined,
    "/settings/admin/users/edit"
  );
};

const Page = async ({ params }: { params: Params }) => {
  const resolvedParams = await params;
  await requireAdminPage(`/settings/admin/users/${encodeURIComponent(`${resolvedParams.id}`)}/edit`);
  const input = userIdSchema.safeParse(resolvedParams);

  if (!input.success) throw new Error("Invalid access");

  const userRepo = new UserRepository(prisma);
  const user = await userRepo.adminFindById(input.data.id);

  const t = await getTranslate();

  return (
    <SettingsHeader title={t("editing_user")} description={t("admin_users_edit_description")}>
      <UsersEditView user={user} />
    </SettingsHeader>
  );
};

export default Page;
