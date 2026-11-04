import { Sticker } from 'lucide-react';
import { stickerSrc } from '@/lib/waypoint/stickers';

/**
 * A sticker photo filling its box: a cut-out is drawn whole on the app's colour with the
 * soft spotlight (like Wardrobe cut-outs), a normal photo is cropped to fill. No photo = an outline.
 */
export function StickerImage({
  photoId,
  name,
  cutout = false,
  className = '',
}: {
  photoId: string | null;
  name: string;
  cutout?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden bg-surface-muted ${className}`}>
      {photoId ? (
        // Our own route behind the passcode; next/image would proxy it through the optimizer for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stickerSrc(photoId)}
          alt={name}
          loading="lazy"
          className={`h-full w-full ${cutout ? 'cutout-glare object-contain p-[6%]' : 'object-cover'}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-ink-muted">
          <Sticker className="h-1/2 max-h-12 w-1/2 max-w-12" strokeWidth={1.4} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
