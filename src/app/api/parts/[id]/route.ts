// Single Part API - Update and Delete
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, hasFirebaseAdminCredentials } from '@/lib/firebase-admin';
import { createAdminAuthErrorResponse, verifyAdminAuth } from '@/lib/auth';

// PUT /api/parts/[id] - Update a part
export async function PUT(
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
        { error: 'Firebase Admin credentials are required for part writes' },
        { status: 500 }
      );
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

    updateData.updatedAt = FieldValue.serverTimestamp();

    await adminDb.collection('parts').doc(id).update(updateData);

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

    const { id } = await params;
    await adminDb.collection('parts').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting part:', error);
    return NextResponse.json(
      { error: 'Failed to delete part' },
      { status: 500 }
    );
  }
}
