"""ローカル専用ヘルパー: League クライアント(LCU)のチャンピオン選択を読み取り、
ロックイン済みの相手チャンピオンを http://127.0.0.1:8001/state で公開する。

LCU への書き込みは行わない。標準ライブラリのみ使用する。
"""
import base64
import json
import os
import re
import ssl
import string
import subprocess
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = '127.0.0.1'
PORT = int(os.environ.get('HELPER_PORT', '8001'))
POLL_SECONDS = 1.0
DEFAULT_INSTALL_DIR = r'C:\Riot Games\League of Legends'
DATA_DRAGON_ROOT = 'https://ddragon.leagueoflegends.com'
DEFAULT_HINTS_PATH = Path(__file__).resolve().parent.parent / 'data' / 'top-hints.json'
PROCESS_CHECK_SECONDS = 15
TOP_HINT_SCORE = 2
TOP_TAG_SCORE = 1
TOP_TAGS = {'Fighter', 'Tank'}


def install_dir_from_product_settings():
    """Riot のメタデータからインストール先を読む。"""
    root = Path(os.environ.get('PROGRAMDATA', r'C:\ProgramData')) / 'Riot Games' / 'Metadata'
    for settings in root.glob('league_of_legends.*/*.product_settings.yaml'):
        try:
            text = settings.read_text(encoding='utf-8')
        except OSError:
            continue
        match = re.search(r'product_install_full_path:\s*["\']?([^"\'\r\n]+)', text)
        if match:
            return match.group(1).strip()
    return None


