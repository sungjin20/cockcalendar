"use client";

import { useEffect, useState } from "react";

export default function PosterLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <>
    <button type="button" className="detail-poster-button" aria-label="포스터 확대 보기" onClick={() => setOpen(true)}>
      <img className="detail-poster" src={src} alt={alt} />
      <span className="detail-poster-zoom">확대</span>
    </button>
    {open && <div className="poster-lightbox" role="dialog" aria-modal="true" aria-label="확대된 포스터" onClick={() => setOpen(false)}>
      <button type="button" className="poster-lightbox-close" aria-label="포스터 확대 닫기" onClick={() => setOpen(false)}>×</button>
      <img src={src} alt={alt} onClick={event => event.stopPropagation()} />
    </div>}
  </>;
}
