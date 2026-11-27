# 対策データの作成から公開までの手順

エディタでガイドを作り、結合して、GitHub Pagesに公開するまでの流れです。

## 前提

- Node.js がインストールされていること（ビルドスクリプトに使用）
- Python（エディタ用のローカルサーバーに使用。`npx serve` でも可）

## 1. エディタでJSONを作る

1. プロジェクトのルートでサーバーを起動します。

   ```powershell
   python -m http.server 8000
   ```

2. `http://localhost:8000/editor.html` を開きます。Data Dragonを取得するため、インターネット接続が必要です。
3. 「チャンピオン別の対策」または「汎用チャンピオンの対策」を選び、更新日、更新時のパッチ、対策項目を入力します。
4. 「プレビュー」で内容を確認します。更新情報と少なくとも1つの対策項目が必要です。
5. 「JSONを書き出す」で `matchup-<チャンピオンIDまたはカテゴリ組み合わせID>.json` をダウンロードします。

フォーム内容は保存されません。ブラウザーを閉じる前に必ず書き出してください。

## 2. JSONを配置してマージする

1. ダウンロードしたJSONを `data/matchups/` に置きます。同じキーのファイルがあれば上書きします。
2. 次のコマンドで結合します。

   ```powershell
   node scripts/build-local-data.js
   ```

   次のファイルが再生成されます。

   | ファイル | 用途 |
   | --- | --- |
   | `data/matchups.json` | ホスティング時にガイドが読み込む |
   | `data/guide-data.js` | `index.html` を直接開く（`file://`）ときに使う |

   同じキーが複数ファイルにあるとエラーになります。重複しているファイルを整理してください。

## 3. ローカルで確認する

- サーバーあり: `http://localhost:8000/` を開く
- サーバーなし: `index.html` をブラウザで直接開く

一覧から対象のチャンピオンを選び、内容が正しく表示されることを確認します。

## 4. 公開する

1. 次のファイルをコミットします。`data/matchups/` に加えて、結合後の2ファイルも必須です。

   ```powershell
   git add data/matchups data/matchups.json data/guide-data.js
   git commit -m "Add Aatrox matchup guide"
   ```

2. ブランチを push し、`main` 向けにPull Requestを作成します。
3. Pull Requestを `main` にマージします。
4. `main` への push で `.github/workflows/pages.yml` が実行され、GitHub Pagesに自動デプロイされます。
5. Actionsタブでデプロイの成功を確認し、公開URLで表示を確認します。

`editor.html` は公開サイトに含まれません。編集はローカルでのみ行います。

## 運用の流れ（まとめ）

```text
editor.html で作成 → JSONを書き出し → data/matchups/ に配置
  → node scripts/build-local-data.js → ローカルで確認
  → コミット → Pull Request → main にマージ → 自動デプロイ
```

## 困ったとき

- **ガイドに反映されない:** ビルドを実行したか確認してください。`data/matchups.json` と `data/guide-data.js` が更新されている必要があります。
- **公開後も古い表示のまま:** Actionsのデプロイ完了を待ち、ブラウザーのキャッシュを更新してください。
- **`index.html` を直接開くと古い内容:** `data/guide-data.js` が再生成されていません。ビルドを再実行してください。
