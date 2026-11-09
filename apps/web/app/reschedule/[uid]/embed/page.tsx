import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/reschedule/[uid]/getServerSideProps";
import { createLocalPath, requireAuthenticatedPage, requireBookingAccess } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import { cookies, headers } from "next/headers";

const getEmbedData = withEmbedSsrAppDir(getServerSideProps);

const Page = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/reschedule/${encodeURIComponent(`${resolvedParams.uid}`)}/embed`, resolvedSearchParams)
  );
  await requireBookingAccess(`${resolvedParams.uid}`, session.user);
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), resolvedParams, resolvedSearchParams);
  await getEmbedData(legacyCtx);

  return null;
};

export default Page;
