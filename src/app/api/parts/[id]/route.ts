// Single Part API - Update and Delete
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkAdminAuth } from '@/lib/auth';

// PUT /api/parts/[id] - Update a part
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = await checkAdminAuth(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const updates = await request.json();

    // Only allow specific fields to be updated
    const allowedFields = ['type', 'textNotes', 'assetIds', 'sortOrder'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateData.updatedAt = serverTimestamp();

    const partRef = doc(db, 'parts', id);
    await updateDoc(partRef, updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating part:', error);
    return NextResponse.json(
      { error: 'Failed to update part' },
      { status: 500 }
    );
  }
}

// DELETE /api/parts/[id] - Delete a part
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
    const partRef = doc(db, 'parts', id);
    await deleteDoc(partRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting part:', error);
    return NextResponse.json(
      { error: 'Failed to delete part' },
      { status: 500 }
    );
  }
}
