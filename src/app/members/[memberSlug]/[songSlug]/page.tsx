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

interface Asset {
  id: string;
  label: string;
  filename: string;
  fileType: 'mp3' | 'pdf';
  downloadUrl: string;
}

interface Part {
  id: string;
  type: 'vocal' | 'instrumental';
  textNotes: string;
  assetIds: string[];
}

export default function MemberSongPartsPage() {
  const params = useParams();
  const memberSlug = params.memberSlug as string;
  const songSlug = params.songSlug as string;

  const [member, setMember] = useState<Member | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [memberSlug, songSlug]);

  const fetchData = async () => {
    try {
      // Fetch members and songs in parallel
      const [membersRes, songsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/songs'),
      ]);

      const membersData = await membersRes.json();
      const songsData = await songsRes.json();

      const currentMember = membersData.members?.find((m: Member) => m.slug === memberSlug);
      const currentSong = songsData.songs?.find((s: Song) => s.slug === songSlug);

      if (!currentMember || !currentSong) {
        setLoading(false);
        return;
      }

      setMember(currentMember);
      setSong(currentSong);

      // Fetch parts and assets for this member/song combination
      const [partsRes, assetsRes] = await Promise.all([
        fetch(`/api/parts?songId=${currentSong.id}&memberId=${currentMember.id}`),
        fetch(`/api/assets?songId=${currentSong.id}`),
      ]);

      const partsData = await partsRes.json();
      const assetsData = await assetsRes.json();

      setParts(partsData.parts || []);
      setAssets(assetsData.assets || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssetById = (assetId: string): Asset | undefined => {
    return assets.find((a) => a.id === assetId);
  };

  const vocalParts = parts.filter((p) => p.type === 'vocal');
  const instrumentalParts = parts.filter((p) => p.type === 'instrumental');

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>Loading...</div>
      </div>
    );
  }

  if (!member || !song) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Not Found</h1>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={`/members/${member.slug}`} className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to {member.firstName} {member.lastName}'s Songs
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{song.title}</h1>
        <div className="flex items-center gap-3">
          <MemberBadge
            abbreviation={member.abbreviation}
            color={member.color}
            size="md"
          />
          <p className="text-xl text-gray-600">{member.firstName} {member.lastName}'s Parts</p>
        </div>
      </div>

      {parts.length === 0 ? (
        <p className="text-gray-600">No parts available.</p>
      ) : (
        <div className="space-y-8">
          {/* Vocal Parts */}
          {vocalParts.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Vocal Parts</h2>
              <div className="space-y-6">
                {vocalParts.map((part) => (
                  <div key={part.id} className="bg-white p-6 rounded-lg border">
                    {part.textNotes && (
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Notes:</h3>
                        <p className="whitespace-pre-wrap text-gray-700">{part.textNotes}</p>
                      </div>
                    )}

                    {part.assetIds.length > 0 && (
                      <div className="space-y-4">
                        {part.assetIds.map((assetId) => {
                          const asset = getAssetById(assetId);
                          if (!asset) return null;

                          return (
                            <div key={asset.id} className="border rounded p-4">
                              <h4 className="font-semibold mb-2">{asset.label}</h4>

                              {asset.fileType === 'mp3' ? (
                                <div className="space-y-2">
                                  <audio controls className="w-full">
                                    <source src={asset.downloadUrl} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                  </audio>
                                  <a
                                    href={asset.downloadUrl}
                                    download={asset.filename}
                                    className="inline-block text-sm text-blue-600 hover:underline"
                                  >
                                    Download MP3
                                  </a>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <a
                                    href={asset.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                  >
                                    Open PDF
                                  </a>
                                  <a
                                    href={asset.downloadUrl}
                                    download={asset.filename}
                                    className="inline-block px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Download PDF
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Instrumental Parts */}
          {instrumentalParts.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Instrumental Parts</h2>
              <div className="space-y-6">
                {instrumentalParts.map((part) => (
                  <div key={part.id} className="bg-white p-6 rounded-lg border">
                    {part.textNotes && (
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Notes:</h3>
                        <p className="whitespace-pre-wrap text-gray-700">{part.textNotes}</p>
                      </div>
                    )}

                    {part.assetIds.length > 0 && (
                      <div className="space-y-4">
                        {part.assetIds.map((assetId) => {
                          const asset = getAssetById(assetId);
                          if (!asset) return null;

                          return (
                            <div key={asset.id} className="border rounded p-4">
                              <h4 className="font-semibold mb-2">{asset.label}</h4>

                              {asset.fileType === 'mp3' ? (
                                <div className="space-y-2">
                                  <audio controls className="w-full">
                                    <source src={asset.downloadUrl} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                  </audio>
                                  <a
                                    href={asset.downloadUrl}
                                    download={asset.filename}
                                    className="inline-block text-sm text-blue-600 hover:underline"
                                  >
                                    Download MP3
                                  </a>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <a
                                    href={asset.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                  >
                                    Open PDF
                                  </a>
                                  <a
                                    href={asset.downloadUrl}
                                    download={asset.filename}
                                    className="inline-block px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-sm"
                                  >
                                    Download PDF
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
