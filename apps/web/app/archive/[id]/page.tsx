import React from "react";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { DocumentViewer } from "@/components/archive/DocumentViewer";
import type { Metadata } from "next";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const doc = await apiClient.getDocument(id);
    return {
      title: `${doc.title} — Archival Document Viewer | Dharohar Atlas`,
      description: doc.attribution || "Interactive OCR transcription and translation viewer.",
    };
  } catch {
    return {
      title: "Archival Document Viewer | Dharohar Atlas",
    };
  }
}

export default async function DocumentViewerPage({ params }: PageProps) {
  const { id } = await params;

  let doc = null;
  try {
    doc = await apiClient.getDocument(id);
  } catch (err) {
    console.error("Failed to fetch document", err);
    notFound();
  }

  if (!doc) {
    notFound();
  }

  return (
    <main className="w-full flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <DocumentViewer initialDocument={doc} />
    </main>
  );
}
