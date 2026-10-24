import { SummaryCard, type SummaryCardProps } from "@/components/dashboard/SummaryCard";

type SummaryCardsProps = {
  cards: SummaryCardProps[];
};

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
