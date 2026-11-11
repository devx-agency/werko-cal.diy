import { loadTranslations } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildLegacyCtx, buildLegacyCtxFromNextRequest, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";
import {
  createLocalPath,
  requireAuthenticatedPage,
  requireBookingQueryAccess,
} from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import type React from "react";
import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const decodedParams = decodeParams(resolvedParams);
  const callbackPath = createLocalPath(
    `/${encodeURIComponent(`${decodedParams.user}`)}/${encodeURIComponent(`${decodedParams.type}`)}`,
    resolvedSearchParams
  );
  const session = await requireAuthenticatedPage(callbackPath);
  await requireBookingQueryAccess(resolvedSearchParams, session.user);

  const legacyCtx = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);
  const props = await getData(legacyCtx);

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <LegacyPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const decodedParams = decodeParams(resolvedParams);
  const session = await requireAuthenticatedPage(
    createLocalPath(
      `/${encodeURIComponent(`${decodedParams.user}`)}/${encodeURIComponent(`${decodedParams.type}`)}`,
      resolvedSearchParams
    )
  );
  await requireBookingQueryAccess(resolvedSearchParams, session.user);
  const legacyCtx = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);
  const props = await getData(legacyCtx);

  const { booking, isSEOIndexable = true, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;
  const profileName = eventData?.profile?.name ?? "";
  const title = eventData?.title ?? "";
  const meeting = {
    title,
    profile: { name: profileName, image: eventData?.profile.image },
    users:
      eventData?.subsetOfUsers.map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })) || [],
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    WEBAPP_URL,
    `/${decodedParams.user}/${decodedParams.type}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
    },
  };
};

export default ServerPage;
