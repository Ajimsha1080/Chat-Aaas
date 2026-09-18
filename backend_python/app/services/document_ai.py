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
        if not text:
            return ""
        # Strip excessive newlines and control characters
        text = re.sub(r'\r\n|\r', '\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @staticmethod
    def _create_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> List[ProcessedChunk]:
        if not text or not text.strip():
            return []

        chunk_size = max(100, chunk_size)
        overlap = max(0, min(overlap, chunk_size // 2))

        # Split into paragraphs or line blocks
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in text.split('\n') if p.strip()]
        if not paragraphs:
            paragraphs = [text.strip()]

        chunks: List[ProcessedChunk] = []
        current_chunk = ""
        current_header = "General"
        chunk_idx = 0

        for p_strip in paragraphs:
            # Check for markdown heading (e.g. # Title, ## Section)
            is_markdown_heading = bool(re.match(r'^#{1,6}\s+\S+', p_strip))
            if is_markdown_heading:
                clean_head = re.sub(r'^#{1,6}\s*', '', p_strip).strip()
                if current_chunk:
                    chunk_idx += 1
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=current_chunk.strip(),
                        token_count=max(1, len(current_chunk) // 4),
                        section_header=current_header
                    ))
                    current_chunk = ""
                if clean_head:
                    current_header = clean_head
                continue

            # If the paragraph itself exceeds chunk_size, split into sub-segments along sentence boundaries
            segments: List[str] = []
            if len(p_strip) > chunk_size:
                rem = p_strip
                while len(rem) > chunk_size:
                    # Find sentence boundary within chunk_size
                    split_point = rem[:chunk_size].rfind('. ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind('? ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind('! ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind(' ')
                    if split_point == -1:
                        split_point = chunk_size
                    else:
                        split_point += 1
                    segments.append(rem[:split_point].strip())
                    rem = rem[max(0, split_point - overlap):].strip()
                if rem:
                    segments.append(rem)
            else:
                segments = [p_strip]

            # Accumulate segments into chunks
            for seg in segments:
                if not seg:
                    continue
                if current_chunk and (len(current_chunk) + len(seg) + 2 > chunk_size):
                    chunk_idx += 1
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=current_chunk.strip(),
                        token_count=max(1, len(current_chunk) // 4),
                        section_header=current_header
                    ))
                    # Carry over overlap if enabled
                    if overlap > 0 and len(current_chunk) > overlap:
                        overlap_tail = current_chunk[-overlap:].strip()
                        space_idx = overlap_tail.find(' ')
                        if space_idx != -1:
                            overlap_tail = overlap_tail[space_idx + 1:]
                        current_chunk = f"{overlap_tail}\n\n{seg}" if overlap_tail else seg
                    else:
                        current_chunk = seg
                else:
                    current_chunk = f"{current_chunk}\n\n{seg}" if current_chunk else seg

        if current_chunk and current_chunk.strip():
            chunk_idx += 1
            chunks.append(ProcessedChunk(
                chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                chunk_index=chunk_idx,
                content=current_chunk.strip(),
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

