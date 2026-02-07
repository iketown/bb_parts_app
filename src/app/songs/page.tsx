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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {songs.map((song) => (
            <Link
              key={song.id}
              href={`/songs/${song.slug}`}
              className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold">{song.title}</h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
