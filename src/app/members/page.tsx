'use client';

import { useEffect, useState } from 'react';
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

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error fetching members:', error);
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
      <h1 className="text-3xl font-bold mb-6">Members</h1>

      {members.length === 0 ? (
        <p className="text-gray-600">No members available yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.slug}`}
              className="block p-6 bg-white border rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <MemberBadge
                  abbreviation={member.abbreviation}
                  color={member.color}
                  size="lg"
                />
                <h2 className="text-xl font-semibold">
                  {member.firstName} {member.lastName}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
