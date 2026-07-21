export interface MusicTrack {
  id: string;
  title: string;
  duration_s: number;
  size_bytes: number;
  ext: string;
}

export interface MusicCatalog {
  generated_at: string;
  tracks: MusicTrack[];
}
