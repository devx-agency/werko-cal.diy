import { WebhookRepository } from "@calcom/features/webhooks/lib/repository/WebhookRepository";
import { APP_NAME } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { createLocalPath, requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EditWebhookView } from "~/webhooks/views/webhook-edit-view";

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await requireAuthenticatedPage(`/settings/developer/webhooks/${encodeURIComponent(id)}`);
  return await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    `/settings/developer/webhooks/${id}`
  );
};

const Page = async ({ params: _params }: PageProps) => {
  const params = await _params;
  const id = typeof params?.id === "string" ? params.id : undefined;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/settings/developer/webhooks/${encodeURIComponent(id ?? "")}`)
  );

  const webhookRepository = WebhookRepository.getInstance();
  const webhook = await webhookRepository.findByWebhookId(id);

  // Ownership check: verify user has access to this webhook
  if (webhook.teamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.user.id,
        teamId: webhook.teamId,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER] },
      },
      select: { id: true },
    });
    if (!membership) {
      notFound();
    }
  } else if (webhook.userId !== session.user.id) {
    notFound();
  }

  return <EditWebhookView webhook={webhook} />;
};

export default Page;
