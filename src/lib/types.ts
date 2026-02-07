// Core TypeScript interfaces for the Band Parts Tracker

export interface Song {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  abbreviation: string; // e.g., "CL" for Christian Love
  color: string; // Hex color code for badges
  slug: string;
  createdAt: Date;
}

export interface Asset {
  id: string;
  filename: string;
  label: string;
  fileType: 'mp3' | 'pdf';
  storagePath: string;
  downloadUrl: string;
  songId: string;
  uploadedAt: Date;
}

export interface Part {
  id: string;
  songId: string;
  memberId: string;
  type: 'vocal' | 'instrumental';
  textNotes: string;
  assetIds: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
