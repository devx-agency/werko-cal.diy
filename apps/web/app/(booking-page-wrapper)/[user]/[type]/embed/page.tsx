import { loadTranslations } from "@calcom/i18n/server";
import { buildLegacyCtx, buildLegacyCtxFromNextRequest, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";
import {
  createLocalPath,
  requireAuthenticatedPage,
  requireBookingQueryAccess,
} from "app/_lib/pageAuthorization";
import type { PageProps as ServerPageProps } from "app/_types";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import TypePage, { type PageProps as ClientPageProps } from "~/users/views/users-type-public-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData = withEmbedSsrAppDir<ClientPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const decodedParams = decodeParams(resolvedParams);
  const session = await requireAuthenticatedPage(
    createLocalPath(
      `/${encodeURIComponent(`${decodedParams.user}`)}/${encodeURIComponent(`${decodedParams.type}`)}/embed`,
      resolvedSearchParams
    )
  );
  await requireBookingQueryAccess(resolvedSearchParams, session.user);
  const context = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);
  const props = await getData(context);

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <TypePage {...props} />
      </CustomI18nProvider>
    );
  }

  return <TypePage {...props} />;
};

export default ServerPage;
