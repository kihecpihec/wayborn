"""Check required milestone files and relative Markdown links, without dependencies."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
required = ["README.md", "docs/README.md", "docs/01-project.md",
            "docs/02-scenarios.md", "docs/03-architecture.md",
            "docs/04-development.md", "docs/05-submission.md",
            "docs/06-tasks.md", "docs/mockups/index.html",
            "prototype/map/package-lock.json", ".github/workflows/checks.yml",
            "AGENTS.md", "docs/08-development-roadmap.md",
            "docs/specifications/README.md", "docs/specifications/FEATURES.md",
            "docs/specifications/features.json", "docs/specifications/baseline.json",
            "docs/09-product-experience.md", "docs/decisions/README.md",
            "docs/testing/README.md", "docs/milestone-overview.html"]
errors = []
for name in required:
    if not (root / name).is_file() or not (root / name).stat().st_size:
        errors.append(f"Missing/empty: {name}")
for path in [root / "README.md", root / "AGENTS.md", root / "prototype/map/README.md", *(root / "docs").rglob("*.md")]:
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
        if target.startswith(("https://", "http://", "#", "mailto:")):
            continue
        if not (path.parent / target.split("#")[0]).exists():
            errors.append(f"Broken link: {path.relative_to(root)} -> {target}")
if errors:
    raise SystemExit("\n".join(errors))
print("Required milestone files and relative documentation links OK.")
