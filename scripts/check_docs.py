"""Check required milestone files and relative Markdown links, without dependencies."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
required = ["README.md", "dokumentacija/README.md", "dokumentacija/01-projekt.md",
            "dokumentacija/02-scenariji.md", "dokumentacija/03-arhitektura.md",
            "dokumentacija/04-razvoj.md", "dokumentacija/05-oddaja.md",
            "dokumentacija/06-naloge.md", "dokumentacija/mockupi/index.html",
            "prototip/mapa/package-lock.json", ".github/workflows/checks.yml"]
errors = []
for name in required:
    if not (root / name).is_file() or not (root / name).stat().st_size:
        errors.append(f"Missing/empty: {name}")
for path in [root / "README.md", *(root / "dokumentacija").rglob("*.md")]:
    for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", path.read_text()):
        if target.startswith(("https://", "http://", "#", "mailto:")):
            continue
        if not (path.parent / target.split("#")[0]).exists():
            errors.append(f"Broken link: {path.relative_to(root)} -> {target}")
if errors:
    raise SystemExit("\n".join(errors))
print("Required milestone files and relative documentation links OK.")
