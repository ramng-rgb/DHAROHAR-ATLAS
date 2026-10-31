import React from "react";
import { fetchDocuments, DocumentRecord } from "@/lib/api";
import { ArchiveOCRViewer } from "@/components/ArchiveOCRViewer";

export const revalidate = 0;

export default async function ArchivePage() {
  let documents: DocumentRecord[] = [];
  try {
    documents = await fetchDocuments();
  } catch (err) {
    console.error("Failed to load documents:", err);
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <ArchiveOCRViewer documents={documents} />
    </div>
  );
}
