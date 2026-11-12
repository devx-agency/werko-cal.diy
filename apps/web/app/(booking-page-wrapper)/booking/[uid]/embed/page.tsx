import { loadTranslations } from "@calcom/i18n/server";
import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { createLocalPath, requireAuthenticatedPage, requireBookingAccess } from "app/_lib/pageAuthorization";
import type { PageProps as ServerPageProps } from "app/_types";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import OldPage from "~/bookings/views/bookings-single-view";
import {
  type PageProps as ClientPageProps,
  getServerSideProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

const getEmbedData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/booking/${encodeURIComponent(`${resolvedParams.uid}`)}/embed`, resolvedSearchParams)
  );
  await requireBookingAccess(`${resolvedParams.uid}`, session.user);
  const context = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);
  const props = await getEmbedData(context);

  const eventLocale = props.eventType?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <OldPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <OldPage {...props} />;
};

export default ServerPage;
