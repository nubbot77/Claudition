"""Text from an uploaded resume (PDF, DOCX, TXT/MD), so the interviewer and judge can read it.

Untrusted input: the file size, page count and output length are capped, and only text is extracted
(no macros, images or embedded files are opened).
"""

from __future__ import annotations

import base64
import binascii
import io
import re
import zipfile
from xml.etree import ElementTree

MAX_BYTES = 5 * 1024 * 1024
MAX_PAGES = 10
MAX_CHARS = 20_000
_WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class ResumeError(ValueError):
    """The file can't be turned into resume text; the message is shown to the user."""


def _pdf_text(data: bytes) -> str:
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ResumeError("This PDF is password-protected. Save an unprotected copy and try again.")
        return "\n".join(page.extract_text() or "" for page in reader.pages[:MAX_PAGES])
    except PdfReadError as exc:
        raise ResumeError(f"Couldn't read this PDF ({exc}).") from exc


def _docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as docx:
            info = docx.getinfo("word/document.xml")
            if info.file_size > 20 * MAX_BYTES:  # zip bomb guard
                raise ResumeError("This document is too large to read.")
            root = ElementTree.fromstring(docx.read(info))
    except (zipfile.BadZipFile, KeyError, ElementTree.ParseError) as exc:
        raise ResumeError("Couldn't read this .docx file. Is it a Word document?") from exc
    paragraphs = []
    for para in root.iter(f"{_WORD_NS}p"):
        paragraphs.append("".join(t.text or "" for t in para.iter(f"{_WORD_NS}t")))
    return "\n".join(paragraphs)


def _clean(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()[:MAX_CHARS]


def extract(filename: str, data_base64: str) -> str:
    try:
        data = base64.b64decode(data_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ResumeError("The upload was corrupted. Try again.") from exc
    if len(data) > MAX_BYTES:
        raise ResumeError("The file is larger than 5 MB.")
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext == "pdf":
        text = _pdf_text(data)
    elif ext == "docx":
        text = _docx_text(data)
    elif ext in ("txt", "md"):
        text = data.decode("utf-8", errors="replace")
    else:
        raise ResumeError("Upload a PDF, DOCX or TXT file.")
    text = _clean(text)
    if len(text) < 30:
        raise ResumeError("No text found in this file. If it's a scanned PDF, paste your resume as text instead.")
    return text
