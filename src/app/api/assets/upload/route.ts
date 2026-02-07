// Asset Upload API
import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';

// POST /api/assets/upload - Upload a file to Storage and create Firestore doc
export async function POST(request: NextRequest) {
  try {
    const isAuthenticated = await checkAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const label = formData.get('label') as string;
    const songId = formData.get('songId') as string;

    if (!file || !label || !songId) {
      return NextResponse.json(
        { error: 'File, label, and songId are required' },
        { status: 400 }
      );
    }

    // Determine file type
    const fileType = file.type.includes('audio') ? 'mp3' : 'pdf';
    const fileExtension = fileType === 'mp3' ? 'mp3' : 'pdf';

    // Create a unique storage path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `assets/${songId}/${timestamp}_${sanitizedFilename}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const fileBuffer = await file.arrayBuffer();
    await uploadBytes(storageRef, fileBuffer, {
      contentType: file.type,
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Create Firestore document
    const assetsRef = collection(db, 'assets');
    const docRef = await addDoc(assetsRef, {
      filename: file.name,
      label,
      fileType,
      storagePath,
      downloadUrl,
      songId,
      uploadedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      downloadUrl,
    });
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      { error: 'Failed to upload asset' },
      { status: 500 }
    );
  }
}
