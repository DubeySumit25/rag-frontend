const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface UploadedDocument {
  status: string;
  document_id: string;
  document_name: string;
  pages: number;
  pages_with_text: number;
  chunks_indexed: number;
}

export interface Source {
  source_id: string;
  document_name: string;
  section: string;
  page_number: number | null;
  chunk_id: string;
  source_url: string;
  similarity: number;
  excerpt: string;
}

export interface AnswerResponse {
  question: string;
  document_id: string;
  answer: string;
  sources: Source[];
}

async function readError(response: Response): Promise<string> {
  let detail = "";

  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const value = (body as { detail?: unknown }).detail;
      detail = typeof value === "string" ? value : "";
    }
  } catch {
    // Use the status-based message below when the response is not JSON.
  }

  if (detail) return detail;
  if (response.status === 413) return "This PDF is larger than the 25 MB upload limit.";
  if (response.status === 415) return "Only PDF files are supported.";
  if (response.status === 422) return "The PDF could not be read. Make sure it is a text-based, unprotected PDF.";
  if (response.status === 429) return "The service is receiving too many requests. Please wait a moment and try again.";
  if (response.status >= 500) return "The server could not complete this request. Please try again shortly.";
  return `The request failed (${response.status}). Please review your input and try again.`;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error("Could not reach the assistant. Check your connection and API URL, then try again.");
  }

  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

export function uploadPdf(file: File): Promise<UploadedDocument> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file to continue.");
  }
  if (file.size === 0) throw new Error("This file is empty. Choose a different PDF.");
  if (file.size > MAX_FILE_BYTES) throw new Error("This PDF is larger than the 25 MB upload limit.");

  const formData = new FormData();
  formData.append("file", file);
  return request<UploadedDocument>("/upload", {
    method: "POST",
    body: formData,
  });
}

export function askQuestion(question: string, documentId: string): Promise<AnswerResponse> {
  return request<AnswerResponse>("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, document_id: documentId }),
  });
}
