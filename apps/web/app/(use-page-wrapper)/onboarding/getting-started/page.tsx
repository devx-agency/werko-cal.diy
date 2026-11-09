import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { APP_NAME } from "@calcom/lib/constants";
import { requireAuthenticatedPage } from "app/_lib/pageAuthorization";
import { _generateMetadata } from "app/_utils";
import { redirect } from "next/navigation";
import { OnboardingView } from "~/onboarding/getting-started/onboarding-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${APP_NAME} - ${t("getting_started")}`,
    () => "",
    true,
    undefined,
    "/onboarding/getting-started"
  );
};

const ServerPage = async () => {
  const session = await requireAuthenticatedPage("/onboarding/getting-started");

  // If user has any team membership (pending or accepted), redirect them directly to personal onboarding
  // This handles the case where users sign up with an invite token (membership is auto-accepted)
  const hasTeamMembership = await MembershipRepository.hasAnyTeamMembershipByUserId({
    userId: session.user.id,
  });
  if (hasTeamMembership) {
    return redirect("/onboarding/personal/settings");
  }

  const userEmail = session.user.email || "";

  return <OnboardingView userEmail={userEmail} />;
};

export default ServerPage;
