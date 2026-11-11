import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";
import { createLocalPath, requireAuthenticatedPage, requireBookingAccess } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";

const getData = withAppDirSsr(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/reschedule/${encodeURIComponent(`${resolvedParams.uid}`)}`, resolvedSearchParams)
  );
  await requireBookingAccess(`${resolvedParams.uid}`, session.user);
  const legacyCtx = await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams);

  await getData(legacyCtx);

  return null;
};

export default Page;
