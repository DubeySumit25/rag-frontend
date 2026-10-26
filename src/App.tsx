import { useRef, useState, type DragEvent, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  FileUp,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { askQuestion, uploadPdf, type AnswerResponse, type UploadedDocument } from "./api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function selectFile(candidate?: File) {
    setError("");
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file to continue.");
      return;
    }
    if (candidate.size === 0) {
      setError("This file is empty. Choose a different PDF.");
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setError("This PDF is larger than the 25 MB upload limit.");
      return;
    }
    setFile(candidate);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const indexed = await uploadPdf(file);
      setDocument(indexed);
      setAnswer(null);
      setQuestion("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The PDF could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!document || trimmedQuestion.length < 3 || asking) return;
    setAsking(true);
    setError("");
    try {
      setAnswer(await askQuestion(trimmedQuestion, document.document_id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The answer could not be generated.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="RAG Document Assistant home">
          <span className="brand-mark"><FileText size={21} strokeWidth={2.1} /></span>
          <span>RAG <strong>Document Assistant</strong></span>
        </a>
        <span className="privacy-note"><ShieldCheck size={15} /> Your documents stay private</span>
      </header>

      <main className="page-content">
        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-dot" /> DOCUMENT INTELLIGENCE</div>
          <h1>Make your documents<br className="desktop-break" /> <span>work for you.</span></h1>
          <p>Upload a PDF and ask questions about its contents.</p>
        </section>

        <section className="workspace" aria-label="Document assistant">
          <div className="section-heading">
            <div className="step-number">01</div>
            <div>
              <h2>Upload a document</h2>
              <p>Start with a text-based PDF, up to 25 MB.</p>
            </div>
            {document && <span className="ready-pill"><Check size={14} /> Indexed</span>}
          </div>

          <div
            className={`dropzone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Choose or drop a PDF file"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInput.current?.click();
              }
            }}
          >
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => selectFile(event.target.files?.[0])}
              onClick={(event) => { (event.target as HTMLInputElement).value = ""; }}
            />
            <div className="upload-icon">{file ? <FileText size={23} /> : <FileUp size={23} />}</div>
            <div className="dropzone-copy">
              {file ? (
                <>
                  <strong className="file-name">{file.name}</strong>
                  <span>{formatFileSize(file.size)} · PDF document</span>
                </>
              ) : (
                <>
                  <strong>Drop your PDF here, or <span>browse files</span></strong>
                  <span>PDF only · Maximum file size 25 MB</span>
                </>
              )}
            </div>
            {file && (
              <button className="text-button" type="button" onClick={(event) => {
                event.stopPropagation();
                setFile(null);
                setError("");
                if (fileInput.current) fileInput.current.value = "";
              }}>
                <RotateCcw size={14} /> Change
              </button>
            )}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <div className="upload-actions">
            <span className="format-hint">Scanned or image-only PDFs aren’t supported yet.</span>
            <button className="primary-button" type="button" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? <><LoaderCircle className="spin" size={17} /> Indexing document…</> : <><Upload size={16} /> Upload &amp; index</>}
            </button>
          </div>

          {uploading && (
            <div className="processing" role="status">
              <span className="processing-indicator"><LoaderCircle className="spin" size={17} /></span>
              <div><strong>Preparing your document</strong><span>Extracting text and indexing passages. This may take a moment.</span></div>
            </div>
          )}

          {document && (
            <div className="document-card">
              <div className="document-file-icon"><FileText size={20} /></div>
              <div className="document-main">
                <strong>{document.document_name}</strong>
                <span className="document-status"><Check size={13} /> Ready to ask questions</span>
              </div>
              <div className="document-stats">
                <div><strong>{document.pages}</strong><span>pages</span></div>
                <div><strong>{document.chunks_indexed}</strong><span>chunks</span></div>
              </div>
              <div className="document-id"><span>DOCUMENT ID</span><code>{document.document_id}</code></div>
            </div>
          )}

          <div className={`question-section ${!document ? "is-locked" : ""}`}>
            <div className="section-heading question-heading">
              <div className="step-number">02</div>
              <div>
                <h2>Ask your document</h2>
                <p>{document ? "Answers are grounded in passages from this document." : "Upload and index a PDF to get started."}</p>
              </div>
            </div>
            <form className="question-form" onSubmit={handleAsk}>
              <label className="visually-hidden" htmlFor="question">Your question</label>
              <textarea
                id="question"
                placeholder="What would you like to know?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={!document || asking}
                maxLength={2000}
                rows={2}
              />
              <div className="question-controls">
                <span>{question.length}/2000</span>
                <button className="primary-button ask-button" type="submit" disabled={!document || question.trim().length < 3 || asking}>
                  {asking ? <><LoaderCircle className="spin" size={16} /> Thinking…</> : <>Ask <ArrowUp size={16} /></>}
                </button>
              </div>
            </form>
          </div>
        </section>

        {asking && (
          <div className="answer-loading" role="status">
            <span className="loading-sparkle"><Sparkles size={17} /></span>
            <div><strong>Finding an answer</strong><span>Searching your document for relevant evidence…</span></div>
            <LoaderCircle className="spin loading-spinner" size={18} />
          </div>
        )}

        {!answer && !asking && document && (
          <div className="empty-answer">
            <span className="empty-icon"><MessageSquareText size={20} /></span>
            <strong>Your answer will appear here</strong>
            <span>Ask a question above to explore this document.</span>
          </div>
        )}

        {answer && (
          <section className="answer-card" aria-live="polite">
            <div className="answer-title">
              <div className="answer-title-icon"><Sparkles size={17} /></div>
              <div><span>ANSWER</span><h2>{answer.question}</h2></div>
            </div>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer.answer}</ReactMarkdown>
            </div>
            <div className="sources-heading">
              <div><h3>Sources</h3><span>{answer.sources.length} {answer.sources.length === 1 ? "passage" : "passages"} from {document?.document_name}</span></div>
            </div>
            {answer.sources.length > 0 ? (
              <div className="sources-list">
                {answer.sources.map((source) => (
                  <details className="source-card" key={source.chunk_id}>
                    <summary>
                      <span className="source-badge">{source.source_id}</span>
                      <span className="source-summary">
                        <strong>{source.document_name || document?.document_name}</strong>
                        <span>{source.page_number ? `Page ${source.page_number}` : source.section || "Document passage"} <i /> Similarity {Number(source.similarity).toFixed(3)}</span>
                      </span>
                      <ChevronDown className="source-chevron" size={17} />
                    </summary>
                    <div className="source-details">
                      <p>{source.excerpt}</p>
                      <span className="chunk-label">SOURCE ID <code>{source.chunk_id}</code></span>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="no-sources">No source passages were returned for this answer.</div>
            )}
          </section>
        )}
        <footer className="footer-note"><span className="footer-dot" /> Answers are generated from your document and may not include every detail.</footer>
      </main>
    </div>
  );
}

export default App;
