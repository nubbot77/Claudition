from __future__ import annotations

import base64
import io
import zipfile

import pytest

from app import resume


def _b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def _docx(paragraphs: list[str]) -> bytes:
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    xml = f'<?xml version="1.0"?><w:document xmlns:w="{ns}"><w:body>{body}</w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml)
    return buf.getvalue()


def _pdf(text: str) -> bytes:
    """A minimal one-page PDF with real text, built by hand (no extra test dependency)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode()
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = io.BytesIO(), []
    out.write(b"%PDF-1.4\n")
    for i, obj in enumerate(objs, 1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return out.getvalue()


def test_docx_paragraphs_become_lines() -> None:
    text = resume.extract("cv.DOCX", _b64(_docx(["Asha Rao, B.Tech CSE 2026", "Projects: expense tracker in React"])))
    assert text == "Asha Rao, B.Tech CSE 2026\nProjects: expense tracker in React"


def test_pdf_text_is_extracted() -> None:
    text = resume.extract("cv.pdf", _b64(_pdf("Built a REST API with FastAPI and PostgreSQL")))
    assert "REST API with FastAPI" in text


def test_txt_is_cleaned_and_capped() -> None:
    text = resume.extract("cv.txt", _b64(("Skills:   Python\x00\n\n\n\n" + "x" * 30000).encode()))
    assert text.startswith("Skills: Python\n\nx") and len(text) == resume.MAX_CHARS


@pytest.mark.parametrize(("name", "size", "message"), [
    ("cv.exe", 0, "PDF, DOCX or TXT"),
    ("cv.docx", 0, "Word document"),
    ("cv.txt", 0, "No text found"),
    ("cv.pdf", resume.MAX_BYTES + 1, "larger than 5 MB"),
], ids=["wrong-type", "broken-docx", "empty", "too-big"])
def test_bad_files_get_a_clear_message(name: str, size: int, message: str) -> None:
    data = b"x" * size if size else b"   "
    with pytest.raises(resume.ResumeError, match=message):
        resume.extract(name, _b64(data))
