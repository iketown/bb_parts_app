// Single Song API - Get and Delete
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';
import { slugify } from '@/lib/utils';

// GET /api/songs/[id] - Get a single song
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const songSnap = await adminDb.collection('songs').doc(id).get();

    if (!songSnap.exists) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = {
      id: songSnap.id,
      ...songSnap.data(),
      createdAt: songSnap.data()?.createdAt?.toDate?.().toISOString(),
      updatedAt: songSnap.data()?.updatedAt?.toDate?.().toISOString(),
    };

    return NextResponse.json({ song });
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json(
      { error: 'Failed to fetch song' },
      { status: 500 }
    );
  }
}

// DELETE /api/songs/[id] - Delete a song
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
        { error: 'Firebase Admin credentials are required for song writes' },
        { status: 500 }
      );
    }

    const { id } = await params;
    await adminDb.collection('songs').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json(
      { error: 'Failed to delete song' },
      { status: 500 }
    );
  }
}

// PUT /api/songs/[id] - Update a song
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
        { error: 'Firebase Admin credentials are required for song writes' },
        { status: 500 }
      );
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { id } = await params;

    await adminDb.collection('songs').doc(id).update({
      title,
      slug: slugify(title),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json(
      { error: 'Failed to update song' },
      { status: 500 }
    );
  }
}
