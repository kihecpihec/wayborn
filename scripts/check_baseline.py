"""Check frozen contracts and report intentional changes relative to a PR base."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
CATALOG = 'docs/specifications/features.json'
MANIFEST = 'docs/specifications/baseline.json'


def digest(feature):
    payload = json.dumps(feature, sort_keys=True, separators=(',', ':'), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def manifest_for(catalog):
    return {'version': 1, 'features': {
        f['id']: {'digest': digest(f), 'status': f['status'],
                  'scenarios': [s['id'] for s in f['scenarios']]}
        for f in catalog['features']}}


def validate(catalog, manifest):
    if manifest != manifest_for(catalog):
        raise ValueError('Contract differs from frozen baseline. Review the change, add its change record, and deliberately update baseline.json.')


def compare(previous, current, records):
    changes = []
    old, new = previous['features'], current['features']
    for id in sorted(set(old) | set(new)):
        before, after = old.get(id), new.get(id)
        if before == after:
            continue
        old_hash, new_hash = (before or {}).get('digest'), (after or {}).get('digest')
        matches = [r for r in records if r.get('feature') == id and
                   r.get('before') == old_hash and r.get('after') == new_hash]
        if not any(all(isinstance(r.get(k), str) and r[k].strip()
                       for k in ('rationale', 'impact', 'review')) for r in matches):
            raise ValueError(f'{id}: changed contract has no matching explicit review record')
        kind = 'added' if before is None else 'removed' if after is None else 'changed'
        if before and after and before['status'] == 'implemented' and after['status'] != 'implemented':
            kind = 'DOWNGRADED'
        changes.append(f'{id}: {kind}; contract review required')
    return changes


def at_ref(ref, path):
    # ref is an argv entry, never shell interpolation; paths are fixed constants.
    result = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=ROOT,
                            capture_output=True, text=True)
    if result.returncode:
        return None
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-ref')
    parser.add_argument('--milestone', type=int, choices=range(0, 10), help='Fail unless all required features through this milestone are implemented')
    args = parser.parse_args()
    catalog = json.loads((ROOT / CATALOG).read_text())
    current = json.loads((ROOT / MANIFEST).read_text())
    validate(catalog, current)
    records = []
    for path in sorted((ROOT / 'docs/specifications/changes').glob('*.json')):
        records.extend(json.loads(path.read_text())['changes'])
    if args.base_ref:
        subprocess.run(['git', 'rev-parse', '--verify', f'{args.base_ref}^{{commit}}'],
                       cwd=ROOT, check=True, capture_output=True)
        previous = at_ref(args.base_ref, MANIFEST)
        if previous is None:
            old_catalog = at_ref(args.base_ref, CATALOG)
            previous = manifest_for(old_catalog) if old_catalog else None
        if previous:
            for change in compare(previous, current, records):
                print(change)
        else:
            print('Initial baseline adoption: no previous catalog or manifest exists at the supplied base commit.')
    complete = [f for f in catalog['features'] if f['status'] == 'implemented']
    pending = [f for f in catalog['features'] if f['status'] != 'implemented']
    print(f'Contracts: {len(complete)} implemented, {len(pending)} planned.')
    print(f'Scenarios: {sum(len(f["scenarios"]) for f in complete)} under implemented features; '
          f'{sum(len(f["scenarios"]) for f in pending)} under planned features (not proof of passing tests).')
    print('Planned: ' + ', '.join(f['id'] for f in pending))
    print('Frozen specification baseline OK. Run acceptance suites for actual execution results.')
    if args.milestone is not None:
        missing = [f['id'] for f in pending if f['wave'] <= args.milestone]
        if missing:
            raise ValueError(f'M{args.milestone} is NOT complete: ' + ', '.join(missing))
        print(f'M{args.milestone} feature statuses complete; required device/backend evidence still needs review.')


if __name__ == '__main__':
    main()
