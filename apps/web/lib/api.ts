const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface SiteBrief {
  id: string;
  name: string;
  slug: string;
  site_type: string;
  era: string;
  era_start_year?: number;
  era_end_year?: number;
  dynasty?: string;
  state: string;
  district?: string;
  latitude: number;
  longitude: number;
  hero_image?: string;
  architectural_style?: string;
  data_confidence: string;
  source: string;
}

export interface Hotspot {
  id: string;
  title: string;
  description: string;
  position_x: number;
  position_y: number;
  position_z: number;
  media_url?: string;
}

export interface Model3D {
  id: string;
  title: string;
  model_url: string;
  format: string;
  poly_count?: number;
  scale_factor: number;
  license: string;
  attribution?: string;
  hotspots: Hotspot[];
}

export interface SiteMedia {
  id: string;
  media_type: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  license: string;
  provenance?: string;
}

export interface FolkloreItem {
  id: string;
  title: string;
  narrative: string;
  language: string;
  source_tradition: string;
  authenticity_status: string;
}

export interface ArchitecturalObservation {
  id: string;
  title: string;
  element_type: string;
  description: string;
  masonry_detail?: string;
  preservation_status: string;
  recorded_by: string;
}

export interface SiteDetail extends SiteBrief {
  description: string;
  significance?: string;
  alternative_names: string[];
  media: SiteMedia[];
  models_3d: Model3D[];
  folklore: FolkloreItem[];
  observations: ArchitecturalObservation[];
}

export interface OCRLine {
  id: string;
  line_index: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  original_text: string;
  translated_text?: string;
  confidence: number;
  language: string;
  is_corrected: boolean;
  version: number;
}

export interface DocumentEntity {
  id: string;
  entity_type: string;
  text: string;
  label?: string;
  confidence: number;
}

export interface DocumentPage {
  id: string;
  page_number: number;
  image_url: string;
  width: number;
  height: number;
  status: string;
  ocr_lines: OCRLine[];
  entities: DocumentEntity[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  language: string;
  document_type: string;
  source_archive: string;
  site_id?: string;
  pages: DocumentPage[];
}

export interface RouteStop {
  id: string;
  stop_order: number;
  narrative: string;
  transit_mode: string;
  travel_note?: string;
  site: SiteBrief;
}

export interface TravelRoute {
  id: string;
  title: string;
  slug: string;
  description: string;
  total_distance_km: number;
  estimated_duration_days: number;
  era_theme: string;
  stops: RouteStop[];
}

export interface SearchResultItem {
  id: string;
  content_type: string;
  content_id: string;
  title: string;
  text_snippet: string;
  rrf_score: number;
  slug?: string;
  latitude?: number;
  longitude?: number;
  era?: string;
  dynasty?: string;
  has_3d?: boolean;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResultItem[];
  grouped: Record<string, SearchResultItem[]>;
}

export interface AskArchiveResponse {
  query: string;
  answer: string;
  citations: Array<{
    index: number;
    title: string;
    content_type: string;
    id: string;
    snippet: string;
  }>;
  confidence: number;
}

export async function fetchSites(params?: Record<string, any>): Promise<SiteBrief[]> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
  }
  const url = `${API_BASE_URL}/sites${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sites");
  return res.json();
}

export async function fetchSiteBySlug(slug: string): Promise<SiteDetail> {
  const res = await fetch(`${API_BASE_URL}/sites/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch site detail");
  return res.json();
}

export async function fetchNearbySites(slug: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/sites/${slug}/nearby`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function fetchDocumentById(id: string): Promise<DocumentRecord> {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch document");
  return res.json();
}

export async function updateOCRLine(
  lineId: string,
  data: { original_text?: string; translated_text?: string }
): Promise<OCRLine> {
  const res = await fetch(`${API_BASE_URL}/documents/ocr-lines/${lineId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update OCR line");
  return res.json();
}

export async function searchArchive(query: string): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function askTheArchive(query: string): Promise<AskArchiveResponse> {
  const res = await fetch(`${API_BASE_URL}/search/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Ask Archive failed");
  return res.json();
}

export async function fetchRoutes(): Promise<TravelRoute[]> {
  const res = await fetch(`${API_BASE_URL}/routes`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch routes");
  return res.json();
}

export async function fetchRouteBySlug(slug: string): Promise<TravelRoute> {
  const res = await fetch(`${API_BASE_URL}/routes/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch route");
  return res.json();
}

export interface JourneyStopHeroMedia {
  url: string;
  caption?: string;
  attribution: string;
  licence: string;
}

export interface LinkedFolkloreItem {
  id: string;
  title: string;
  body_md: string;
  kind: string;
  source?: string;
  is_illustrative?: boolean;
  data_confidence?: string;
}

export interface LinkedObservationItem {
  id: string;
  title: string;
  body_md: string;
  kind: string;
  source?: string;
  is_illustrative?: boolean;
  data_confidence?: string;
}

export interface LinkedDocumentItem {
  id: string;
  title: string;
  doc_type: string;
  source?: string;
  licence?: string;
  page_count: number;
}

export interface JourneyStop {
  id: string;
  site_id: string;
  site_slug: string;
  site_name: string;
  site_name_hi?: string;
  site_name_gu?: string;
  site_type: string;
  state: string;
  district?: string;
  latitude: number;
  longitude: number;
  period_start_year?: number;
  period_end_year?: number;
  era_label?: string;
  stop_order: number;
  arrival_note: string;
  arrival_note_source: string;
  is_illustrative: boolean;
  dwell_seconds: number;
  hero_media: JourneyStopHeroMedia;
  has_3d_model: boolean;
  model_3d_id?: string;
  linked_folklore: LinkedFolkloreItem[];
  linked_observations: LinkedObservationItem[];
  linked_documents: LinkedDocumentItem[];
  leg_distance_km: number;
  cumulative_distance_km: number;
  leg_geometry?: { type: string; coordinates: number[][] };
  bearing_deg?: number;
}

export interface JourneyDetail {
  id: string;
  slug: string;
  title: string;
  title_hi?: string;
  title_gu?: string;
  summary: string;
  summary_hi?: string;
  summary_gu?: string;
  description?: string;
  cover_media_url?: string;
  difficulty: string;
  era_theme?: string;
  total_distance_km: number;
  estimated_duration_days: number;
  full_geometry: { type: string; coordinates: number[][] };
  stops: JourneyStop[];
  total_stops: number;
}

export interface DemoStep {
  id: string | number;
  step_number?: number;
  title: string;
  caption: string;
  route: string;
  target_selector: string;
  action_type: string;
  sample_query?: string;
  sample_question?: string;
  site_slug?: string;
  document_id?: string;
}

export interface DemoScript {
  title: string;
  description: string;
  total_steps: number;
  steps: DemoStep[];
}

export async function fetchJourneyBySlug(slug: string): Promise<JourneyDetail> {
  const res = await fetch(`${API_BASE_URL}/routes/${slug}/journey`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch journey '${slug}'`);
  return res.json();
}

export async function fetchDemoScript(): Promise<DemoScript> {
  const res = await fetch(`${API_BASE_URL}/demo/script`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch demo script");
  return res.json();
}

