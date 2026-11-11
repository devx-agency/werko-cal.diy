import { APP_NAME } from "@calcom/lib/constants";
import { buildLegacyCtxFromNextRequest } from "@lib/buildLegacyCtx";
import { createLocalPath, requireAuthenticatedPage, requireBookingAccess } from "app/_lib/pageAuthorization";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import PaymentPage from "./PaymentPage";

type PaymentPageProps = {
  payment: {
    id: number;
    success: boolean;
    refunded: boolean;
    amount: number;
    currency: string;
    paymentOption: string | null;
    data: Record<string, unknown>;
    appId?: string | null;
  };
  clientSecret?: string | null;
  booking: {
    id: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    paid: boolean;
    description?: string | null;
    location?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    length: number;
    price: number;
    currency: string;
    metadata: Record<string, unknown> | null;
    successRedirectUrl?: string | null;
    forwardParamsSuccessRedirect?: boolean | null;
    recurringEvent?: unknown;
  };
  profile: { theme?: string | null; hideBranding?: boolean };
  user?: { name?: string | null; username?: string | null } | null;
};

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/payment/${encodeURIComponent(`${resolvedParams.uid}`)}`, resolvedSearchParams)
  );
  await requireBookingAccess(`${resolvedParams.uid}`, session.user);
  const props = await getData(
    await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams)
  );
  const eventName = props.booking.title;
  return await _generateMetadata(
    (t) => `${t("payment")} | ${eventName} | ${APP_NAME}`,
    () => "",
    undefined,
    undefined,
    `/payment/${resolvedParams.uid}`
  );
};

const getData = withAppDirSsr<PaymentPageProps>(async () => ({
  props: {
    payment: {
      id: 0,
      success: false,
      refunded: false,
      amount: 0,
      currency: "usd",
      paymentOption: null,
      data: {},
      appId: null,
    },
    booking: {
      id: 0,
      uid: "",
      title: "",
      startTime: "",
      endTime: "",
      status: "",
      paid: false,
      location: null,
    },
    eventType: { id: 0, title: "", length: 0, price: 0, currency: "usd", metadata: null },
    profile: { theme: null, hideBranding: false },
  },
}));

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const session = await requireAuthenticatedPage(
    createLocalPath(`/payment/${encodeURIComponent(`${resolvedParams.uid}`)}`, resolvedSearchParams)
  );
  await requireBookingAccess(`${resolvedParams.uid}`, session.user);
  const props = await getData(
    await buildLegacyCtxFromNextRequest(resolvedParams, resolvedSearchParams)
  );

  return <PaymentPage {...props} />;
};
export default ServerPage;
