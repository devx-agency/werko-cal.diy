import type { TFunction } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { BaseScheduledEmail } from "./BaseScheduledEmail";

const BrokenCalendarIntegration = (props: {
  calendar: string;
  eventTypeId?: number | null;
  t: TFunction;
}) => {
  const { t } = props;

  return (
    <div>
      {t("broken_calendar_action", {
        calendar: props.calendar,
        calendarSettingsLink: `${WEBAPP_URL}/apps/installed`,
        interpolation: { escapeValue: false },
      })}
    </div>
  );
};

export const BrokenIntegrationEmail = (
  props: {
    calEvent: CalendarEvent;
    attendee: Person;
    type: "video" | "calendar";
  } & Partial<React.ComponentProps<typeof BaseScheduledEmail>>
) => {
  const { calEvent, type } = props;
  const t = calEvent.organizer.language.translate;
  const locale = calEvent.organizer.language.locale;
  const timeFormat = calEvent.organizer?.timeFormat;

  if (type === "video") {
    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        timeFormat={timeFormat}
        locale={locale}
        {...props}
      />
    );
  }

  if (type === "calendar") {
    // The calendar name is stored as name_calendar
    const [mainHostDestinationCalendar] = calEvent.destinationCalendar ?? [];
    let calendar = mainHostDestinationCalendar
      ? mainHostDestinationCalendar?.integration.split("_")
      : "calendar";

    if (Array.isArray(calendar)) {
      const calendarCap = calendar.map((name) => name.charAt(0).toUpperCase() + name.slice(1));
      calendar = `${calendarCap[0]} ${calendarCap[1]}`;
    }

    return (
      <BaseScheduledEmail
        timeZone={calEvent.organizer.timeZone}
        t={t}
        timeFormat={timeFormat}
        locale={locale}
        subject={t("broken_integration")}
        title={t("problem_updating_calendar")}
        subtitle={<BrokenCalendarIntegration calendar={calendar} eventTypeId={calEvent.eventTypeId} t={t} />}
        headerType="xCircle"
        {...props}
      />
    );
  }

  return (
    <BaseScheduledEmail
      timeZone={calEvent.organizer.timeZone}
      t={t}
      timeFormat={timeFormat}
      locale={locale}
      subject={t("broken_integration")}
      title={t("problem_updating_calendar")}
      headerType="xCircle"
      {...props}
    />
  );
};
