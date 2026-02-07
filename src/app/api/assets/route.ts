// Assets API - List
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/assets?songId=xxx - Get all assets (optionally filtered by songId)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('songId');

    const assetsRef = collection(db, 'assets');
    let q;

    if (songId) {
      // Use where clause without orderBy to avoid composite index requirement
      q = query(assetsRef, where('songId', '==', songId));
    } else {
      q = query(assetsRef, orderBy('uploadedAt', 'desc'));
    }

    const snapshot = await getDocs(q);

    let assets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate().toISOString(),
    }));

    // Sort in memory if we filtered by songId
    if (songId) {
      assets.sort((a: any, b: any) => {
        const dateA = new Date(a.uploadedAt || 0).getTime();
        const dateB = new Date(b.uploadedAt || 0).getTime();
        return dateB - dateA; // desc order
      });
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
