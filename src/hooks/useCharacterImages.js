import { useState, useEffect } from 'react';

export const useCharacterImages = (characters) => {
  const [images, setImages] = useState({});
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    if (!characters || characters.length === 0) return;

    let cancelled = false;

    const fetchImages = async () => {
      const result = {};

      for (const char of characters) {
        if (cancelled) break;
        try {
          await new Promise((r) => setTimeout(r, 400));

          // Search by name — guaranteed correct character regardless of ID
          const res  = await fetch(
            `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(char.name)}&limit=1`
          );
          const data = await res.json();

          const found = data?.data?.[0];
          if (found && !cancelled) {
            // Store image keyed by our mal_id so the rest of the code stays the same
            result[char.mal_id] = found.images?.jpg?.image_url || found.images?.webp?.image_url;
          }
        } catch {
          // silently skip — robot fallback handles it
        }
      }

      if (!cancelled) {
        setImages(result);
        setReady(true);
      }
    };

    fetchImages();
    return () => { cancelled = true; };
  }, []);

  return { images, ready };
};