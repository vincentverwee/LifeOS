import { Shirt } from "lucide-react";

/** A clothing photo filling its (square) box, or a shirt outline when there is none. */
export function ItemPhoto({
  photoId,
  name,
  className = "",
  eager = false,
  cutout = false,
}: {
  photoId: string | null;
  name: string;
  className?: string;
  /** The big photo at the top of a page: load it straight away. */
  eager?: boolean;
  /** Background removed: shown whole and centred on a soft white glare, not cropped to fill. */
  cutout?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-surface-muted ${className}`}>
      {photoId ? (
        // Our own route behind the passcode; next/image would proxy it through the optimizer for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/wardrobe/photo/${photoId}`} alt={name} loading={eager ? "eager" : "lazy"} className={`h-full w-full ${cutout ? "cutout-glare object-contain p-[8%]" : "object-cover"}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-muted">
          <Shirt className="h-1/2 w-1/2 max-h-12 max-w-12" strokeWidth={1.4} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** Up to four item photos in a 2×2 grid: how an outfit looks (it has no photo of its own). */
export function OutfitCollage({
  items,
  className = "",
}: {
  items: { id: string; name: string; photoId: string | null; photoCutout?: boolean }[];
  className?: string;
}) {
  const shown = items.slice(0, 4);
  if (shown.length === 0) return <ItemPhoto photoId={null} name="No pieces" className={className} />;
  if (shown.length === 1)
    return <ItemPhoto photoId={shown[0].photoId} cutout={shown[0].photoCutout} name={shown[0].name} className={className} />;
  return (
    // Two pieces side by side, three or four in a 2×2; the cells fill whatever box `className` gives.
    <div className={`grid grid-cols-2 gap-0.5 overflow-hidden bg-border ${shown.length > 2 ? "grid-rows-2" : "grid-rows-1"} ${className}`}>
      {shown.map((item) => (
        <ItemPhoto key={item.id} photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="h-full min-h-0 w-full" />
      ))}
      {shown.length === 3 && <div className="bg-surface-muted" />}
    </div>
  );
}
