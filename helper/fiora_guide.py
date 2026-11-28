"""Fiora Counter Guide 配布用の統合サーバー。

画面(同梱)・データ(exe の隣の data/)・LCU の /state を1つのポートで配信する。
  fiora_guide.exe              サーバーを起動してブラウザを開く
  fiora_guide.exe build-data   data/matchups/ から matchups.json と guide-data.js を生成する
"""
import argparse
import mimetypes
import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import build_data
import lcu_helper

HOST = '127.0.0.1'
DEFAULT_PORT = 8000
PORT_ATTEMPTS = 20
APP_FILES = {'index.html', 'editor.html', 'app.js', 'styles.css'}
BUILT_FILES = {'matchups.json', 'guide-data.js'}


def frozen():
    return getattr(sys, 'frozen', False)


def default_app_dir():
    if frozen():
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent.parent


def default_data_dir():
    base = Path(sys.executable).parent if frozen() else Path(__file__).resolve().parent.parent
    return base / 'data'


class DataBuilder:
    """data/matchups/ が出力より新しければ、配信前に再生成する。"""

    def __init__(self, data_dir):
        self.data_dir = data_dir
        self._lock = threading.Lock()
        self._warned = False

    def ensure(self):
        with self._lock:
            try:
                if build_data.is_stale(self.data_dir):
                    count = build_data.build(self.data_dir)
                    print(f'データを再生成しました ({count}件)', flush=True)
                self._warned = False
            except (OSError, ValueError) as error:
                if not self._warned:
                    print(f'データの再生成に失敗しました: {error}', flush=True)
                    self._warned = True


def resolve_file(app_dir, data_dir, url_path):
    """配信してよいファイルだけを返す。それ以外は None。"""
    path = url_path.split('?', 1)[0].split('#', 1)[0]
    if path in ('', '/'):
        path = '/index.html'
    if path.startswith('/data/'):
        base, relative = Path(data_dir), path[len('/data/'):]
    else:
        base, relative = Path(app_dir), path.lstrip('/')
        if relative not in APP_FILES:
            return None
    target = (base / relative).resolve()
    if base.resolve() not in target.parents or not target.is_file():
        return None
    return target


def make_handler(app_dir, data_dir, store, builder):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.split('?', 1)[0] == '/state':
                lcu_helper.send_state(self, store)
                return
            if self.path.split('?', 1)[0].rsplit('/', 1)[-1] in BUILT_FILES:
                builder.ensure()
            target = resolve_file(app_dir, data_dir, self.path)
            if target is None:
                self.send_error(404)
                return
            body = target.read_bytes()
            content_type = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
            self.send_response(200)
            self.send_header('Content-Type', f'{content_type}; charset=utf-8' if content_type.startswith(('text/', 'application/json', 'application/javascript')) else content_type)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    return Handler


def bind_server(handler, port):
    last_error = None
    for candidate in range(port, port + PORT_ATTEMPTS):
        try:
            return ThreadingHTTPServer((HOST, candidate), handler)
        except OSError as error:
            last_error = error
    raise last_error


def run_server(args):
    app_dir = Path(args.app_dir) if args.app_dir else default_app_dir()
    data_dir = Path(args.data_dir) if args.data_dir else default_data_dir()
    if not (data_dir / 'categories.json').is_file() and not (data_dir / 'guide-data.js').is_file():
        print(f'data フォルダが見つかりません: {data_dir}\n実行ファイルと同じ場所に data フォルダを置いてください。', flush=True)
        return 1

    builder = DataBuilder(data_dir)
    builder.ensure()
    store = lcu_helper.StateStore()
    install_dir = args.lol_dir or os.environ.get('LOL_INSTALL_DIR')
    threading.Thread(target=lcu_helper.poll_loop, args=(store, install_dir, data_dir / 'top-hints.json'), daemon=True).start()

    server = bind_server(make_handler(app_dir, data_dir, store, builder), args.port)
    url = f'http://{HOST}:{server.server_address[1]}/'
    print(f'Fiora Counter Guide: {url}\ndata: {data_dir}\nLoL: {install_dir or "自動検出"}\n終了するにはこのウィンドウを閉じてください。', flush=True)
    if not args.no_browser:
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


def run_build(args):
    data_dir = Path(args.data_dir) if args.data_dir else default_data_dir()
    try:
        count = build_data.build(data_dir)
    except (OSError, ValueError) as error:
        print(f'エラー: {error}', file=sys.stderr)
        return 1
    print(f'{count}件のガイドを {data_dir / "matchups.json"} と {data_dir / "guide-data.js"} に出力しました')
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description='Fiora Counter Guide')
    sub = parser.add_subparsers(dest='command')
    serve = sub.add_parser('serve', help='サーバーを起動する(既定)')
    serve.add_argument('--port', type=int, default=DEFAULT_PORT)
    serve.add_argument('--no-browser', action='store_true')
    serve.add_argument('--lol-dir', help='League of Legends のインストール先(省略時は自動検出)')
    serve.add_argument('--app-dir', help=argparse.SUPPRESS)
    for command in (serve, sub.add_parser('build-data', help='data/matchups/ を結合して出力する')):
        command.add_argument('--data-dir', help='data フォルダ(既定: 実行ファイルの隣)')
    argv = sys.argv[1:] if argv is None else argv
    if not argv or argv[0] not in ('serve', 'build-data', '-h', '--help'):
        argv = ['serve', *argv]
    args = parser.parse_args(argv)
    return run_build(args) if args.command == 'build-data' else run_server(args)


if __name__ == '__main__':
    sys.exit(main())
