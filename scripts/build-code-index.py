#!/usr/bin/env python3
"""
Code Index Builder — indexes djpapzin's GitHub repos into a searchable JSON index.
Uses BM25-style keyword search (no embeddings, no OOM).
Run from: ~/.hermes/output/djpapzin-site/
Output: netlify/functions/code-index.json
"""

import json
import os
import subprocess
import hashlib
import re
from pathlib import Path
from collections import Counter

# ─── CONFIG ───
REPOS = [
    # Core projects
    "PapzinAI-Task-Tracker",
    "PapzinCrew-Music-Streaming-Platform",
    "mindmate",
    # AI/ML projects
    "Arc-ZARDIAN",
    "RecallFlow",
    "rag-based-support-agent",
    "RAG-PDF-Chatbot",
    "RAG-SQL-Chatbot",
    "TruthGuard-AI-Fake-News-Detection-with-LLM",
    "ai-based-south-african-id-recognition",
    "case-management-ai",
    "mercor-airtable-pipeline",
    # Creative / media
    "Vocal-Thread",
    "Comment-Scope",
    "ChatSnap-Extractor",
    # Tools
    "mcp-browser-automation",
]

GITHUB_USER = "djpapzin"
CLONE_DIR = Path("/tmp/code-index-repos")
OUTPUT_FILE = Path(__file__).parent.parent / "netlify" / "functions" / "code-index.json"

# File extensions to index
SOURCE_EXTS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json",
    ".yaml", ".yml", ".toml", ".sh", ".bash", ".md", ".txt",
    ".sql", ".dockerfile", ".env.example",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    ".tox", ".mypy_cache", ".pytest_cache", "dist", "build",
    ".next", "target", "vendor", ".terraform",
}

# Files to skip
SKIP_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "poetry.lock", "Pipfile.lock", "requirements.lock",
    ".DS_Store", "Thumbs.db",
}

MAX_FILE_SIZE = 50_000  # Skip files larger than 50KB (likely data/generated)


def clone_repo(repo_name: str) -> Path:
    """Clone or pull a repo."""
    repo_dir = CLONE_DIR / repo_name
    if repo_dir.exists():
        print(f"  Pulling {repo_name}...")
        subprocess.run(
            ["git", "-C", str(repo_dir), "pull", "-q", "--ff-only"],
            capture_output=True, timeout=30
        )
    else:
        print(f"  Cloning {repo_name}...")
        url = f"https://github.com/{GITHUB_USER}/{repo_name}.git"
        subprocess.run(
            ["git", "clone", "-q", "--depth=1", url, str(repo_dir)],
            capture_output=True, timeout=60
        )
    return repo_dir


def should_index(path: Path) -> bool:
    """Check if a file should be indexed."""
    if path.name in SKIP_FILES:
        return False
    if path.suffix.lower() not in SOURCE_EXTS:
        return False
    # Skip if any parent dir is in skip list
    for part in path.parts:
        if part in SKIP_DIRS:
            return False
    return True


def extract_keywords(text: str) -> list[str]:
    """Extract meaningful keywords from code/text."""
    # Remove comments and strings for code files
    words = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]{2,}', text.lower())
    # Filter common noise
    noise = {
        "the", "and", "for", "that", "this", "with", "from", "are", "was",
        "were", "been", "have", "has", "had", "will", "would", "could",
        "should", "can", "may", "might", "shall", "not", "but", "also",
        "just", "only", "very", "more", "most", "some", "any", "all",
        "each", "every", "both", "few", "many", "much", "own", "same",
        "than", "too", "about", "into", "through", "during", "before",
        "after", "above", "below", "between", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how",
        "what", "which", "who", "whom", "these", "those", "such",
        # Python keywords
        "import", "from", "def", "class", "return", "self", "none", "true",
        "false", "print", "len", "str", "int", "float", "list", "dict",
        "set", "tuple", "type", "if", "else", "elif", "for", "while",
        "try", "except", "finally", "with", "as", "yield", "lambda",
        "pass", "break", "continue", "raise", "assert", "global",
        "nonlocal", "del", "in", "is", "and", "or", "not",
        # JS keywords
        "const", "let", "var", "function", "async", "await", "export",
        "default", "null", "undefined", "typeof", "instanceof",
        "console", "module", "require", "new", "delete",
    }
    # Count frequency, keep meaningful words
    counts = Counter(w for w in words if w not in noise and len(w) > 2)
    return [w for w, _ in counts.most_common(50)]


