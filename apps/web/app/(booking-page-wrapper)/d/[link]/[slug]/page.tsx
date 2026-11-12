import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { getServerSideProps, type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";
import {
  createLocalPath,
  requireAuthenticatedPage,
  requireBookingQueryAccess,
} from "app/_lib/pageAuthorization";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import Type from "~/d/[link]/d-type-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const _params = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(
      `/d/${encodeURIComponent(`${_params.link}`)}/${encodeURIComponent(`${_params.slug}`)}`,
      resolvedSearchParams
    )
  );
  await requireBookingQueryAccess(resolvedSearchParams, session.user);
  const legacyCtx = await buildLegacyCtxFromNextRequest(_params, resolvedSearchParams);
  const pageProps = await getData(legacyCtx);

  const { booking, eventData, isBrandingHidden } = pageProps;
  const rescheduleUid = booking?.uid;

  const profileName = eventData?.profile?.name ?? "";
  const title = eventData?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    undefined,
    `/d/${_params.link}/${_params.slug}`
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(
      `/d/${encodeURIComponent(`${resolvedParams.link}`)}/${encodeURIComponent(`${resolvedParams.slug}`)}`,
      resolvedSearchParams
    )
  );
  await requireBookingQueryAccess(resolvedSearchParams, session.user);
  const legacyCtx = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);
  const pageProps = await getData(legacyCtx);

  return <Type {...pageProps} />;
};

export default ServerPage;
