// Members API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';
import { slugify, generateInitials, getColorByIndex } from '@/lib/utils';

// GET /api/members - Get all members
export async function GET() {
  try {
    const membersRef = collection(db, 'members');
    const q = query(membersRef, orderBy('firstName', 'asc'));
    const snapshot = await getDocs(q);

    const members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firstName, lastName, abbreviation, color } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Generate slug from first and last name
    const slug = slugify(`${firstName} ${lastName}`);

    // Generate initials if abbreviation not provided
    const finalAbbreviation = abbreviation || generateInitials(firstName, lastName);

    // Get all members to determine color index
    const membersRef = collection(db, 'members');
    const snapshot = await getDocs(membersRef);
    const memberCount = snapshot.size;

    // Use provided color or get one from palette based on member count
    const finalColor = color || getColorByIndex(memberCount);

    const docRef = await addDoc(membersRef, {
      firstName,
      lastName,
      abbreviation: finalAbbreviation,
      color: finalColor,
      slug,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      slug,
      abbreviation: finalAbbreviation,
      color: finalColor,
    });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
