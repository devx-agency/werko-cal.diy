import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import PushNotificationsView from "~/settings/my-account/push-notifications-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("push_notifications"),
    (t) => t("push_notifications_description"),
    undefined,
    undefined,
    "/settings/my-account/push-notifications"
  );

const Page = async () => {
  await requireAuthenticatedPage("/settings/my-account/push-notifications");
  return <PushNotificationsView />;
};

export default Page;
