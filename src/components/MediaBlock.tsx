import { useState } from 'react';
import { ImageOff, Play } from 'lucide-react';

export function MediaBlock({
  url,
  type,
  alt,
  className = '',
  controls = true,
}: {
  url: string | null;
  type: 'image' | 'video' | null;
  alt: string;
  className?: string;
  controls?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!url) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-500 ${className}`}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`relative bg-black ${className}`}>
        <video
          src={url}
          controls={controls}
          playsInline
          muted
          loop
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
        {failed && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-900/90 p-4 text-center text-xs font-medium text-zinc-300">
            <span>
              <Play className="mx-auto mb-2 h-6 w-6" />
              영상을 재생할 수 없어요. 업로드한 영상은 정상적으로 재생됩니다.
            </span>
          </div>
        )}
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 dark:from-brand-900/60 dark:to-zinc-900 dark:text-brand-200 ${className}`}
      >
        <span className="px-4 text-center text-xs font-semibold">
          <ImageOff className="mx-auto mb-2 h-6 w-6" />
          이미지를 불러오지 못했어요
        </span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
