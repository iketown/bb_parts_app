// Parts API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, type Query } from 'firebase-admin/firestore';
import { adminDb, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';

// GET /api/parts?songId=xxx&memberId=xxx - Get parts with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');
    const memberId = searchParams.get('memberId');

    let q: Query = adminDb.collection('parts');

    if (songId && memberId) {
      q = q.where('songId', '==', songId).where('memberId', '==', memberId);
    } else if (songId) {
      q = q.where('songId', '==', songId);
    } else if (memberId) {
      q = q.where('memberId', '==', memberId);
    }

    const snapshot = await q.get();

    let parts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString(),
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
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthorized) {
      return createAdminAuthErrorResponse(authResult);
    }

    if (!hasFirebaseAdminCredentials) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are required for part writes' },
        { status: 500 }
      );
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

    const docRef = await adminDb.collection('parts').add({
      songId,
      memberId,
      type,
      textNotes: textNotes || '',
      assetIds: assetIds || [],
      sortOrder: sortOrder || 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
