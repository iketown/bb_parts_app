// Parts API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';

// GET /api/parts?songId=xxx&memberId=xxx - Get parts with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');
    const memberId = searchParams.get('memberId');

    const partsRef = collection(db, 'parts');
    let q;

    // Build query based on filters
    // Note: Firestore requires composite indexes for where() + orderBy() on different fields
    // We'll fetch without orderBy and sort in memory to avoid index requirements
    if (songId && memberId) {
      q = query(
        partsRef,
        where('songId', '==', songId),
        where('memberId', '==', memberId)
      );
    } else if (songId) {
      q = query(partsRef, where('songId', '==', songId));
    } else if (memberId) {
      q = query(partsRef, where('memberId', '==', memberId));
    } else {
      q = query(partsRef);
    }

    const snapshot = await getDocs(q);

    let parts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    // Sort in memory
    if (songId || memberId) {
      parts.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } else {
      parts.sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return NextResponse.json({ parts });
  } catch (error) {
    console.error('Error fetching parts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parts' },
      { status: 500 }
    );
  }
}

// POST /api/parts - Create a new part
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { songId, memberId, type, textNotes, assetIds, sortOrder } = await request.json();

    if (!songId || !memberId || !type) {
      return NextResponse.json(
        { error: 'songId, memberId, and type are required' },
        { status: 400 }
      );
    }

    if (!['vocal', 'instrumental'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be either "vocal" or "instrumental"' },
        { status: 400 }
      );
    }

    const partsRef = collection(db, 'parts');

    const docRef = await addDoc(partsRef, {
      songId,
      memberId,
      type,
      textNotes: textNotes || '',
      assetIds: assetIds || [],
      sortOrder: sortOrder || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Error creating part:', error);
    return NextResponse.json(
      { error: 'Failed to create part' },
      { status: 500 }
    );
  }
}
