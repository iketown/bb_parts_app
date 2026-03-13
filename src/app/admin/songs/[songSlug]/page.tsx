'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { authenticatedFetch } from '@/lib/api-client';

interface Song {
  id: string;
  title: string;
  slug: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  abbreviation: string;
  color: string;
  tags: string[];
}

interface Asset {
  id: string;
  label: string;
  filename: string;
  fileType: 'mp3' | 'pdf';
  downloadUrl: string;
}

interface Part {
  id: string;
  type: string;
  textNotes: string;
  memberId: string;
  memberName?: string;
  assetIds: string[];
  sortOrder: number;
}

interface SuggestedPartAction {
  assetId: string;
  assetLabel: string;
  memberId: string;
  memberName: string;
  matchedTag: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleMatchesTag(title: string, tag: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedTag = tag.trim().toLowerCase();

  if (!normalizedTitle || !normalizedTag) {
    return false;
  }

  const tagPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTag)}($|[^a-z0-9])`, 'i');
  return tagPattern.test(normalizedTitle);
}

export default function SongManagementPage() {
  const params = useParams();
  const songSlug = params.songSlug as string;

  const [song, setSong] = useState<Song | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);

  // New part form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [partType, setPartType] = useState<'vocal' | 'instrumental'>('vocal');
  const [textNotes, setTextNotes] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop state for parts
  const [draggedPartId, setDraggedPartId] = useState<string | null>(null);

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editTextNotes, setEditTextNotes] = useState('');
  const [editAssetIds, setEditAssetIds] = useState<string[]>([]);
  const [editType, setEditType] = useState<'vocal' | 'instrumental'>('vocal');

  // Edit dialog file upload state
  const [editUploadFile, setEditUploadFile] = useState<File | null>(null);
  const [editUploadLabel, setEditUploadLabel] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);

  // Duplicate detection modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAsset, setDuplicateAsset] = useState<Asset | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    label: string;
    isEditDialog: boolean;
  } | null>(null);
  const [suggestedPartActions, setSuggestedPartActions] = useState<SuggestedPartAction[]>([]);
  const [creatingSuggestedPartKey, setCreatingSuggestedPartKey] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [songSlug]);

  const fetchData = async () => {
    try {
      // Fetch all songs to find the current one
      const songsRes = await fetch('/api/songs');
      const songsData = await songsRes.json();
      const currentSong = songsData.songs?.find((s: Song) => s.slug === songSlug);

      if (!currentSong) {
        console.error('Song not found');
        return;
      }

      setSong(currentSong);

      // Fetch members, assets, and parts in parallel
      const [membersRes, assetsRes, partsRes] = await Promise.all([
        fetch('/api/members'),
        fetch(`/api/assets?songId=${currentSong.id}`),
        fetch(`/api/parts?songId=${currentSong.id}`),
      ]);

      const membersData = await membersRes.json();
      const assetsData = await assetsRes.json();
      const partsData = await partsRes.json();

      setMembers(membersData.members || []);
      setAssets(assetsData.assets || []);

      // Enrich parts with member names
      const enrichedParts = (partsData.parts || []).map((part: Part) => {
        const member = membersData.members?.find((m: Member) => m.id === part.memberId);
        return {
          ...part,
          memberName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
        };
      });
      setParts(enrichedParts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop file upload handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      // Check if it's an mp3 or pdf
      if (file.type.includes('audio') || file.type.includes('pdf')) {
        setUploadFile(file);
        // Auto-generate label from filename
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadLabel(nameWithoutExt);
      } else {
        alert('Please upload an MP3 or PDF file');
      }
    }
  };

  const checkForDuplicate = (filename: string): Asset | null => {
    return assets.find((asset) => asset.filename === filename) || null;
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadLabel.trim() || !song) return;

    // Check for duplicate
    const duplicate = checkForDuplicate(uploadFile.name);
    if (duplicate) {
      setDuplicateAsset(duplicate);
      setPendingUpload({
        file: uploadFile,
        label: uploadLabel,
        isEditDialog: false,
      });
      setShowDuplicateModal(true);
      return;
    }

    await performUpload(uploadFile, uploadLabel, false);
  };

  const performUpload = async (file: File, label: string, isEditDialog: boolean) => {
    if (!song) return;

    if (isEditDialog) {
      setEditUploading(true);
    } else {
      setUploading(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('label', label);
      formData.append('songId', song.id);

      const response = await authenticatedFetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const uploadedAsset: Asset = {
          id: data.id,
          label,
          filename: file.name,
          fileType: file.type.includes('audio') ? 'mp3' : 'pdf',
          downloadUrl: data.downloadUrl,
        };

        if (!isEditDialog && uploadedAsset.fileType === 'mp3') {
          const newSuggestions = members
            .flatMap((member) => {
              const matchingTag = (member.tags || []).find((tag) => titleMatchesTag(label, tag));

              if (!matchingTag) {
                return [];
              }

              return [{
                assetId: uploadedAsset.id,
                assetLabel: uploadedAsset.label,
                memberId: member.id,
                memberName: `${member.firstName} ${member.lastName}`,
                matchedTag: matchingTag,
              }];
            });

          if (newSuggestions.length > 0) {
            setSuggestedPartActions((prev) => {
              const dedupedSuggestions = newSuggestions.filter((suggestion) => (
                !prev.some((existing) =>
                  existing.assetId === suggestion.assetId && existing.memberId === suggestion.memberId
                )
              ));

              return dedupedSuggestions.length > 0 ? [...dedupedSuggestions, ...prev] : prev;
            });
          }
        }

        if (isEditDialog) {
          setEditAssetIds((prev) => [...prev, data.id]);
          setEditUploadFile(null);
          setEditUploadLabel('');
        } else {
          setUploadFile(null);
          setUploadLabel('');
        }

        fetchData();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      if (isEditDialog) {
        setEditUploading(false);
      } else {
        setUploading(false);
      }
    }
  };

  const handleUseExisting = () => {
    if (!duplicateAsset || !pendingUpload) return;

    if (pendingUpload.isEditDialog) {
      // Add existing asset to the edit dialog
      setEditAssetIds((prev) => [...prev, duplicateAsset.id]);
      setEditUploadFile(null);
      setEditUploadLabel('');
    }

    setShowDuplicateModal(false);
    setDuplicateAsset(null);
    setPendingUpload(null);
  };

  const handleReUpload = async () => {
    if (!pendingUpload) return;

    setShowDuplicateModal(false);
    await performUpload(
      pendingUpload.file,
      pendingUpload.label,
      pendingUpload.isEditDialog
    );

    setDuplicateAsset(null);
    setPendingUpload(null);
  };

  const handleCancelUpload = () => {
    setShowDuplicateModal(false);
    setDuplicateAsset(null);
    setPendingUpload(null);
  };

  // Edit dialog drag and drop handlers
  const handleEditDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(true);
  };

  const handleEditDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);
  };

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEditDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes('audio') || file.type.includes('pdf')) {
        setEditUploadFile(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setEditUploadLabel(nameWithoutExt);
      } else {
        alert('Please upload an MP3 or PDF file');
      }
    }
  };

  const handleEditFileUpload = async () => {
    if (!editUploadFile || !editUploadLabel.trim() || !song) return;

    // Check for duplicate
    const duplicate = checkForDuplicate(editUploadFile.name);
    if (duplicate) {
      setDuplicateAsset(duplicate);
      setPendingUpload({
        file: editUploadFile,
        label: editUploadLabel,
        isEditDialog: true,
      });
      setShowDuplicateModal(true);
      return;
    }

    await performUpload(editUploadFile, editUploadLabel, true);
  };

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !song) return;

    try {
      const response = await authenticatedFetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: song.id,
          memberId: selectedMemberId,
          type: partType,
          textNotes,
          assetIds: selectedAssetIds,
          sortOrder: parts.length,
        }),
      });

      if (response.ok) {
        setSelectedMemberId('');
        setTextNotes('');
        setSelectedAssetIds([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating part:', error);
    }
  };

  const dismissSuggestedPartAction = (assetId: string, memberId: string) => {
    setSuggestedPartActions((prev) =>
      prev.filter((suggestion) => suggestion.assetId !== assetId || suggestion.memberId !== memberId)
    );
  };

  const createSuggestedPart = async (suggestion: SuggestedPartAction) => {
    if (!song) return;

    const suggestionKey = `${suggestion.assetId}:${suggestion.memberId}`;
    setCreatingSuggestedPartKey(suggestionKey);

    try {
      const response = await authenticatedFetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: song.id,
          memberId: suggestion.memberId,
          type: 'vocal',
          textNotes: '',
          assetIds: [suggestion.assetId],
          sortOrder: parts.length,
        }),
      });

      if (response.ok) {
        dismissSuggestedPartAction(suggestion.assetId, suggestion.memberId);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating suggested part:', error);
    } finally {
      setCreatingSuggestedPartKey(null);
    }
  };

  const deletePart = async (id: string) => {
    if (!confirm('Delete this part?')) return;

    try {
      await authenticatedFetch(`/api/parts/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting part:', error);
    }
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('Delete this asset? This will remove it from storage and all parts using it.')) return;

    try {
      await authenticatedFetch(`/api/assets/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const toggleEditAsset = (assetId: string) => {
    setEditAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const openEditDialog = (part: Part) => {
    setEditingPart(part);
    setEditTextNotes(part.textNotes);
    setEditAssetIds(part.assetIds);
    setEditType(part.type as 'vocal' | 'instrumental');
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingPart(null);
    setEditTextNotes('');
    setEditAssetIds([]);
    setEditUploadFile(null);
    setEditUploadLabel('');
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;

    try {
      const response = await authenticatedFetch(`/api/parts/${editingPart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          textNotes: editTextNotes,
          assetIds: editAssetIds,
        }),
      });

      if (response.ok) {
        closeEditDialog();
        fetchData();
      }
    } catch (error) {
      console.error('Error updating part:', error);
    }
  };

  // Drag and drop handlers for parts reordering
  const handlePartDragStart = (e: React.DragEvent, partId: string) => {
    setDraggedPartId(partId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePartDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePartDrop = async (e: React.DragEvent, targetPartId: string) => {
    e.preventDefault();

    if (!draggedPartId || draggedPartId === targetPartId) {
      setDraggedPartId(null);
      return;
    }

    // Reorder parts
    const draggedIndex = parts.findIndex(p => p.id === draggedPartId);
    const targetIndex = parts.findIndex(p => p.id === targetPartId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newParts = [...parts];
    const [removed] = newParts.splice(draggedIndex, 1);
    newParts.splice(targetIndex, 0, removed);

    // Update sortOrder for all parts
    const updatedParts = newParts.map((part, index) => ({
      ...part,
      sortOrder: index,
    }));

    setParts(updatedParts);
    setDraggedPartId(null);

    // Update all parts in the backend
    try {
      await Promise.all(
        updatedParts.map((part) =>
          authenticatedFetch(`/api/parts/${part.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: part.sortOrder }),
          })
        )
      );
    } catch (error) {
      console.error('Error updating part order:', error);
      fetchData(); // Refetch to restore correct order
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!song) {
    return <div className="p-8">Song not found</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Manage: {song.title}</h1>

      {/* File Upload Section with Drag & Drop */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">Upload Asset</h2>
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              type="file"
              accept=".mp3,.pdf,audio/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadFile(file);
                  const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                  setUploadLabel(nameWithoutExt);
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-600">
                {uploadFile ? (
                  <div>
                    <p className="font-semibold text-blue-600">{uploadFile.name}</p>
                    <p className="text-sm mt-1">Click to change or drag another file</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">Drag and drop file here</p>
                    <p className="text-sm mt-1">or click to browse</p>
                    <p className="text-xs mt-2 text-gray-500">MP3 or PDF files only</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={uploadLabel}
              onChange={(e) => setUploadLabel(e.target.value)}
              placeholder="e.g., Chris Vocal Track"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={!uploadFile || !uploadLabel.trim() || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {assets.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Uploaded Assets</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {assets.map((asset) => (
                <div key={asset.id} className="flex flex-col text-sm p-3 border rounded hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    {asset.fileType === 'mp3' ? (
                      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        MP3
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        PDF
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{asset.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{asset.filename}</p>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="w-full px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {suggestedPartActions.length > 0 && (
        <div className="space-y-3">
          {suggestedPartActions.map((suggestion) => {
            const suggestionKey = `${suggestion.assetId}:${suggestion.memberId}`;
            return (
              <div
                key={suggestionKey}
                className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-green-900">
                    Create {song.title} part for {suggestion.memberName}
                  </p>
                  <p className="text-sm text-green-800">
                    Matched &quot;{suggestion.assetLabel}&quot; on tag &quot;{suggestion.matchedTag}&quot;.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => dismissSuggestedPartAction(suggestion.assetId, suggestion.memberId)}
                    className="px-4 py-2 rounded border border-green-300 bg-white text-green-900 hover:bg-green-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => createSuggestedPart(suggestion)}
                    disabled={creatingSuggestedPartKey === suggestionKey}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300"
                  >
                    {creatingSuggestedPartKey === suggestionKey ? 'Creating...' : 'OK'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Part Section */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">Create Part</h2>
        <form onSubmit={handleCreatePart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Member</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={partType}
              onChange={(e) => setPartType(e.target.value as 'vocal' | 'instrumental')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="vocal">Vocal</option>
              <option value="instrumental">Instrumental</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Text Notes</label>
            <textarea
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              placeholder="Notes about this part..."
              className="w-full px-3 py-2 border rounded"
              rows={4}
            />
          </div>

          {assets.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Attach Assets</label>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <label key={asset.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{asset.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedMemberId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Create Part
          </button>
        </form>
      </div>

      {/* Parts List with Drag & Drop Reordering */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">
          Parts <span className="text-sm font-normal text-gray-500">(Drag to reorder)</span>
        </h2>
        <div className="space-y-4">
          {parts.map((part) => (
            <div
              key={part.id}
              draggable
              onDragStart={(e) => handlePartDragStart(e, part.id)}
              onDragOver={handlePartDragOver}
              onDrop={(e) => handlePartDrop(e, part.id)}
              className={`border rounded p-4 cursor-move transition-all ${
                draggedPartId === part.id
                  ? 'opacity-50 bg-gray-100'
                  : 'hover:shadow-md hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">⋮⋮</span>
                  <h3 className="font-semibold">
                    {part.memberName} - {part.type}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(part);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePart(part.id);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {part.textNotes && (
                <p className="text-sm text-gray-600 mt-1">{part.textNotes}</p>
              )}
              {part.assetIds.length > 0 && (
                <p className="text-sm text-blue-600 mt-1">
                  {part.assetIds.length} asset(s) attached
                </p>
              )}
            </div>
          ))}
          {parts.length === 0 && (
            <p className="text-gray-500 text-sm">No parts created yet</p>
          )}
        </div>
      </div>

      {/* Edit Part Dialog */}
      {isEditDialogOpen && editingPart && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeEditDialog}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{song.title}</h2>
              <button
                onClick={closeEditDialog}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdatePart} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Member</label>
                <input
                  type="text"
                  value={editingPart.memberName}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'vocal' | 'instrumental')}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="vocal">Vocal</option>
                  <option value="instrumental">Instrumental</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Text Notes</label>
                <textarea
                  value={editTextNotes}
                  onChange={(e) => setEditTextNotes(e.target.value)}
                  placeholder="Notes about this part..."
                  className="w-full px-3 py-2 border rounded"
                  rows={6}
                />
              </div>

              {/* Upload New Asset in Edit Dialog */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-2">Upload New Asset</label>
                <div
                  onDragEnter={handleEditDragEnter}
                  onDragOver={handleEditDragOver}
                  onDragLeave={handleEditDragLeave}
                  onDrop={handleEditDrop}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isEditDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".mp3,.pdf,audio/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditUploadFile(file);
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                        setEditUploadLabel(nameWithoutExt);
                      }
                    }}
                    className="hidden"
                    id="edit-file-upload"
                  />
                  <label htmlFor="edit-file-upload" className="cursor-pointer">
                    <div className="text-sm text-gray-600">
                      {editUploadFile ? (
                        <div>
                          <p className="font-semibold text-blue-600">{editUploadFile.name}</p>
                          <p className="text-xs mt-1">Click to change or drag another file</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">Drag file here or click to browse</p>
                          <p className="text-xs mt-1">MP3 or PDF files</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {editUploadFile && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={editUploadLabel}
                      onChange={(e) => setEditUploadLabel(e.target.value)}
                      placeholder="Label for this asset"
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleEditFileUpload}
                      disabled={!editUploadLabel.trim() || editUploading}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 text-sm"
                    >
                      {editUploading ? 'Uploading...' : 'Upload & Attach'}
                    </button>
                  </div>
                )}
              </div>

              {/* Currently Attached Assets */}
              {editAssetIds.length > 0 && (
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    {editAssetIds.map((assetId) => {
                      const asset = assets.find((a) => a.id === assetId);
                      if (!asset) return null;
                      return (
                        <div
                          key={asset.id}
                          className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {asset.fileType === 'mp3' ? (
                                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  MP3
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                  PDF
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-sm">{asset.label}</p>
                                <p className="text-xs text-gray-500">{asset.filename}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleEditAsset(asset.id)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 flex-shrink-0"
                            >
                              Remove
                            </button>
                          </div>

                          {/* MP3 Player or PDF Link */}
                          {asset.fileType === 'mp3' ? (
                            <div className="space-y-2">
                              <audio controls className="w-full">
                                <source src={asset.downloadUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                              <a
                                href={asset.downloadUrl}
                                download={asset.filename}
                                className="inline-block text-xs text-blue-600 hover:underline"
                              >
                                Download MP3
                              </a>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <a
                                href={asset.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Open PDF
                              </a>
                              <a
                                href={asset.downloadUrl}
                                download={asset.filename}
                                className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 text-sm"
                              >
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Assets to Add */}
              {assets.length > 0 && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Add More Assets
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (Select to attach)
                    </span>
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3 bg-gray-50">
                    {assets
                      .filter((asset) => !editAssetIds.includes(asset.id))
                      .map((asset) => (
                        <label
                          key={asset.id}
                          className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => toggleEditAsset(asset.id)}
                            className="rounded"
                          />
                          {asset.fileType === 'mp3' ? (
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                              MP3
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
                              PDF
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{asset.label}</p>
                            <p className="text-xs text-gray-500">{asset.filename}</p>
                          </div>
                        </label>
                      ))}
                    {assets.filter((asset) => !editAssetIds.includes(asset.id)).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        All assets are already attached
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={closeEditDialog}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate File Detection Modal */}
      {showDuplicateModal && duplicateAsset && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelUpload}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">File Already Exists</h2>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Already uploaded a file called:
              </p>
              <div className="bg-gray-100 p-3 rounded border">
                <div className="flex items-center gap-3">
                  {duplicateAsset.fileType === 'mp3' ? (
                    <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      MP3
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      PDF
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{duplicateAsset.label}</p>
                    <p className="text-xs text-gray-500">{duplicateAsset.filename}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleUseExisting}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Use "{duplicateAsset.label}"
              </button>
              <button
                onClick={handleReUpload}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Re-upload Anyway
              </button>
              <button
                onClick={handleCancelUpload}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
