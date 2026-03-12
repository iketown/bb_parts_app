// Single Member API - Get and Delete
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';
import { generateInitials, slugify } from '@/lib/utils';

// GET /api/members/[id] - Get a single member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const memberSnap = await adminDb.collection('members').doc(id).get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = {
      id: memberSnap.id,
      ...memberSnap.data(),
      createdAt: memberSnap.data()?.createdAt?.toDate?.().toISOString(),
    };

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await adminDb.collection('members').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}

// PUT /api/members/[id] - Update a member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    await adminDb.collection('members').doc(id).update({
      firstName,
      lastName,
      abbreviation: abbreviation || generateInitials(firstName, lastName),
      color,
      slug: slugify(`${firstName} ${lastName}`),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}
