// Asset Upload API
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminStorage, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';

// POST /api/assets/upload - Upload a file to Storage and create Firestore doc
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthorized) {
      return createAdminAuthErrorResponse(authResult);
    }

    if (!hasFirebaseAdminCredentials) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials are required for asset writes' },
        { status: 500 }
      );
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

    // Create a unique storage path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `assets/${songId}/${timestamp}_${sanitizedFilename}`;

    const fileBuffer = await file.arrayBuffer();
    const downloadToken = crypto.randomUUID();

    await adminStorage.file(storagePath).save(Buffer.from(fileBuffer), {
      contentType: file.type,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`;

    const docRef = await adminDb.collection('assets').add({
      filename: file.name,
      label,
      fileType,
      storagePath,
      downloadUrl,
      songId,
      uploadedAt: FieldValue.serverTimestamp(),
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
