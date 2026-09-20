import re
import uuid
from typing import List, Dict, Any, Optional
from app.schemas import DocumentProcessRequest, ProcessedChunk, DocumentProcessResponse

class DocumentAIService:
    @staticmethod
    def process_document(request: DocumentProcessRequest) -> DocumentProcessResponse:
        """
        Extracts, cleans, and semantically chunks raw document text (PDF, DOCX, TXT, FAQ, URLs).
        Preserves Markdown tables, hierarchy, page markers, and embeds parent context headers.
        """
        # 1. Cleaning & normalization
        cleaned = DocumentAIService._clean_text(request.raw_text)

        # 2. Hierarchical Semantic Chunking
        chunk_size = request.chunk_size or 500
        overlap = request.chunk_overlap or 50
        chunks = DocumentAIService._create_chunks(
            text=cleaned,
            doc_title=request.title,
            doc_type=request.doc_type,
            chunk_size=chunk_size,
            overlap=overlap,
            metadata=request.metadata or {}
        )

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
    def _create_chunks(
        text: str,
        doc_title: str = "Document",
        doc_type: str = "document",
        chunk_size: int = 500,
        overlap: int = 50,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[ProcessedChunk]:
        if not text or not text.strip():
            return []

        chunk_size = max(50, chunk_size)
        overlap = max(0, min(overlap, chunk_size // 2))
        meta_base = metadata or {}

        # Parse lines into hierarchical blocks: (content, section_header, parent_header, page_number, is_table)
        raw_lines = [line.strip() for line in text.split('\n')]
        blocks: List[Dict[str, Any]] = []
        current_block_lines: List[str] = []
        current_section = "General"
        parent_section = doc_title or "Overview"
        current_page = 1
        is_in_table = False

        for line in raw_lines:
            if not line:
                if current_block_lines:
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": is_in_table
                    })
                    current_block_lines = []
                    is_in_table = False
                continue

            # Check for page markers
            page_match = re.match(r'^##?\s*Page\s*(\d+)', line, re.I)
            if page_match:
                if current_block_lines:
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": is_in_table
                    })
                    current_block_lines = []
                    is_in_table = False
                current_page = int(page_match.group(1))
                continue

            # Check for Markdown headings
            h1_match = re.match(r'^#\s+(.+)$', line)
            h2_match = re.match(r'^##\s+(.+)$', line)
            h3_match = re.match(r'^###\s+(.+)$', line)

            if h1_match:
                if current_block_lines:
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": is_in_table
                    })
                    current_block_lines = []
                    is_in_table = False
                parent_section = h1_match.group(1).strip()
                current_section = parent_section
                continue

            if h2_match:
                if current_block_lines:
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": is_in_table
                    })
                    current_block_lines = []
                    is_in_table = False
                parent_section = h2_match.group(1).strip()
                current_section = parent_section
                continue

            if h3_match:
                if current_block_lines:
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": is_in_table
                    })
                    current_block_lines = []
                    is_in_table = False
                current_section = f"{parent_section} > {h3_match.group(1).strip()}"
                continue

            # Check for Markdown table rows: starts and ends with '|'
            if line.startswith('|') and line.endswith('|'):
                is_in_table = True
                current_block_lines.append(line)
            else:
                if is_in_table:
                    # End of table
                    blocks.append({
                        "content": "\n".join(current_block_lines),
                        "section": current_section,
                        "parent_section": parent_section,
                        "page_number": current_page,
                        "is_table": True
                    })
                    current_block_lines = []
                    is_in_table = False
                current_block_lines.append(line)

        if current_block_lines:
            blocks.append({
                "content": "\n".join(current_block_lines),
                "section": current_section,
                "parent_section": parent_section,
                "page_number": current_page,
                "is_table": is_in_table
            })

        chunks: List[ProcessedChunk] = []
        current_chunk_text = ""
        current_header = ""
        current_parent = ""
        current_page_num = 1
        chunk_idx = 0

        for block in blocks:
            b_content = block["content"].strip()
            if not b_content:
                continue

            b_sec = block["section"]
            b_parent = block["parent_section"]
            b_page = block["page_number"]
            b_is_table = block["is_table"]

            # If section changed and we have existing chunk content, flush it
            if current_chunk_text and current_header and b_sec != current_header:
                chunk_idx += 1
                prefix = f"[Document: {doc_title} | Section: {current_header}]\n" if current_header != "General" else f"[Document: {doc_title}]\n"
                full_body = f"{prefix}{current_chunk_text.strip()}" if not current_chunk_text.startswith("[Document:") else current_chunk_text.strip()
                chunks.append(ProcessedChunk(
                    chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                    chunk_index=chunk_idx,
                    content=full_body,
                    token_count=max(1, len(full_body) // 4),
                    section_header=current_header,
                    page_number=current_page_num,
                    parent_header=current_parent,
                    metadata={**meta_base, "title": doc_title, "doc_type": doc_type, "section": current_header, "page": current_page_num}
                ))
                current_chunk_text = ""

            current_header = b_sec
            current_parent = b_parent
            current_page_num = b_page

            # If the block is a table, keep it atomic unless larger than 2x chunk_size
            if b_is_table:
                if current_chunk_text and (len(current_chunk_text) + len(b_content) > chunk_size):
                    chunk_idx += 1
                    prefix = f"[Document: {doc_title} | Section: {current_header}]\n" if current_header != "General" else f"[Document: {doc_title}]\n"
                    full_body = f"{prefix}{current_chunk_text.strip()}" if not current_chunk_text.startswith("[Document:") else current_chunk_text.strip()
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=full_body,
                        token_count=max(1, len(full_body) // 4),
                        section_header=current_header,
                        page_number=current_page_num,
                        parent_header=current_parent,
                        metadata={**meta_base, "title": doc_title, "doc_type": doc_type, "section": current_header, "page": current_page_num}
                    ))
                    current_chunk_text = ""

                # Treat table as atomic chunk unit
                chunk_idx += 1
                prefix = f"[Document: {doc_title} | Section: {current_header} | Table]\n"
                full_body = f"{prefix}{b_content}"
                chunks.append(ProcessedChunk(
                    chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                    chunk_index=chunk_idx,
                    content=full_body,
                    token_count=max(1, len(full_body) // 4),
                    section_header=current_header,
                    page_number=current_page_num,
                    parent_header=current_parent,
                    metadata={**meta_base, "title": doc_title, "doc_type": doc_type, "section": current_header, "page": current_page_num, "is_table": True}
                ))
                continue

            # Standard text paragraph splitting
            segments: List[str] = []
            if len(b_content) > chunk_size:
                rem = b_content
                while len(rem) > chunk_size:
                    split_point = rem[:chunk_size].rfind('. ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind('? ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind('! ')
                    if split_point == -1 or split_point < chunk_size // 3:
                        split_point = rem[:chunk_size].rfind('\n')
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
                segments = [b_content]

            for seg in segments:
                if not seg:
                    continue
                if current_chunk_text and (len(current_chunk_text) + len(seg) + 2 > chunk_size):
                    chunk_idx += 1
                    prefix = f"[Document: {doc_title} | Section: {current_header}]\n" if current_header != "General" else f"[Document: {doc_title}]\n"
                    full_body = f"{prefix}{current_chunk_text.strip()}" if not current_chunk_text.startswith("[Document:") else current_chunk_text.strip()
                    chunks.append(ProcessedChunk(
                        chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                        chunk_index=chunk_idx,
                        content=full_body,
                        token_count=max(1, len(full_body) // 4),
                        section_header=current_header,
                        page_number=current_page_num,
                        parent_header=current_parent,
                        metadata={**meta_base, "title": doc_title, "doc_type": doc_type, "section": current_header, "page": current_page_num}
                    ))
                    if overlap > 0 and len(current_chunk_text) > overlap:
                        overlap_tail = current_chunk_text[-overlap:].strip()
                        space_idx = overlap_tail.find(' ')
                        if space_idx != -1:
                            overlap_tail = overlap_tail[space_idx + 1:]
                        current_chunk_text = f"{overlap_tail}\n\n{seg}" if overlap_tail else seg
                    else:
                        current_chunk_text = seg
                else:
                    current_chunk_text = f"{current_chunk_text}\n\n{seg}" if current_chunk_text else seg

        if current_chunk_text and current_chunk_text.strip():
            chunk_idx += 1
            prefix = f"[Document: {doc_title} | Section: {current_header}]\n" if (current_header and current_header != "General") else f"[Document: {doc_title}]\n"
            full_body = f"{prefix}{current_chunk_text.strip()}" if not current_chunk_text.startswith("[Document:") else current_chunk_text.strip()
            chunks.append(ProcessedChunk(
                chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                chunk_index=chunk_idx,
                content=full_body,
                token_count=max(1, len(full_body) // 4),
                section_header=current_header or "General",
                page_number=current_page_num,
                parent_header=current_parent or doc_title,
                metadata={**meta_base, "title": doc_title, "doc_type": doc_type, "section": current_header, "page": current_page_num}
            ))

        if not chunks and text.strip():
            full_body = f"[Document: {doc_title}]\n{text.strip()[:chunk_size]}"
            chunks.append(ProcessedChunk(
                chunk_id=f"chk_{uuid.uuid4().hex[:8]}",
                chunk_index=1,
                content=full_body,
                token_count=max(1, len(full_body) // 4),
                section_header="General",
                page_number=1,
                parent_header=doc_title,
                metadata={**meta_base, "title": doc_title, "doc_type": doc_type}
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


