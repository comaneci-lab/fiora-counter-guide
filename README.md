# Fiora Counter Guide

Fiora向けのトップレーン対面ガイドです。試合中のゲームデータは取得せず、GitHub Pagesで静的に公開することを想定しています。

## ローカルで確認する

プロジェクトのルートで静的HTTPサーバーを起動し、表示されたローカルURLをブラウザーで開きます。

```powershell
python -m http.server 8000
```

Data Dragonから最新バージョン、日本語チャンピオン一覧、画像を取得するため、インターネット接続が必要です。

## 対策データを追加する

1. 「チャンピオン別の対策」または「カテゴリ別の汎用対策」を選び、更新日、更新時のパッチ、必要な項目を入力します。
2. チャンピオン別では、必要なら複数の独自カテゴリも割り当てます。Data Dragonタグの自動分類は行いません。
3. 「プレビュー」で内容を確認します。更新情報と少なくとも1項目（チャンピオン別は独自カテゴリのみでも可）が必要です。
4. 「JSONを書き出す」で `matchup-<champion-id>.json` または `category-<category-id>.json` を取得します。
5. ダウンロードしたJSONのキーと値をそれぞれ `data/matchups.json` または `data/category-guides.json` にマージします。同じキーがあれば最新の内容に置き換えます。独自カテゴリの定義は `data/categories.json` で管理します。
6. 変更をコミットしてPull Requestを作成します。静的サイト自体は認証情報を持たず、公開データを直接変更しません。

フォーム内容は送信・自動保存されません。ブラウザーを閉じる前にJSONを書き出してください。

## データ形式

`data/matchups.json` はチャンピオンのData Dragon IDをキーとしたオブジェクト、`data/category-guides.json` は独自カテゴリIDをキーとしたオブジェクトです。いずれも最新の対策のみを保持し、履歴は管理しません。

```json
{
  "ChampionId": {
    "updatedAt": "2026-01-01",
    "patch": "16.1.1",
    "source": "manual",
    "customCategories": ["fighter", "ad-fighter"],
    "runes": "ルーン・シャード",
    "skillOrder": "Q > E > W",
    "build": "アイテム構成",
    "micro1": "レベル1",
    "micro2": "レベル2",
    "micro3to5": "レベル3〜5",
    "micro6": "レベル6",
    "lanePlan": "レーン戦終了まで",
    "macroPlan": "レーン戦終了後"
  }
}
```

カテゴリ別ガイドは同じ項目を持ち、`category-guides.json` のカテゴリIDをキーにします。未記入の任意項目は空文字ではなく省略できます。更新日とパッチバージョンは記録し、Data Dragonのタグは参考情報としてのみ表示します。複数の独自カテゴリに属するチャンピオンは `customCategories` に複数のIDを指定できます。

## GitHub Pages

GitHub Actionsの `Deploy static site to Pages` ワークフローを含みます。GitHubでこのフォルダーを独立リポジトリとして作成し、Settings → PagesでBuild and deploymentのSourceにGitHub Actionsを選択してください。初回push後にActionsがサイトをデプロイします。

## Data Dragon

最新のData Dragonバージョンと日本語チャンピオン一覧をページ読み込み時に取得します。Data Dragonが利用できない場合、ガイドデータは静的ファイルに残りますが、チャンピオン選択と画像は読み込まれません。
