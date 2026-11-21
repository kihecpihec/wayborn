"""Workflow acceptance: changes must be visible instead of silently weakening contracts."""
import copy
import unittest
from check_baseline import compare, manifest_for, validate


def catalog():
    return {'features': [{'id': 'EXAMPLE', 'status': 'implemented',
                          'goal': 'Keep confirmed rewards unique',
                          'scenarios': [{'id': 'EXAMPLE-01', 'then': 'one reward'}]}]}


class BaselineAcceptance(unittest.TestCase):
    def setUp(self):
        self.original = catalog()
        self.before = manifest_for(self.original)

    def test_unchanged_contract_passes(self):
        validate(self.original, self.before)
        self.assertEqual(compare(self.before, self.before, []), [])

    def test_changed_expectation_cannot_pass_frozen_baseline(self):
        changed = copy.deepcopy(self.original)
        changed['features'][0]['scenarios'][0]['then'] = 'two rewards'
        with self.assertRaises(ValueError):
            validate(changed, self.before)

    def test_updating_manifest_also_requires_review_record(self):
        changed = copy.deepcopy(self.original)
        changed['features'][0]['status'] = 'planned'
        after = manifest_for(changed)
        with self.assertRaises(ValueError):
            compare(self.before, after, [])
        record = {'feature': 'EXAMPLE', 'before': self.before['features']['EXAMPLE']['digest'],
                  'after': after['features']['EXAMPLE']['digest'], 'rationale': 'Scope changed',
                  'impact': 'Release blocked', 'review': 'Second developer must review'}
        self.assertIn('DOWNGRADED', compare(self.before, after, [record])[0])

    def test_removing_a_scenario_requires_review(self):
        changed = copy.deepcopy(self.original)
        changed['features'][0]['scenarios'] = []
        with self.assertRaises(ValueError):
            compare(self.before, manifest_for(changed), [])

    def test_removing_a_feature_requires_review(self):
        with self.assertRaises(ValueError):
            compare(self.before, manifest_for({'features': []}), [])

    def test_unrelated_review_record_cannot_authorize_a_change(self):
        changed = copy.deepcopy(self.original)
        changed['features'][0]['goal'] = 'Different goal'
        with self.assertRaises(ValueError):
            compare(self.before, manifest_for(changed), [
                {'feature': 'EXAMPLE', 'before': 'wrong', 'after': 'wrong',
                 'rationale': 'x', 'impact': 'x', 'review': 'x'}])


if __name__ == '__main__':
    unittest.main()
