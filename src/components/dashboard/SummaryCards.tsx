import { SummaryCard, type SummaryCardProps } from "@/components/dashboard/SummaryCard";

type SummaryCardsProps = {
  cards: SummaryCardProps[];
};

/** Two or four cards wrap 2-up (four go 4-up on wide screens); three sit in one row, so none is
 *  left alone on a line. */
export function SummaryCards({ cards }: SummaryCardsProps) {
  const cols = cards.length === 3 ? "grid-cols-3" : cards.length === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2";
  return (
    <div className={`grid gap-2 sm:gap-3 ${cols}`}>
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
