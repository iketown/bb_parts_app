// Songs API - List and Create
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';
import { slugify } from '@/lib/utils';

// GET /api/songs - Get all songs
export async function GET() {
  try {
    const songsRef = collection(db, 'songs');
    const q = query(songsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const songs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    return NextResponse.json({ songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

// POST /api/songs - Create a new song
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const slug = slugify(title);
    const songsRef = collection(db, 'songs');

    const docRef = await addDoc(songsRef, {
      title,
      slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      slug,
    });
  } catch (error) {
    console.error('Error creating song:', error);
    return NextResponse.json(
      { error: 'Failed to create song' },
      { status: 500 }
    );
  }
}
