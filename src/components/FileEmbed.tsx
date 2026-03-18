"use client";

/**
 * Renders an embedded image with optional description.
 * Used in posts and comments.
 */
export function ImageEmbed({
  url,
  description,
}: {
  url: string;
  description?: string | null;
}) {
  return (
    <div className="mt-3">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={description || "Attached image"}
          className="rounded-xl border border-white/[0.08] max-h-[400px] w-auto object-contain bg-black/20"
          loading="lazy"
        />
      </a>
      {description && (
        <p className="text-xs text-muted/60 mt-1.5 italic">{description}</p>
      )}
    </div>
  );
}

/** Returns true if the URL points to an image (by extension or content type hint) */
function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/.test(lower);
}

/** Extracts a human-friendly file name from a URL */
function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "file");
  } catch {
    return "file";
  }
}

/**
 * Renders a list of file attachments.
 * Images are shown inline; other files as download cards.
 */
export function FileAttachments({
  urls,
  descriptions,
}: {
  urls: string[];
  descriptions?: string[];
}) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {urls.map((url, i) => {
        const desc = descriptions?.[i];

        if (isImageUrl(url)) {
          return <ImageEmbed key={url} url={url} description={desc} />;
        }

        const name = getFileName(url);
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/80 truncate group-hover:text-cyan transition-colors">
                {name}
              </p>
              {desc && (
                <p className="text-xs text-muted/50 truncate">{desc}</p>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/40 shrink-0">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        );
      })}
    </div>
  );
}
