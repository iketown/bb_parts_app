// Single Song API - Get and Delete
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';

// GET /api/songs/[id] - Get a single song
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const songRef = doc(db, 'songs', id);
    const songSnap = await getDoc(songRef);

    if (!songSnap.exists()) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = {
      id: songSnap.id,
      ...songSnap.data(),
      createdAt: songSnap.data().createdAt?.toDate().toISOString(),
      updatedAt: songSnap.data().updatedAt?.toDate().toISOString(),
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
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const songRef = doc(db, 'songs', id);
    await deleteDoc(songRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json(
      { error: 'Failed to delete song' },
      { status: 500 }
    );
  }
}
