// Single Asset API - Delete
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';

// DELETE /api/assets/[id] - Delete asset from Storage and Firestore
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await checkAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const assetRef = doc(db, 'assets', id);
    const assetSnap = await getDoc(assetRef);

    if (!assetSnap.exists()) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const assetData = assetSnap.data();

    // Delete from Storage
    try {
      const storageRef = ref(storage, assetData.storagePath);
      await deleteObject(storageRef);
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue even if storage deletion fails
    }

    // Delete from Firestore
    await deleteDoc(assetRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
