'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Song {
  id: string;
  title: string;
  slug: string;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      setSongs(data.songs || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const rankedSongs = songs
    .map((song, index) => {
      const normalizedTitle = song.title.toLowerCase();
      const matchIndex =
        normalizedSearch.length > 0 ? normalizedTitle.indexOf(normalizedSearch) : 0;

      return {
        song,
        index,
        isMatch: normalizedSearch.length === 0 || matchIndex !== -1,
        matchIndex,
      };
    })
    .sort((a, b) => {
      if (a.isMatch !== b.isMatch) {
        return a.isMatch ? -1 : 1;
      }

      if (a.isMatch && b.isMatch && a.matchIndex !== b.matchIndex) {
        return a.matchIndex - b.matchIndex;
      }

      return a.index - b.index;
    });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Songs</h1>

      {songs.length === 0 ? (
        <p className="text-gray-600">No songs available yet.</p>
      ) : (
        <>
          <div className="mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs..."
              className="w-full rounded-lg border px-4 py-3"
              aria-label="Search songs"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rankedSongs.map(({ song, isMatch }) => (
              <Link
                key={song.id}
                href={`/songs/${song.slug}`}
                className={`block rounded-lg border bg-white p-6 transition-all hover:shadow-lg ${
                  search && !isMatch ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <h2 className="text-xl font-semibold">{song.title}</h2>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
