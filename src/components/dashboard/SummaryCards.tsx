import { SummaryCard, type SummaryCardProps } from "@/components/dashboard/SummaryCard";

type SummaryCardsProps = {
  cards: SummaryCardProps[];
};

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
