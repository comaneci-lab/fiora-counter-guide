"""data/matchups/*.json を data/matchups.json と data/guide-data.js にまとめる。
guide-data.js は file:// で index.html を直接開くときに使う。
"""
import json
from pathlib import Path


def _read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def _dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def source_files(data_dir):
    matchups_dir = Path(data_dir) / 'matchups'
    return sorted(matchups_dir.glob('*.json')) + [Path(data_dir) / 'categories.json']


def is_stale(data_dir):
    """出力が無い、または元データより古ければ True。"""
    data_dir = Path(data_dir)
    outputs = [data_dir / 'matchups.json', data_dir / 'guide-data.js']
    if not (data_dir / 'matchups').is_dir():
        return False
    if not all(output.exists() for output in outputs):
        return True
    oldest_output = min(output.stat().st_mtime for output in outputs)
    return any(source.stat().st_mtime > oldest_output for source in source_files(data_dir) if source.exists())


def build(data_dir):
    """結合ファイルを生成し、ガイドの件数を返す。不正なデータは ValueError。"""
    data_dir = Path(data_dir)
    matchups = {}
    sources = {}
    for path in sorted((data_dir / 'matchups').glob('*.json')):
        entries = _read_json(path)
        if not isinstance(entries, dict):
            raise ValueError(f'{path.name}: 最上位がオブジェクトではありません')
        for key, value in entries.items():
            if not isinstance(value, dict):
                raise ValueError(f'{path.name}: "{key}" の値がオブジェクトではありません')
            if key in matchups:
                raise ValueError(f'"{key}" が {sources[key]} と {path.name} で重複しています')
            matchups[key] = value
            sources[key] = path.name

    categories = _read_json(data_dir / 'categories.json')
    (data_dir / 'matchups.json').write_text(f'{_dump(matchups)}\n', encoding='utf-8')
    (data_dir / 'guide-data.js').write_text(
        f'window.FIORA_GUIDE_DATA = {_dump({"categories": categories, "matchups": matchups})};\n',
        encoding='utf-8',
    )
    return len(matchups)