def get_file_summary(content: str, filepath: str, max_lines: int = 50) -> str:
    """Extract a summary from a file — first N lines + docstrings."""
    lines = content.split("\n")

    # Look for docstring at top
    summary_parts = []
    in_docstring = False
    docstring_quotes = None

    for line in lines[:max_lines]:
        stripped = line.strip()

        # Capture docstrings
        if not in_docstring:
            for q in ('"""', "'''", '```'):
                if q in stripped:
                    in_docstring = True
                    docstring_quotes = q
                    after = stripped.split(q, 1)[-1]
                    if after and q in after:
                        # Single-line docstring
                        summary_parts.append(after.split(q)[0].strip())
                        in_docstring = False
                    elif after:
                        summary_parts.append(after.strip())
                    break
        else:
            if docstring_quotes and docstring_quotes in stripped:
                before = stripped.split(docstring_quotes)[0]
                if before.strip():
                    summary_parts.append(before.strip())
                in_docstring = False
            else:
                summary_parts.append(stripped)

        # Also grab comment headers
        if stripped.startswith("#") or stripped.startswith("//"):
            clean = stripped.lstrip("#/").strip()
            if clean and len(clean) > 10:
                summary_parts.append(clean)

    return "\n".join(summary_parts[:20])


def build_index():
    """Build the full code index."""
    CLONE_DIR.mkdir(parents=True, exist_ok=True)

    index = {
        "repos": {},
        "files": [],
        "meta": {
            "total_files": 0,
            "total_repos": len(REPOS),
            "total_size_bytes": 0,
        }
    }

    for repo_name in REPOS:
        print(f"\n{'='*50}")
        print(f"Processing: {repo_name}")
        print(f"{'='*50}")

        try:
            repo_dir = clone_repo(repo_name)
        except Exception as e:
            print(f"  ERROR cloning: {e}")
            continue

        readme_content = ""
        for readme_name in ["README.md", "readme.md", "README.rst", "README"]:
            readme_path = repo_dir / readme_name
            if readme_path.exists() and readme_path.stat().st_size < MAX_FILE_SIZE:
                try:
                    readme_content = readme_path.read_text(errors="replace")[:2000]
                    break
                except:
                    pass

        repo_files = []

        for root, dirs, files in os.walk(repo_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            root_path = Path(root)

            for fname in files:
                fpath = root_path / fname
                rel_path = fpath.relative_to(repo_dir)

                if not should_index(fpath):
                    continue

                try:
                    if fpath.stat().st_size > MAX_FILE_SIZE:
                        continue
                    content = fpath.read_text(errors="replace")
                except:
                    continue

                if not content.strip():
                    continue

                # Build file entry
                file_entry = {
                    "repo": repo_name,
                    "path": str(rel_path),
                    "name": fname,
                    "ext": fpath.suffix,
                    "size": len(content),
                    "keywords": extract_keywords(content),
                    "summary": get_file_summary(content, str(rel_path)),
                    "content": content[:8000],  # Cap at 8KB per file
                    "hash": hashlib.md5(content.encode()).hexdigest(),
                }

                repo_files.append(file_entry)
                index["files"].append(file_entry)
                index["meta"]["total_size_bytes"] += len(content)

        # Store repo summary
        index["repos"][repo_name] = {
            "name": repo_name,
            "readme": readme_content[:1500],
            "file_count": len(repo_files),
            "file_types": dict(Counter(f["ext"] for f in repo_files)),
            "keywords": list(set(
                kw for f in repo_files for kw in f["keywords"][:10]
            ))[:30],
        }

        print(f"  Indexed {len(repo_files)} files")

    index["meta"]["total_files"] = len(index["files"])

    # Write index
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(index, f, indent=2)

    size_mb = OUTPUT_FILE.stat().st_size / 1024 / 1024
    print(f"\n{'='*50}")
    print(f"DONE: {index['meta']['total_files']} files from {index['meta']['total_repos']} repos")
    print(f"Index size: {size_mb:.1f}MB → {OUTPUT_FILE}")
    print(f"{'='*50}")


if __name__ == "__main__":
    build_index()