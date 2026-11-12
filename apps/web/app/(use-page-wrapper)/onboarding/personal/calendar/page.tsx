import { APP_NAME } from "@calcom/lib/constants";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import { PersonalCalendarView } from "~/onboarding/personal/calendar/personal-calendar-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("connect_calendar")}`,
    () => "",
    true,
    undefined,
    "/onboarding/personal/calendar"
  );
};

const ServerPage = async () => {
  const session = await requireAuthenticatedPage("/onboarding/personal/calendar");

  const userEmail = session.user.email || "";

  return <PersonalCalendarView userEmail={userEmail} />;
};

export default ServerPage;
