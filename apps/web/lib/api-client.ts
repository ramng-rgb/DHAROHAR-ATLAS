import type { paths, components } from "./api-schema";

export type SiteBrief = components["schemas"]["SiteBrief"];
export type SiteLight = components["schemas"]["SiteLight"];
export type SiteDetail = components["schemas"]["SiteDetail"];
export type SiteFullDetail = components["schemas"]["SiteFullDetail"];
export type Model3DDetail = components["schemas"]["Model3DDetail"];
export type HotspotDetail = components["schemas"]["HotspotDetail"];
export type ModelSummary = components["schemas"]["ModelSummary"];
export type FolkloreDetail = components["schemas"]["FolkloreDetail"];
export type ObservationDetail = components["schemas"]["ObservationDetail"];
export type NearbySiteItem = components["schemas"]["NearbySiteItem"];
export type RelatedRouteItem = components["schemas"]["RelatedRouteItem"];
export type SiteOGMetadata = components["schemas"]["SiteOGMetadata"];
export type SiteMedia = components["schemas"]["SiteMediaResponse"];
export type Model3D = components["schemas"]["Model3DResponse"];
export type Hotspot = components["schemas"]["HotspotResponse"];
export type GeoJSONFeatureCollection = components["schemas"]["GeoJSONFeatureCollection"];
export type GeoJSONFeature = components["schemas"]["GeoJSONFeature"];
export type FacetResponse = components["schemas"]["FacetResponse"];
export type HistogramBucket = components["schemas"]["HistogramBucket"];
export type RouteResponse = components["schemas"]["RouteResponse"];
export type RouteStopResponse = components["schemas"]["RouteStopResponse"];
export type DocumentResponse = components["schemas"]["DocumentResponse"];
export type OCRLineResponse = components["schemas"]["OCRLineResponse"];
export type SearchResponse = components["schemas"]["SearchResponse"];
export type SearchHit = components["schemas"]["SearchHit"];
export type SearchGroupedResults = components["schemas"]["SearchGroupedResults"];
export type SearchSuggestion = components["schemas"]["SearchSuggestion"];
export type AskArchiveRequest = components["schemas"]["AskArchiveRequest"];
export type AskArchiveResponse = components["schemas"]["AskArchiveResponse"];
export type SourceCitation = components["schemas"]["SourceCitation"];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface SiteQueryParams {
  q?: string;
  site_type?: string[];
  state?: string[];
  dynasty?: string[];
  tag?: string[];
  year_from?: number;
  year_to?: number;
  bbox?: string;
  data_confidence?: string[];
  has_3d_model?: boolean;
  fields?: string;
  limit?: number;
  offset?: number;
}

export interface GeoJSONQueryParams {
  bbox?: string;
  zoom?: number;
  q?: string;
  site_type?: string[];
  state?: string[];
  dynasty?: string[];
  tag?: string[];
  year_from?: number;
  year_to?: number;
  data_confidence?: string[];
  has_3d_model?: boolean;
}

function buildQueryString(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") {
          sp.append(key, String(v));
        }
      });
    } else {
      sp.set(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const err = await res.json();
      if (err.detail) errorDetail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    } catch {
      // ignore
    }
    throw new Error(`API Error ${res.status}: ${errorDetail}`);
  }

  return res.json() as Promise<T>;
}

async function fetchText(path: string, options?: RequestInit): Promise<string> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

