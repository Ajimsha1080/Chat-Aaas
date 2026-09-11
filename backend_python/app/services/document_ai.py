import re
import uuid
from typing import List
from app.schemas import DocumentProcessRequest, ProcessedChunk, DocumentProcessResponse

class DocumentAIService:
    @staticmethod
    def process_document(request: DocumentProcessRequest) -> DocumentProcessResponse:
        """
        Extracts, cleans, and semantically chunks raw document text (PDF, DOCX, TXT, FAQ, URLs).
        Normalizes whitespace and breaks text along paragraph/header boundaries.
        """
        # 1. Cleaning & normalization
        cleaned = DocumentAIService._clean_text(request.raw_text)

        # 2. Semantic Chunking
        chunk_size = request.chunk_size or 500
        overlap = request.chunk_overlap or 50
        chunks = DocumentAIService._create_chunks(cleaned, chunk_size, overlap)

        total_tokens = sum(c.token_count for c in chunks)
        preview = cleaned[:200] + "..." if len(cleaned) > 200 else cleaned

        return DocumentProcessResponse(
            success=True,
            title=request.title,
            doc_type=request.doc_type,
            total_chunks=len(chunks),
            total_tokens=total_tokens,
            chunks=chunks,
            cleaned_text_preview=preview
        )

    @staticmethod
    def _clean_text(text: str) -> str:
        # Strip excessive newlines and control characters
        text = re.sub(r'\r\n|\r', '\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def _create_chunks(text: str, chunk_size: int, overlap: int) -> List[ProcessedChunk]:
        paragraphs = text.split('\n\n')
        chunks: List[ProcessedChunk] = []
        current_chunk = ""
        current_header = None
        chunk_idx = 0

        for p in paragraphs:
            p_strip = p.strip()
            if not p_strip:
                continue

            # Detect header like lines (short lines or markdown headings)
            is_header = p_strip.startswith('#') or (len(p_strip) < 60 and not p_strip.endswith('.'))
            if is_header:
                current_header = p_strip.replace('#', '').strip()
                # If we already have accumulated content, create a chunk boundary at the new section
                if current_chunk:
                    chunk_idx += 1
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=current_chunk,
                        token_count=max(1, len(current_chunk) // 4),
                        section_header=current_header
                    ))
                    current_chunk = p_strip
                    continue

            if len(current_chunk) + len(p_strip) <= chunk_size:
                current_chunk += ("\n\n" + p_strip if current_chunk else p_strip)
            else:
                if current_chunk:
                    chunk_idx += 1
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=current_chunk,
                        token_count=max(1, len(current_chunk) // 4),
                        section_header=current_header
                    ))
                current_chunk = p_strip

        if current_chunk:
            chunk_idx += 1
            chunks.append(ProcessedChunk(
                chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                chunk_index=chunk_idx,
                content=current_chunk,
                token_count=max(1, len(current_chunk) // 4),
                section_header=current_header
            ))

        return chunks

    @staticmethod
    def extract_text_from_file_bytes(content_bytes: bytes, filename: str) -> str:
        """
        Extracts raw textual content from uploaded PDF, TXT, MD, CSV, JSON files.
        """
        import io
        ext = filename.split('.')[-1].lower() if '.' in filename else 'txt'

        if ext == 'pdf':
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                extracted_pages = []
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        extracted_pages.append(f"## Page {i + 1}\n{page_text.strip()}")
                if extracted_pages:
                    return "\n\n".join(extracted_pages)
            except Exception as e:
                print(f"[DocumentAIService] PDF extraction fallback: {e}")

        # Fallback to UTF-8 decoding
        try:
            return content_bytes.decode('utf-8', errors='ignore').strip()
        except Exception:
            return ""

