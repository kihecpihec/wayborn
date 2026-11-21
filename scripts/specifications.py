"""Validate the feature contract and render its reviewable English catalog."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/specifications/features.json'
TARGET = SOURCE.with_name('FEATURES.md')

def render():
    catalog = json.loads(SOURCE.read_text())
    assert catalog['version'] == 1, 'Unsupported specification version'
    ids, cases = set(), set()
    lines = ['# Feature specifications', '',
             'Generated from `features.json`. Edit the source, then run `python3 scripts/specifications.py --write`.', '',
             'Implemented means the listed acceptance scenarios execute; it does not imply adjacent planned features exist.', '']
    features = catalog['features']
    for f in features:
        for key in ['id', 'title', 'owner', 'goal', 'endResult', 'rules', 'scenarios']:
            assert f.get(key), f'Missing {key}: {f.get("id")}'
        assert f['id'] not in ids, 'Duplicate feature ID'
        ids.add(f['id'])
        assert f['status'] in ['planned', 'implemented'], f'Invalid status: {f["id"]}'
        lines += [f'## {f["id"]}: {f["title"]}', '',
                  f'Owner: {f["owner"]}. Milestone: M{f["wave"]}. Status: **{f["status"]}**.', '',
                  f'Goal: {f["goal"]}', '', 'Rules:', '']
        lines += [f'- {r}' for r in f['rules']]
        lines += ['', f'End result: {f["endResult"]}', '',
                  'Dependencies: ' + (', '.join(f['dependencies']) or 'none') + '.', '', 'Acceptance scenarios:', '']
        for c in f['scenarios']:
            assert c['id'].startswith(f['id']+'-') and c['id'] not in cases, 'Invalid/duplicate scenario ID'
            cases.add(c['id'])
            for key in ['given', 'when', 'then', 'level']:
                assert c.get(key), f'Missing {key}: {c["id"]}'
            assert c['level'] in ['domain','ui','integration','device']
            lines += [f'- **{c["id"]}** ({c["level"]}): Given {c["given"]}; when {c["when"]}; then {c["then"]}.']
        lines += ['']
    for f in features:
        assert set(f['dependencies']) <= ids, f'Unknown dependency: {f["id"]}'
        assert isinstance(f['wave'], int) and 0 <= f['wave'] <= 10, 'Invalid milestone'
        for dep in f['dependencies']:
            dependency = next(item for item in features if item['id'] == dep)
            assert dependency['wave'] <= f['wave'], f'{f["id"]} depends on later milestone: {dep}'
    def visit(id, chain):
        assert id not in chain, 'Cyclic dependencies'
        for dep in next(f for f in features if f['id']==id)['dependencies']:
            visit(dep, chain+[id])
    for id in ids: visit(id, [])
    return '\n'.join(lines).rstrip()+'\n'

if __name__ == '__main__':
    output = render()
    if '--write' in sys.argv:
        TARGET.write_text(output)
    else:
        assert TARGET.exists() and TARGET.read_text() == output, 'Run python3 scripts/specifications.py --write and review the specification diff'
    print('Feature specifications and rendered catalog OK.')
