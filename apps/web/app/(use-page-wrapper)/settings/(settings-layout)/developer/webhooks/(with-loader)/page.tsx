import { APP_NAME } from "@calcom/lib/constants";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/_router";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import WebhooksView from "~/webhooks/views/webhooks-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("webhooks"),
    (t) => t("add_webhook_description", { appName: APP_NAME }),
    undefined,
    undefined,
    "/settings/developer/webhooks"
  );

const WebhooksViewServerWrapper = async () => {
  await requireAuthenticatedPage("/settings/developer/webhooks");
  const caller = await createRouterCaller(webhookRouter);
  const data = await caller.getByViewer();

  return <WebhooksView data={data} />;
};

export default WebhooksViewServerWrapper;
