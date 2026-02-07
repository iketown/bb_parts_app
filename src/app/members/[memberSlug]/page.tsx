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

export default function MemberDetailPage() {
  const params = useParams();
  const memberSlug = params.memberSlug as string;

  const [member, setMember] = useState<Member | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
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

      // Fetch parts for this member to find unique songs
      const partsRes = await fetch(`/api/parts?memberId=${currentMember.id}`);
      const partsData = await partsRes.json();

      // Get unique song IDs
      const songIds = [...new Set(partsData.parts?.map((p: { songId: string }) => p.songId) || [])];

      // Fetch all songs
      const songsRes = await fetch('/api/songs');
      const songsData = await songsRes.json();

      // Filter to songs that have parts for this member
      const songsWithParts = songsData.songs?.filter((s: Song) =>
        songIds.includes(s.id)
      ) || [];

      setSongs(songsWithParts);
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
            {songs.map((song) => (
              <Link
                key={song.id}
                href={`/members/${member.slug}/${song.slug}`}
                className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold">{song.title}</h3>
                <p className="text-sm text-gray-600 mt-1">View parts →</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