export const api = {
  async getSites(params: SiteQueryParams = {}): Promise<SiteBrief[]> {
    const qs = buildQueryString(params);
    return fetchJson<SiteBrief[]>(`/sites${qs}`);
  },

  async getSitesGeoJSON(params: GeoJSONQueryParams = {}, signal?: AbortSignal): Promise<GeoJSONFeatureCollection> {
    const qs = buildQueryString(params);
    return fetchJson<GeoJSONFeatureCollection>(`/sites/geojson${qs}`, { signal });
  },

  async getSite(slug: string): Promise<SiteDetail> {
    return fetchJson<SiteDetail>(`/sites/${encodeURIComponent(slug)}`);
  },

  async getSiteFull(slug: string): Promise<SiteFullDetail> {
    return fetchJson<SiteFullDetail>(`/sites/${encodeURIComponent(slug)}/full`);
  },

  async getSiteModel(slug: string): Promise<Model3DDetail> {
    return fetchJson<Model3DDetail>(`/sites/${encodeURIComponent(slug)}/model`);
  },

  async getSiteCitation(slug: string, format: "bibtex" | "apa" | "ris" | "csl-json" = "bibtex"): Promise<string> {
    return fetchText(`/sites/${encodeURIComponent(slug)}/cite?format=${encodeURIComponent(format)}`);
  },

  async getSiteOG(slug: string): Promise<SiteOGMetadata> {
    return fetchJson<SiteOGMetadata>(`/sites/${encodeURIComponent(slug)}/og`);
  },

  async getFacets(params: SiteQueryParams = {}): Promise<FacetResponse> {
    const qs = buildQueryString(params);
    return fetchJson<FacetResponse>(`/facets${qs}`);
  },

  async getRoutes(): Promise<RouteResponse[]> {
    return fetchJson<RouteResponse[]>("/routes");
  },

  async getRoute(slug: string): Promise<RouteResponse> {
    return fetchJson<RouteResponse>(`/routes/${encodeURIComponent(slug)}`);
  },

  async getDocuments(params: { site_id?: string; language?: string; status?: string; doc_type?: string; limit?: number; offset?: number } = {}): Promise<DocumentResponse[]> {
    const qs = buildQueryString(params);
    return fetchJson<DocumentResponse[]>(`/documents${qs}`);
  },

  async getDocument(id: string): Promise<DocumentResponse> {
    return fetchJson<DocumentResponse>(`/documents/${encodeURIComponent(id)}`);
  },

  async patchOCRLine(lineId: string, text: string, reason?: string, editedBy?: string): Promise<OCRLineResponse> {
    return fetchJson<OCRLineResponse>(`/lines/${encodeURIComponent(lineId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        reason: reason || "Human transcription correction",
        edited_by: editedBy || "Human Editor",
      }),
    });
  },

  async patchTranslation(translationId: string, text: string, reason?: string, editedBy?: string): Promise<any> {
    return fetchJson<any>(`/translations/${encodeURIComponent(translationId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        reason: reason || "Human translation review",
        edited_by: editedBy || "Human Reviewer",
      }),
    });
  },

  async getDocumentVersions(docId: string): Promise<any[]> {
    return fetchJson<any[]>(`/documents/${encodeURIComponent(docId)}/versions`);
  },

  async revertVersion(entityType: "line" | "translation", entityId: string, versionNo: number, reason?: string): Promise<any> {
    return fetchJson<any>("/documents/revert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        version_no: versionNo,
        reason: reason || "Revert to previous revision",
      }),
    });
  },

  async linkEntityToSite(docId: string, entityId: string, siteId: string): Promise<any> {
    return fetchJson<any>(`/documents/${encodeURIComponent(docId)}/entities/${encodeURIComponent(entityId)}/link-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: siteId }),
    });
  },

  async uploadDocument(formData: FormData): Promise<{ document: DocumentResponse; job: any }> {
    const res = await fetch(`${API_BASE_URL}/documents/upload-direct`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  async getJob(jobId: string): Promise<any> {
    return fetchJson<any>(`/jobs/${encodeURIComponent(jobId)}`);
  },

  getJobEventsUrl(jobId: string): string {
    return `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/events`;
  },

  getDocumentExportUrl(docId: string, format: "txt" | "json" | "alto-xml" = "json"): string {
    return `${API_BASE_URL}/documents/${encodeURIComponent(docId)}/export?format=${format}`;
  },

  async search(q: string, limit = 10) {
    return fetchJson<any>(`/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  },

  async searchArchive(params: {
    q: string;
    types?: string[];
    lang?: string[];
    site_id?: string;
    state?: string[];
    year_from?: number;
    year_to?: number;
    limit?: number;
  }): Promise<SearchResponse> {
    const qs = buildQueryString(params);
    return fetchJson<SearchResponse>(`/search${qs}`);
  },

  async searchSuggestions(q: string, limit = 8): Promise<SearchSuggestion[]> {
    return fetchJson<SearchSuggestion[]>(`/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`);
  },

  async askArchive(req: AskArchiveRequest): Promise<AskArchiveResponse> {
    return fetchJson<AskArchiveResponse>("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  },

  getAskStreamUrl(question: string, lang?: string): string {
    const sp = new URLSearchParams({ question });
    if (lang) sp.set("lang", lang);
    return `${API_BASE_URL}/ask/stream?${sp.toString()}`;
  },

  async getSearchAnalytics(limit = 50): Promise<any> {
    return fetchJson<any>(`/search/analytics?limit=${limit}`);
  },
};

export const apiClient = api;

