'use client';

import { useState, useEffect } from 'react';
import { slugify } from '@/lib/utils';

interface Song {
  id: string;
  title: string;
  slug: string;
}

interface Result {
  title: string;
  status: 'created' | 'duplicate' | 'error';
  message?: string;
}

export default function BulkSongsPage() {
  const [songTitles, setSongTitles] = useState('');
  const [existingSongs, setExistingSongs] = useState<Song[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    fetchExistingSongs();
  }, []);

  const fetchExistingSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      setExistingSongs(data.songs || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setResults([]);

    // Parse input - split by newlines, trim, and filter empty lines
    const titles = songTitles
      .split('\n')
      .map((title) => title.trim())
      .filter((title) => title.length > 0);

    if (titles.length === 0) {
      setProcessing(false);
      return;
    }

    const processResults: Result[] = [];

    // Process each title
    for (const title of titles) {
      const slug = slugify(title);

      // Check if song already exists (by slug)
      const exists = existingSongs.some((song) => song.slug === slug);

      if (exists) {
        processResults.push({
          title,
          status: 'duplicate',
          message: 'Already exists',
        });
        continue;
      }

      // Create new song
      try {
        const response = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });

        if (response.ok) {
          const data = await response.json();
          processResults.push({
            title,
            status: 'created',
            message: `Created with slug: ${data.slug}`,
          });

          // Add to existing songs list to prevent duplicates in same batch
          setExistingSongs((prev) => [
            ...prev,
            { id: data.id, title, slug: data.slug },
          ]);
        } else {
          processResults.push({
            title,
            status: 'error',
            message: 'Failed to create',
          });
        }
      } catch (error) {
        processResults.push({
          title,
          status: 'error',
          message: 'Network error',
        });
      }
    }

    setResults(processResults);
    setProcessing(false);
    setSongTitles(''); // Clear the textarea after processing
  };

  const createdCount = results.filter((r) => r.status === 'created').length;
  const duplicateCount = results.filter((r) => r.status === 'duplicate').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Create Songs</h1>
        <p className="text-gray-600 mt-2">
          Enter song titles below, one per line. Duplicates will be skipped automatically.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Song Titles (one per line)
            </label>
            <textarea
              value={songTitles}
              onChange={(e) => setSongTitles(e.target.value)}
              placeholder={'Good Vibrations\nGod Only Knows\nWouldn\'t It Be Nice\nHelp Me Rhonda'}
              className="w-full h-64 px-3 py-2 border rounded font-mono text-sm"
              disabled={processing}
            />
            <p className="text-sm text-gray-500 mt-1">
              {songTitles.split('\n').filter((t) => t.trim().length > 0).length} titles entered
            </p>
          </div>

          <button
            type="submit"
            disabled={processing || songTitles.trim().length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {processing ? 'Processing...' : 'Create Songs'}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-bold mb-4">Results</h2>

          <div className="flex gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Created: {createdCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Duplicates: {duplicateCount}</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Errors: {errorCount}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.status === 'created'
                    ? 'bg-green-50 border-green-500'
                    : result.status === 'duplicate'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{result.title}</p>
                    {result.message && (
                      <p className="text-sm text-gray-600">{result.message}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      result.status === 'created'
                        ? 'bg-green-200 text-green-800'
                        : result.status === 'duplicate'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingSongs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">
            Existing Songs ({existingSongs.length})
          </h3>
          <div className="text-sm text-gray-600 max-h-48 overflow-y-auto">
            <ul className="list-disc list-inside space-y-1">
              {existingSongs.map((song) => (
                <li key={song.id}>{song.title}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
