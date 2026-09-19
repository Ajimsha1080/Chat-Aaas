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

        chunk_size = max(20, chunk_size)
        overlap = max(0, min(overlap, chunk_size // 2))

        # Split into lines first so single-line headings don't swallow subsequent content
        raw_lines = [line.strip() for line in text.split('\n')]
        paragraphs: List[tuple[str, str]] = []
        current_block: List[str] = []
        current_header = "General"

        for line in raw_lines:
            if not line:
                if current_block:
                    paragraphs.append(("\n".join(current_block), current_header))
                    current_block = []
                continue

            heading_match = re.match(r'^#{1,6}\s+(.+)$', line)
            if heading_match:
                if current_block:
                    paragraphs.append(("\n".join(current_block), current_header))
                    current_block = []
                current_header = heading_match.group(1).strip()
            else:
                current_block.append(line)

        if current_block:
            paragraphs.append(("\n".join(current_block), current_header))

        chunks: List[ProcessedChunk] = []
        current_chunk = ""
        current_chunk_header = ""
        chunk_idx = 0

        for p_strip, p_header in paragraphs:
            if not p_strip.strip():
                continue

            # If header changed and we already have accumulated content, flush the previous section chunk
            if current_chunk and current_chunk_header and p_header != current_chunk_header:
                chunk_idx += 1
                chunks.append(ProcessedChunk(
                    chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                    chunk_index=chunk_idx,
                    content=current_chunk.strip(),
                    token_count=max(1, len(current_chunk) // 4),
                    section_header=current_chunk_header
                ))
                current_chunk = ""

            current_chunk_header = p_header

            # If the paragraph itself exceeds chunk_size, split into sub-segments along sentence boundaries
            segments: List[str] = []
            if len(p_strip) > chunk_size:
                rem = p_strip
                while len(rem) > chunk_size:
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
                        section_header=current_chunk_header
                    ))
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
                section_header=current_chunk_header or "General"
            ))

        if not chunks and text.strip():
            chunks.append(ProcessedChunk(
                chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                chunk_index=1,
                content=text.strip()[:chunk_size],
                token_count=max(1, len(text.strip()[:chunk_size]) // 4),
                section_header="General"
            ))

        return chunks

    @staticmethod
    def extract_text_from_file_bytes(content_bytes: bytes, filename: str) -> str:
        """
        Extracts raw textual content from uploaded PDF, DOCX, TXT, MD, CSV, JSON, HTML files.
        Raises an explicit ValueError for binary format failures instead of silently falling back to UTF-8 noise.
        """
        import io
        if not content_bytes:
            raise ValueError(f"Uploaded file '{filename}' is empty.")

        ext = filename.split('.')[-1].lower() if '.' in filename else 'txt'

        if ext == 'pdf':
            # Check for PDF header signature
            if not content_bytes.startswith(b'%PDF-'):
                raise ValueError(f"Invalid PDF file '{filename}': Missing '%PDF-' header signature.")
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content_bytes))
                extracted_pages: List[str] = []
                for i, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    clean_page = page_text.strip()
                    if clean_page:
                        extracted_pages.append(f"## Page {i + 1}\n{clean_page}")

                if not extracted_pages:
                    raise ValueError(f"PDF extraction failed for '{filename}': No extractable text found in document.")

                full_pdf_text = "\n\n".join(extracted_pages)
                # Verify that extracted text is not predominantly non-printable binary garbage
                printable_chars = sum(1 for c in full_pdf_text if c.isprintable() or c in '\n\r\t ')
                if printable_chars / max(1, len(full_pdf_text)) < 0.80 or full_pdf_text.startswith('%PDF-'):
                    raise ValueError(f"PDF extraction failed for '{filename}': Extracted stream contains corrupted or unreadable binary noise.")

                return full_pdf_text
            except ValueError:
                raise
            except Exception as e:
                raise ValueError(f"PDF parsing error for '{filename}': {str(e)}")

        elif ext in ('docx', 'doc'):
            try:
                import docx
                doc = docx.Document(io.BytesIO(content_bytes))
                doc_lines: List[str] = []

                # Extract paragraphs
                for p in doc.paragraphs:
                    p_text = p.text.strip()
                    if p_text:
                        # Convert Heading styles to markdown headings
                        if p.style and p.style.name.startswith('Heading'):
                            doc_lines.append(f"## {p_text}")
                        else:
                            doc_lines.append(p_text)

                # Extract tables
                for table in doc.tables:
                    for row in table.rows:
                        row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_cells:
                            doc_lines.append(" | ".join(row_cells))

                if not doc_lines:
                    raise ValueError(f"DOCX extraction failed for '{filename}': Document contains no extractable text.")

                full_docx_text = "\n\n".join(doc_lines)
                printable_chars = sum(1 for c in full_docx_text if c.isprintable() or c in '\n\r\t ')
                if printable_chars / max(1, len(full_docx_text)) < 0.80:
                    raise ValueError(f"DOCX extraction failed for '{filename}': Extracted content contains corrupted binary noise.")

                return full_docx_text
            except ValueError:
                raise
            except Exception as e:
                raise ValueError(f"DOCX parsing error for '{filename}': {str(e)}")

        elif ext in ('txt', 'md', 'markdown', 'csv', 'json', 'html', 'xml', 'log', 'yaml', 'yml', 'rtf'):
            try:
                text = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text = content_bytes.decode('latin-1')
                except Exception as e:
                    raise ValueError(f"Text decoding failed for '{filename}': {str(e)}")

            printable_chars = sum(1 for c in text if c.isprintable() or c in '\n\r\t ')
            if printable_chars / max(1, len(text)) < 0.80:
                raise ValueError(f"File '{filename}' appears to be an unreadable binary format.")

            return text.strip()

        else:
            raise ValueError(
                f"Unsupported file format '.{ext}' for file '{filename}'. Supported formats: PDF, DOCX, TXT, MD, CSV, JSON, HTML."
            )


