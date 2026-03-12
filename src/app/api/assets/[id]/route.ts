// Single Asset API - Delete
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';

// DELETE /api/assets/[id] - Delete asset from Storage and Firestore
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
        { error: 'Firebase Admin credentials are required for asset writes' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const assetRef = adminDb.collection('assets').doc(id);
    const assetSnap = await assetRef.get();

    if (!assetSnap.exists) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const assetData = assetSnap.data();

    // Delete from Storage
    try {
      await adminStorage.file(assetData?.storagePath).delete();
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue even if storage deletion fails
    }

    // Delete from Firestore
    await assetRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
