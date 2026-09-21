import {
  computeTagTrend,
  getAllTags,
  getTagExpenses,
  getTagSpendTotals,
  resolveActiveTag,
} from "@/lib/data";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TagSelector } from "@/components/insights/TagSelector";
import { TagTrendChart } from "@/components/insights/TagTrendChart";
import { formatCurrency } from "@/lib/format";

export default async function InsightsPage(props: PageProps<"/insights">) {
  const searchParams = await props.searchParams;
  const requestedTag = searchParams.tag;
  const requestedTagId = Array.isArray(requestedTag) ? requestedTag[0] : requestedTag;

  const [tags, totals] = await Promise.all([getAllTags(), getTagSpendTotals()]);
  const activeTag = resolveActiveTag(tags, requestedTagId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Spend by tag, across every cycle and trip — independent of category.
        </p>
      </div>

      {tags.length === 0 || !activeTag ? (
        <EmptyState variant="no-periods" />
      ) : (
        <>
          <TagSelector tags={tags} activeTagId={activeTag.id} />

          {(() => {
            const total = totals.find((t) => t.id === activeTag.id);
            return (
              <SummaryCards
                cards={[
                  { label: "Total spent", value: formatCurrency(total?.totalSpent ?? 0) },
                  { label: "Expenses", value: `${total?.expenseCount ?? 0}` },
                ]}
              />
            );
          })()}

          <TagTrendPanel tagId={activeTag.id} />
        </>
      )}
    </div>
  );
}

async function TagTrendPanel({ tagId }: { tagId: string }) {
  const expenses = await getTagExpenses(tagId);
  const trend = computeTagTrend(expenses, "month");

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-foreground">Trend over time</h3>
      <TagTrendChart trend={trend} />
    </div>
  );
}
