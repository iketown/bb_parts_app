'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MemberBadge from '@/components/MemberBadge';

interface Song {
  id: string;
  title: string;
  slug: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  abbreviation: string;
  color: string;
  slug: string;
}

export default function SongDetailPage() {
  const params = useParams();
  const songSlug = params.songSlug as string;

  const [song, setSong] = useState<Song | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [songSlug]);

  const fetchData = async () => {
    try {
      // Fetch songs to find the current one
      const songsRes = await fetch('/api/songs');
      const songsData = await songsRes.json();
      const currentSong = songsData.songs?.find((s: Song) => s.slug === songSlug);

      if (!currentSong) {
        setLoading(false);
        return;
      }

      setSong(currentSong);

      // Fetch parts for this song to find unique members
      const partsRes = await fetch(`/api/parts?songId=${currentSong.id}`);
      const partsData = await partsRes.json();

      // Get unique member IDs
      const memberIds = [...new Set(partsData.parts?.map((p: { memberId: string }) => p.memberId) || [])];

      // Fetch all members
      const membersRes = await fetch('/api/members');
      const membersData = await membersRes.json();

      // Filter to members who have parts for this song
      const membersWithParts = membersData.members?.filter((m: Member) =>
        memberIds.includes(m.id)
      ) || [];

      setMembers(membersWithParts);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  if (!song) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Song Not Found</h1>
        <Link href="/songs" className="text-blue-600 hover:underline">
          Back to Songs
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/songs" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Songs
      </Link>

      <h1 className="text-3xl font-bold mb-6">{song.title}</h1>

      {members.length === 0 ? (
        <p className="text-gray-600">No member parts available yet.</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Members with parts:</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.slug}/${song.slug}`}
                className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <MemberBadge
                    abbreviation={member.abbreviation}
                    color={member.color}
                    size="md"
                  />
                  <h3 className="text-lg font-semibold">
                    {member.firstName} {member.lastName}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">View parts →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