def install_dir_from_process():
    """起動中の LeagueClientUx の --install-directory 引数からインストール先を読む。"""
    if os.name != 'nt':
        return None
    command = ("(Get-CimInstance Win32_Process -Filter \"Name='LeagueClientUx.exe'\").CommandLine")
    try:
        output = subprocess.run(
            ['powershell', '-NoProfile', '-Command', command],
            capture_output=True, text=True, timeout=10, creationflags=0x08000000,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    match = re.search(r'--install-directory=(?:"([^"]+)"|(\S+))', output)
    return (match.group(1) or match.group(2)) if match else None


def candidate_install_dirs(explicit=None):
    """lockfile を探すインストール先の候補。明示指定があればそれだけを使う。"""
    if explicit:
        return [explicit]
    candidates = [install_dir_from_product_settings(), DEFAULT_INSTALL_DIR]
    candidates += [rf'{letter}:\Riot Games\League of Legends' for letter in string.ascii_uppercase[2:]]
    seen = []
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.append(candidate)
    return seen


def find_lockfile(candidates, use_process=True):
    for candidate in candidates:
        lockfile = read_lockfile(candidate)
        if lockfile:
            return lockfile
    if use_process:
        from_process = install_dir_from_process()
        if from_process:
            return read_lockfile(from_process)
    return None


def read_lockfile(install_dir):
    """lockfile (name:pid:port:password:protocol) から接続情報を返す。なければ None。"""
    try:
        text = (Path(install_dir) / 'lockfile').read_text(encoding='utf-8')
    except OSError:
        return None
    parts = text.strip().split(':')
    if len(parts) < 5:
        return None
    return {'port': int(parts[2]), 'password': parts[3], 'protocol': parts[4]}


def locked_enemy_champion_ids(session):
    """相手チームでロックイン済み(pick が completed)の championId を返す。
    ホバー中のチャンピオンは含めない。"""
    enemy_cells = {player.get('cellId') for player in session.get('theirTeam', [])}
    champion_ids = []
    for group in session.get('actions', []):
        for action in group:
            if (action.get('type') == 'pick'
                    and action.get('completed')
                    and action.get('actorCellId') in enemy_cells
                    and action.get('championId', 0) > 0
                    and action['championId'] not in champion_ids):
                champion_ids.append(action['championId'])
    return champion_ids


def suggest_top(enemies, top_hints):
    """トップらしさのスコアが最大の1体の id を返す。同点なら相手一覧の先頭を選ぶ。"""
    hints = set(top_hints)
    scored = []
    for enemy in enemies:
        score = TOP_HINT_SCORE if enemy['id'] in hints else 0
        if TOP_TAGS & set(enemy.get('tags', [])):
            score += TOP_TAG_SCORE
        scored.append((score, enemy['id']))
    if not scored:
        return None
    best = max(score for score, _ in scored)
    if best == 0:
        return None
    return next(champion_id for score, champion_id in scored if score == best)


def build_state(session, champions_by_key, top_hints):
    enemies = []
    for champion_id in locked_enemy_champion_ids(session):
        champion = champions_by_key.get(str(champion_id))
        if champion:
            enemies.append({'championId': champion_id, **champion})
    return {
        'connected': True,
        'phase': 'champSelect',
        'enemies': enemies,
        'suggested': suggest_top(enemies, top_hints),
    }


def idle_state(connected):
    return {'connected': connected, 'phase': 'idle', 'enemies': [], 'suggested': None}


def load_top_hints(hints_path=DEFAULT_HINTS_PATH):
    try:
        return json.loads(Path(hints_path).read_text(encoding='utf-8')).get('top', [])
    except (OSError, ValueError):
        return []


def load_champions_by_key():
    with urllib.request.urlopen(f'{DATA_DRAGON_ROOT}/api/versions.json', timeout=10) as response:
        version = json.load(response)[0]
    url = f'{DATA_DRAGON_ROOT}/cdn/{version}/data/en_US/champion.json'
    with urllib.request.urlopen(url, timeout=10) as response:
        data = json.load(response)['data']
    return {item['key']: {'id': item['id'], 'tags': item['tags']} for item in data.values()}


class StateStore:
    def __init__(self):
        self._lock = threading.Lock()
        self._state = idle_state(False)

    def set(self, state):
        with self._lock:
            self._state = state

    def get(self):
        with self._lock:
            return self._state


def fetch_session(lockfile):
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    token = base64.b64encode(f"riot:{lockfile['password']}".encode()).decode()
    request = urllib.request.Request(
        f"https://127.0.0.1:{lockfile['port']}/lol-champ-select/v1/session",
        headers={'Authorization': f'Basic {token}'},
    )
    try:
        with urllib.request.urlopen(request, context=context, timeout=5) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None  # チャンピオン選択中ではない
        raise


def poll_loop(store, install_dir, hints_path=DEFAULT_HINTS_PATH):
    """install_dir が None のときは候補とクライアントのプロセスから自動検出する。"""
    top_hints = load_top_hints(hints_path)
    candidates = candidate_install_dirs(install_dir)
    last_process_check = 0.0
    champions = None
    while True:
        try:
            use_process = not install_dir and time.monotonic() - last_process_check >= PROCESS_CHECK_SECONDS
            if use_process:
                last_process_check = time.monotonic()
            lockfile = find_lockfile(candidates, use_process)
            if not lockfile:
                store.set(idle_state(False))
            else:
                if champions is None:
                    champions = load_champions_by_key()
                session = fetch_session(lockfile)
                store.set(idle_state(True) if session is None else build_state(session, champions, top_hints))
        except Exception as error:  # 次回のポーリングで再試行する
            print(f'poll error: {error}', flush=True)
            store.set(idle_state(False))
        time.sleep(POLL_SECONDS)


def origin_allowed(origin):
    return origin.startswith(('http://localhost:', 'http://127.0.0.1:')) or origin in ('http://localhost', 'http://127.0.0.1')


def send_state(handler, store):
    body = json.dumps(store.get()).encode()
    handler.send_response(200)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Cache-Control', 'no-store')
    origin = handler.headers.get('Origin', '')
    if origin_allowed(origin):
        handler.send_header('Access-Control-Allow-Origin', origin)
        handler.send_header('Vary', 'Origin')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def make_handler(store):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != '/state':
                self.send_error(404)
                return
            send_state(self, store)

        def log_message(self, *args):
            pass

    return Handler


def main():
    install_dir = os.environ.get('LOL_INSTALL_DIR')
    store = StateStore()
    threading.Thread(target=poll_loop, args=(store, install_dir), daemon=True).start()
    print(f'http://{HOST}:{PORT}/state (LOL_INSTALL_DIR={install_dir or '自動検出'})', flush=True)
    ThreadingHTTPServer((HOST, PORT), make_handler(store)).serve_forever()


if __name__ == '__main__':
    main()
