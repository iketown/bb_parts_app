// Members API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';
import { slugify, generateInitials, getColorByIndex } from '@/lib/utils';

// GET /api/members - Get all members
export async function GET() {
  try {
    const snapshot = await adminDb.collection('members').orderBy('firstName', 'asc').get();

    const members = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString(),
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
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthorized) {
      return createAdminAuthErrorResponse(authResult);
    }

    if (!hasFirebaseAdminCredentials) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are required for member writes' },
        { status: 500 }
      );
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
    const snapshot = await adminDb.collection('members').get();
    const memberCount = snapshot.size;

    // Use provided color or get one from palette based on member count
    const finalColor = color || getColorByIndex(memberCount);

    const docRef = await adminDb.collection('members').add({
      firstName,
      lastName,
      abbreviation: finalAbbreviation,
      color: finalColor,
      slug,
      createdAt: FieldValue.serverTimestamp(),
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
