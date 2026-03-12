'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MemberBadge from '@/components/MemberBadge';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  abbreviation: string;
  color: string;
  slug: string;
}

interface Song {
  id: string;
  title: string;
  slug: string;
}

interface Part {
  id: string;
  songId: string;
  assetIds: string[];
  textNotes: string;
}

interface Asset {
  id: string;
  fileType: 'mp3' | 'pdf';
}

export default function MemberDetailPage() {
  const params = useParams();
  const memberSlug = params.memberSlug as string;

  const [member, setMember] = useState<Member | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [memberSlug]);

  const fetchData = async () => {
    try {
      // Fetch members to find the current one
      const membersRes = await fetch('/api/members');
      const membersData = await membersRes.json();
      const currentMember = membersData.members?.find((m: Member) => m.slug === memberSlug);

      if (!currentMember) {
        setLoading(false);
        return;
      }

      setMember(currentMember);

      // Fetch parts for this member and all songs
      const [partsRes, songsRes] = await Promise.all([
        fetch(`/api/parts?memberId=${currentMember.id}`),
        fetch('/api/songs'),
      ]);
      const partsData = await partsRes.json();
      const songsData = await songsRes.json();
      const memberParts: Part[] = partsData.parts || [];

      // Get unique song IDs
      const songIds = [...new Set(memberParts.map((p) => p.songId))];

      // Filter to songs that have parts for this member
      const songsWithParts = songsData.songs?.filter((s: Song) =>
        songIds.includes(s.id)
      ) || [];

      // Fetch assets for all relevant songs in parallel
      const assetResponses = await Promise.all(
        songIds.map((songId) => fetch(`/api/assets?songId=${songId}`))
      );
      const allAssets: Asset[] = [];
      for (const res of assetResponses) {
        const data = await res.json();
        allAssets.push(...(data.assets || []));
      }

      setParts(memberParts);
      setAssets(allAssets);
      setSongs(songsWithParts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssetSummary = (songId: string): string => {
    // Get all assetIds from this member's parts for this song
    const songParts = parts.filter((p) => p.songId === songId);
    const assetIds = [...new Set(songParts.flatMap((p) => p.assetIds))];

    if (assetIds.length === 0) {
      // No assets — show first line of text notes if any
      const firstNotes = songParts.find((p) => p.textNotes?.trim())?.textNotes.trim();
      if (!firstNotes) return '';
      const firstLine = firstNotes.split('\n')[0];
      return firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
    }

    let mp3Count = 0;
    let pdfCount = 0;
    for (const id of assetIds) {
      const asset = assets.find((a) => a.id === id);
      if (asset?.fileType === 'mp3') mp3Count++;
      else if (asset?.fileType === 'pdf') pdfCount++;
    }

    const labels: string[] = [];
    if (mp3Count > 0) labels.push(mp3Count === 1 ? 'mp3' : `${mp3Count} mp3s`);
    if (pdfCount > 0) labels.push(pdfCount === 1 ? 'pdf' : `${pdfCount} pdfs`);

    return labels.join(' & ');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>Loading...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Member Not Found</h1>
        <Link href="/members" className="text-blue-600 hover:underline">
          Back to Members
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/members" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Members
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <MemberBadge
          abbreviation={member.abbreviation}
          color={member.color}
          size="lg"
        />
        <h1 className="text-3xl font-bold">{member.firstName} {member.lastName}</h1>
      </div>

      {songs.length === 0 ? (
        <p className="text-gray-600">No parts available yet.</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Songs with parts:</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {songs.map((song) => {
              const summary = getAssetSummary(song.id);
              return (
                <Link
                  key={song.id}
                  href={`/members/${member.slug}/${song.slug}`}
                  className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold">{song.title}</h3>
                  {summary && (
                    <p className="text-sm text-gray-500 mt-1">{summary}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
