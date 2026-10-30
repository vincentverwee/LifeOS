/** A small dot in the person's group colour (see groupColor), before their name. */
export function GroupDot({ color }: { color: string }) {
  return <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}
