"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateInitials, getColorByIndex, MEMBER_COLORS } from "@/lib/utils";
import { authenticatedFetch } from "@/lib/api-client";
import MemberBadge from "@/components/MemberBadge";

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
  slug: string;
}

interface Part {
  id: string;
  songId: string;
  memberId: string;
}

export default function AdminDashboard() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [newSongTitle, setNewSongTitle] = useState("");
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songSearch, setSongSearch] = useState("");
  const [showAddSongDialog, setShowAddSongDialog] = useState(false);

  // Member form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [showMemberForm, setShowMemberForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-generate abbreviation when first/last name changes
  useEffect(() => {
    if (firstName && lastName && !abbreviation) {
      setAbbreviation(generateInitials(firstName, lastName));
    }
  }, [firstName, lastName]);

  // Set default color when form opens
  useEffect(() => {
    if (showMemberForm && !selectedColor && !editingMemberId) {
      setSelectedColor(getColorByIndex(members.length));
    }
  }, [showMemberForm, selectedColor, members.length, editingMemberId]);

  const fetchData = async () => {
    try {
      const [songsRes, membersRes, partsRes] = await Promise.all([
        fetch("/api/songs"),
        fetch("/api/members"),
        fetch("/api/parts"),
      ]);

      const songsData = await songsRes.json();
      const membersData = await membersRes.json();
      const partsData = await partsRes.json();

      setSongs(songsData.songs || []);
      setMembers(membersData.members || []);
      setParts(partsData.parts || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetSongDialog = () => {
    setEditingSong(null);
    setNewSongTitle("");
    setShowAddSongDialog(false);
  };

  const saveSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSongTitle.trim()) return;

    try {
      const response = await authenticatedFetch(
        editingSong ? `/api/songs/${editingSong.id}` : "/api/songs",
        {
          method: editingSong ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newSongTitle }),
        },
      );

      if (response.ok) {
        resetSongDialog();
        fetchData();
      }
    } catch (error) {
      console.error("Error saving song:", error);
    }
  };

  const openCreateSongDialog = () => {
    setEditingSong(null);
    setNewSongTitle("");
    setShowAddSongDialog(true);
  };

  const openEditSongDialog = (song: Song) => {
    setEditingSong(song);
    setNewSongTitle(song.title);
    setShowAddSongDialog(true);
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setFirstName("");
    setLastName("");
    setAbbreviation("");
    setSelectedColor("");
    setTagsInput("");
    setShowMemberForm(false);
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    try {
      const response = await authenticatedFetch(
        editingMemberId ? `/api/members/${editingMemberId}` : "/api/members",
        {
          method: editingMemberId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            abbreviation: abbreviation || generateInitials(firstName, lastName),
            color: selectedColor,
            tags: tagsInput
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }),
        },
      );

      if (response.ok) {
        resetMemberForm();
        fetchData();
      }
    } catch (error) {
      console.error("Error saving member:", error);
    }
  };

  const openCreateMemberForm = () => {
    setEditingMemberId(null);
    setFirstName("");
    setLastName("");
    setAbbreviation("");
    setSelectedColor(getColorByIndex(members.length));
    setTagsInput("");
    setShowMemberForm(true);
  };

  const openEditMemberForm = (member: Member) => {
    setEditingMemberId(member.id);
    setFirstName(member.firstName);
    setLastName(member.lastName);
    setAbbreviation(member.abbreviation);
    setSelectedColor(member.color);
    setTagsInput((member.tags || []).join(", "));
    setShowMemberForm(true);
  };

  // Build a map of songId -> unique members who have parts
  const songMembersMap = new Map<string, Member[]>();
  for (const part of parts) {
    if (!songMembersMap.has(part.songId)) {
      songMembersMap.set(part.songId, []);
    }
    const existing = songMembersMap.get(part.songId)!;
    if (!existing.some((m) => m.id === part.memberId)) {
      const member = members.find((m) => m.id === part.memberId);
      if (member) existing.push(member);
    }
  }

  // Filter songs based on search
  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(songSearch.toLowerCase()),
  );
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const tagPlaceholderExamples = [
    trimmedFirstName,
    trimmedLastName,
    trimmedFirstName && trimmedLastName
      ? generateInitials(trimmedFirstName, trimmedLastName)
      : "",
  ].filter(Boolean);
  const tagsPlaceholder =
    tagPlaceholderExamples.length > 0
      ? `Comma-separated tags, e.g. ${tagPlaceholderExamples.join(", ")}`
      : "Comma-separated tags";

  const deleteSong = async (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;

    try {
      await authenticatedFetch(`/api/songs/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Error deleting song:", error);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    try {
      await authenticatedFetch(`/api/members/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Songs Section */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-2xl font-bold mb-4">Songs</h2>

          {/* Search Input */}
          <input
            type="text"
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            placeholder="Search songs..."
            className="w-full px-3 py-2 border rounded mb-3"
          />

          {/* Add Song Button */}
          <button
            onClick={openCreateSongDialog}
            className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Song
          </button>

          <div className="space-y-2">
            {filteredSongs.map((song) => {
              const assignedMembers = songMembersMap.get(song.id) || [];
              return (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <Link
                    href={`/admin/songs/${song.slug}`}
                    className="flex-1 hover:underline"
                  >
                    <div className="flex items-center gap-2">
                      <span>{song.title}</span>
                      {assignedMembers.length > 0 && (
                        <div className="flex gap-1">
                          {assignedMembers.map((member) => (
                            <MemberBadge
                              key={member.id}
                              abbreviation={member.abbreviation}
                              color={member.color}
                              size="sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 ml-2">
                    <button
                      onClick={() => openEditSongDialog(song)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSong(song.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredSongs.length === 0 && songSearch && (
              <p className="text-gray-500 text-sm">
                No songs match &quot;{songSearch}&quot;
              </p>
            )}
            {songs.length === 0 && (
              <p className="text-gray-500 text-sm">No songs yet</p>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-2xl font-bold mb-4">Members</h2>

          {!showMemberForm ? (
            <button
              onClick={openCreateMemberForm}
              className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Add Member
            </button>
          ) : (
            <form
              onSubmit={saveMember}
              className="mb-4 space-y-3 p-4 border rounded"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="px-3 py-2 border rounded"
                  required
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Abbreviation (e.g., CL)
                </label>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={(e) =>
                    setAbbreviation(e.target.value.toUpperCase())
                  }
                  placeholder="Auto-generated from initials"
                  maxLength={3}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={tagsPlaceholder}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Badge Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MEMBER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded border-2 ${
                        selectedColor === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingMemberId ? "Update Member" : "Create Member"}
                </button>
                <button
                  type="button"
                  onClick={resetMemberForm}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.abbreviation}
                  </div>
                  <div>
                    <div>
                      {member.firstName} {member.lastName}
                    </div>
                    {member.tags.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {member.tags.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditMemberForm(member)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-gray-500 text-sm">No members yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Song Dialog */}
      {showAddSongDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowAddSongDialog(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Add New Song</h2>
              <button
                onClick={() => setShowAddSongDialog(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveSong}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Song Title
                </label>
                <input
                  type="text"
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  placeholder="Enter song title"
                  className="w-full px-3 py-2 border rounded"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingSong ? "Update Song" : "Create Song"}
                </button>
                <button
                  type="button"
                  onClick={resetSongDialog}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
