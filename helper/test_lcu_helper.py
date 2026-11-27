import unittest

from lcu_helper import build_state, locked_enemy_champion_ids, suggest_top

CHAMPIONS = {
    '266': {'id': 'Aatrox', 'tags': ['Fighter', 'Tank']},
    '64': {'id': 'LeeSin', 'tags': ['Fighter', 'Assassin']},
    '103': {'id': 'Ahri', 'tags': ['Mage', 'Assassin']},
}


def session(actions):
    return {'theirTeam': [{'cellId': 5}, {'cellId': 6}], 'actions': [actions]}


class LockedEnemyTests(unittest.TestCase):
    def test_ignores_hover_and_allies(self):
        result = locked_enemy_champion_ids(session([
            {'type': 'pick', 'completed': True, 'actorCellId': 5, 'championId': 266},
            {'type': 'pick', 'completed': False, 'actorCellId': 6, 'championId': 103},
            {'type': 'pick', 'completed': True, 'actorCellId': 0, 'championId': 64},
            {'type': 'ban', 'completed': True, 'actorCellId': 5, 'championId': 64},
        ]))
        self.assertEqual(result, [266])


class SuggestTopTests(unittest.TestCase):
    def test_unique_best_wins(self):
        enemies = [{'id': 'Aatrox', 'tags': ['Fighter']}, {'id': 'Ahri', 'tags': ['Mage']}]
        self.assertEqual(suggest_top(enemies, ['Aatrox']), 'Aatrox')

    def test_tie_or_zero_returns_none(self):
        tie = [{'id': 'A', 'tags': ['Fighter']}, {'id': 'B', 'tags': ['Tank']}]
        self.assertIsNone(suggest_top(tie, []))
        self.assertIsNone(suggest_top([{'id': 'Ahri', 'tags': ['Mage']}], []))


class BuildStateTests(unittest.TestCase):
    def test_state(self):
        state = build_state(session([
            {'type': 'pick', 'completed': True, 'actorCellId': 5, 'championId': 266},
        ]), CHAMPIONS, ['Aatrox'])
        self.assertEqual(state['suggested'], 'Aatrox')
        self.assertEqual(state['enemies'][0]['id'], 'Aatrox')


if __name__ == '__main__':
    unittest.main()
