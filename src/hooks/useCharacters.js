import { useState, useEffect } from 'react';

// Hardcoded popular character IDs — avoids search API rate limits
const CHARACTER_IDS = [
  40, 62, 417, 1, 11275, 69408,
  71, 11, 16498, 188, 72, 94,
  118737, 67067, 132878, 13701,
  36828, 52, 8, 17
];

// Deterministic stat generation per character ID
// so stats are always consistent for the same character
const generateStats = (seed) => {
  const s = (offset) => {
    const x = Math.sin(seed * offset) * 10000;
    return Math.floor((x - Math.floor(x)) * 40 + 55); // range: 55–95
  };
  return {
    power:        s(1.1),
    speed:        s(2.3),
    defense:      s(3.7),
    intelligence: s(4.9),
    stamina:      s(5.2),
  };
};

export const useCharacters = (count = 12) => {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    // cancelled flag prevents state updates if component unmounts mid-fetch
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      // Shuffle the full list and pick `count` random IDs
      const shuffled = [...CHARACTER_IDS]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

      const results = [];

      for (const id of shuffled) {
        // Jikan free API rate limit is 3 requests/sec
        // 400ms gap between calls keeps us safely under that
        await new Promise((resolve) => setTimeout(resolve, 400));

        try {
          const res  = await fetch(`https://api.jikan.moe/v4/characters/${id}/full`);
          const data = await res.json();

          if (data?.data && !cancelled) {
            const char = data.data;
            results.push({
              mal_id:          char.mal_id,
              name:            char.name,
              anime:           char.anime?.[0]?.anime?.title ?? 'Unknown',
              image:           char.images?.jpg?.image_url ?? '',
              stats:           generateStats(char.mal_id),
              hp:              1000,
              powerMultiplier: 1,
            });
          }
        } catch {
          // Silently skip any character that fails to fetch
          // The rest of the roster still loads fine
        }
      }

      if (!cancelled) {
        // Remove any duplicates by mal_id using a Map
        // Map can only hold one entry per key so duplicates are dropped automatically
        const unique = [...new Map(results.map((c) => [c.mal_id, c])).values()];

        setCharacters(unique);
        setLoading(false);
      }
    };

    fetchAll();

    // Cleanup — if the component that called this hook unmounts
    // before fetching finishes, we stop any pending state updates
    return () => {
      cancelled = true;
    };
  }, [count]);

  return { characters, loading, error };
};