"use client";

import { X, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function GifModal({ open, onClose, title, gifUrl, sourceUrl, imageUrls }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload all images when modal opens
  useEffect(() => {
    if (!open || !imageUrls || imageUrls.length <= 1) {
      setImagesLoaded(false);
      return;
    }
    
    let loadedCount = 0;
    const totalImages = imageUrls.length;
    
    imageUrls.forEach((url) => {
      const img = new window.Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
          setLoading(false);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setError(true);
          setLoading(false);
        }
      };
      img.src = url;
    });
  }, [open, imageUrls]);

  // Auto-cycle through images to create GIF effect (faster for smoother animation)
  useEffect(() => {
    if (!open || !imageUrls || imageUrls.length <= 1 || !imagesLoaded || error) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
    }, 600); // Change image every 600ms for smoother animation

    return () => clearInterval(interval);
  }, [open, imageUrls, imagesLoaded, error]);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setError(false);
      setCurrentImageIndex(0);
      setImagesLoaded(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Guía</p>
            <p className="text-lg font-semibold text-white leading-tight">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative aspect-[3/4] bg-zinc-900">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-zinc-400 px-6">
              <p className="font-semibold">No se pudo cargar el GIF</p>
              <p className="text-sm text-zinc-500">Revisa tu conexión o abre el enlace externo.</p>
              {sourceUrl && (
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700"
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en ejercicio-db <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          {!error && imageUrls && imageUrls.length > 1 ? (
            // Multiple images - create animated slideshow
            <>
              {imageUrls.map((url, index) => (
                <Image
                  key={url}
                  src={url}
                  alt={`${title} - posición ${index + 1}`}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-200",
                    currentImageIndex === index && imagesLoaded ? "opacity-100" : "opacity-0"
                  )}
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority={index === 0}
                />
              ))}
            </>
          ) : (
            // Single image
            <Image
              src={gifUrl}
              alt={title}
              fill
              className={cn("object-contain transition-opacity", loading ? "opacity-0" : "opacity-100")}
              onLoad={() => setLoading(false)}
              onError={() => setError(true)}
              sizes="(max-width: 768px) 100vw, 400px"
              priority
            />
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" />
            <span>Forma y respiración</span>
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
            >
              Abrir <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function GifChip({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400" /> Ver técnica
    </button>
  );
}

export default GifModal;
