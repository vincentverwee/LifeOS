import { getPartnerStudy } from "@/lib/data/partner";
import { PartnerStudyingBadge } from "@/components/lessons/PartnerStudyingBadge";

/** The other site's running study timer, if any. Wrap in <Suspense fallback={null}>. */
export async function PartnerStudying() {
  const study = await getPartnerStudy();
  return study ? <PartnerStudyingBadge study={study} /> : null;
}
