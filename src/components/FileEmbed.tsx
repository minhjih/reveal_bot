"use client";

/**
 * Renders an embedded image with optional description.
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

/** Returns true if URL points to an image */
function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(url);
}

/** Returns true if URL points to a PDF */
function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

/** Get file extension from URL */
function getFileExt(url: string): string {
  try {
    const match = new URL(url).pathname.match(/\.(\w+)$/);
    return match ? match[1].toUpperCase() : "FILE";
  } catch {
    return "FILE";
  }
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

/** Icon + color config per file type */
function getFileStyle(url: string): { color: string; bg: string; border: string; icon: React.ReactNode } {
  const ext = getFileExt(url);

  if (isPdfUrl(url)) {
    return {
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <text x="7" y="18" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">PDF</text>
        </svg>
      ),
    };
  }

  if (["CSV", "JSON", "TXT", "MD"].includes(ext)) {
    return {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    };
  }

  return {
    color: "text-cyan",
    bg: "bg-cyan/10",
    border: "border-cyan/20",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  };
}

/**
 * Notion-style file embed card.
 * Shows file icon, name, description, extension badge, and download button.
 */
function FileCard({
  url,
  description,
}: {
  url: string;
  description?: string;
}) {
  const name = getFileName(url);
  const ext = getFileExt(url);
  const style = getFileStyle(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${style.border} bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 group`}
    >
      {/* File icon */}
      <div className={`shrink-0 w-10 h-10 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center`}>
        {style.icon}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-foreground/80 truncate group-hover:${style.color} transition-colors`}>
          {name}
        </p>
        {description ? (
          <p className="text-xs text-muted/50 mt-0.5 line-clamp-1">{description}</p>
        ) : (
          <p className="text-xs text-muted/30 mt-0.5">{ext} document</p>
        )}
      </div>

      {/* Extension badge */}
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${style.bg} ${style.color} border ${style.border}`}>
        {ext}
      </span>

      {/* Download icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30 group-hover:text-muted/60 shrink-0 transition-colors">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}

/**
 * Renders a list of file attachments.
 * Images are shown inline; other files as Notion-style embedded cards.
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

        return <FileCard key={url} url={url} description={desc} />;
      })}
    </div>
  );
}
