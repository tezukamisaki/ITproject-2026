# Todoアプリ 要件定義書（V1）

## 1. 目的・対象範囲

### 1.1 目的
既存のExpress＋TypeScript＋EJS構成のWebアプリケーションに対し、標準的なCRUD操作を備えたTodo管理機能（V1）を追加する。
学生個人のNeon PostgreSQL DBおよびVercel環境を活用し、REST APIとFetchを用いた非同期画面操作により、安全かつ円滑なTodo管理を実現する。

### 1.2 対象範囲
* **画面**: `/todo`（既存の `/` および `/api/db-check` は維持）
* **API**: `/api/todo/v1/todos`（GET / POST / PATCH / DELETE）
* **対象機能**: 一覧表示（REQ-01）、新規登録（REQ-02）、完了状態更新（REQ-03）、削除（REQ-04）
* **対象外（V1スコープ外）**: ユーザー認証、優先度設定、フィルタ・絞り込み表示、タイトル変更（PATCHは完了状態のみ更新）
* **環境**: Preview環境・Production環境ともに同一のNeon DBを参照する。個人情報は扱わず、テスト用データ（架空データ）のみを使用する。既存のDB接続設定および `DATABASE_URL` をそのまま再利用する。
* **構成要素の配置**: 既存プロジェクトの具体的なファイル・ディレクトリ配置は未確定のため本文中では「要確認」とし、後続の設計書で定義する。画面からのAPIアクセスは `Fetch` を用い、`TodoApi` クラスへのモジュール分割等も設計書にて決定する。

---

## 2. 機能要件・受け入れ条件

### REQ-01: Todo一覧取得
* **操作**: `/todo` 画面表示時、またはデータ更新時にAPIを呼び出し、Todo一覧を取得・表示する。
* **入力**: なし（クエリパラメータなし）
* **結果**: HTTP 200 OK。作成日時（`created_at`）の降順で整列されたTodo配列を返す。データが0件の場合は `{"data": []}` を返す。
* **エラー**: HTTP 500（DB接続エラー・システムエラー）
* **受け入れ条件**:
  * 登録済みのTodoが作成日時の新しい順に一覧表示されること。
  * 0件の場合はエラーにならず、空配列として正常に表示されること。
* **確認方法**:
  * DevToolsのNetworkタブで `GET /api/todo/v1/todos` のレスポンス（200 OK, `data` 配列）を確認する。
  * DBに複数件・0件の状態でそれぞれ画面を開き、描画結果を確認する。

### REQ-02: Todo新規登録
* **操作**: 画面の入力フォームからタイトルを入力し、登録ボタンを押下する。
* **入力**: JSONボディ `{"title": "文字列"}`
  * 単一フィールド validation: 前後の空白（トリム処理）を除いた文字列が1〜100文字であること。
* **結果**: HTTP 201 Created。作成されたTodoオブジェクト（`id`, `title`, `is_completed`, `created_at`）を返す。
* **エラー**:
  * HTTP 400（JSON構文エラー・リクエストボディ不正）
  * HTTP 422（バリデーションエラー: タイトルが空、または前後トリム後100文字超過）
  * HTTP 500 / 503（DBエラー・サービス利用不可）
* **受け入れ条件**:
  * 1〜100文字のタイトルで登録が成功し、一覧の最上部に即座に反映されること（初期状態 `is_completed: false`）。
  * 前後の半角・全角スペースが自動除去されて保存されること。
  * 空文字や101文字以上の入力でエラーメッセージが表示されること。
* **確認方法**:
  * フォームに「 テストTask 」（前後に空白あり）を入力して送信し、保存値が「テストTask」となることを確認する。
  * 101文字以上の文字列を入力し、422エラーおよび画面上の警告表示を確認する。

### REQ-03: Todo完了状態更新（部分更新）
* **操作**: 一覧上の各Todoのチェックボックス操作により、完了/未完了の状態を変更する。
* **入力**: パスパラメータ `id`（1以上の整数）、JSONボディ `{"is_completed": boolean}`
* **結果**: HTTP 200 OK。更新後のTodoオブジェクトを返す。
* **エラー**:
  * HTTP 400（`id` が1以上の整数でない、またはJSONフォーマット不正）
  * HTTP 422（`is_completed` がboolean型でない等、型バリデーション違反）
  * HTTP 404（指定された `id` のTodoが存在しない）
  * HTTP 500 / 503（DB更新エラー）
* **受け入れ条件**:
  * チェックボックスの切り替えにより、`is_completed` の値が正確に更新されること。
  * 存在しないIDを指定した場合に404エラーとなること。
* **確認方法**:
  * 画面上のチェックボックスを切り替え、`PATCH /api/todo/v1/todos/{id}` に `{ "is_completed": true }` が送信され、画面表示が更新されることを確認する。
  * 存在しないID（例: `99999`）に対するPATCHリクエストを送信し、404レスポンスを確認する。

### REQ-04: Todo削除
* **操作**: 一覧上の各Todoに配置された削除ボタンを押下する。
* **入力**: パスパラメータ `id`（1以上の整数）
* **結果**: HTTP 204 No Content（レスポンス本文なし）。
* **エラー**:
  * HTTP 400（`id` が1以上の整数でない）
  * HTTP 404（指定された `id` のTodoが存在しない）
  * HTTP 500 / 503（DB削除エラー）
* **受け入れ条件**:
  * 対象のTodoがDBおよび画面上から削除されること。
  * 204レスポンス時に本文が含まれないこと。
* **確認方法**:
  * 削除ボタンを押下し、`DELETE /api/todo/v1/todos/{id}` のステータスコードが 204 であること、レスポンスボディが空であることを確認する。
  * 削除後に一覧再取得を行い、該当データが消失していることを確認する。

---

## 3. 共通仕様（データモデル・レスポンスフォーマット・エラー条件）

### 3.1 データ構造（todos テーブル）
| カラム名 | 型 | 制約・初期値 | 説明 |
|---|---|---|---|
| `id` | INTEGER / SERIAL | PRIMARY KEY, 1以上の整数 | Todoの識別子 |
| `title` | VARCHAR(100) | NOT NULL, 1〜100文字 | Todoの件名（トリム済） |
| `is_completed` | BOOLEAN | NOT NULL, Default: `false` | 完了フラグ |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, Default: `CURRENT_TIMESTAMP` | 作成日時 |

### 3.2 成功レスポンスフォーマット
* **GET（一覧）**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "買い物に行く",
        "is_completed": false,
        "created_at": "2026-11-10T05:00:00.000Z"
      }
    ]
  }
POST / PATCH（単一要素）:

JSON
{
  "data": {
    "id": 1,
    "title": "買い物に行く",
    "is_completed": true,
    "created_at": "2026-11-10T05:00:00.000Z"
  }
}
DELETE: ボディなし（HTTP status 204）

3.3 共通エラーレスポンスフォーマット
すべてのエラーレスポンスは以下の共通オブジェクト構造に従う。

JSON
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "ユーザー向けエラーメッセージ",
    "details": []
  }
}
エラー発生条件一覧
HTTP 400 Bad Request:

リクエストボディのJSON構文不正。

パスパラメータ id が1以上の整数でない場合（例: abc, 0, -1）。

HTTP 404 Not Found:

存在しないエンドポイントへのアクセス。

指定した id のTodoが存在しない場合（PATCH / DELETE）。

HTTP 422 Unprocessable Entity:

title のバリデーション違反（前後の空白除去後に0文字、または100文字超過）。

is_completed が boolean 型以外で指定された場合。

HTTP 500 Internal Server Error:

データベース接続失敗、SQL実行失敗、予期せぬ内部エラー。

HTTP 503 Service Unavailable:

DBメンテナンスや接続上限到達等による一時的なサービス利用不可状態。

4. 環境別動作・確認
4.1 環境構成とDB接続
Preview環境（Vercel Preview Deployments）:

本番環境と同じ Neon PostgreSQL DBを参照する。

開発・検証用途として架空のテスト用データのみを取り扱う（個人情報の登録は禁止）。

Production環境（Vercel Production）:

同一の Neon PostgreSQL DBを参照する。

4.2 環境別動作確認手順
既存ルートの動作検証:

/ および /api/db-check が既存通り正常に応答することを確認する。

Preview環境での動作確認:

PR（プルリクエスト）作成時に生成される Vercel Preview URL から /todo にアクセスする。

API (/api/todo/v1/todos) 経由で CRUD（GET/POST/PATCH/DELETE）の動作および各エラー（400, 422, 404）の挙動を確認する。

Production環境での動作確認:

本番デプロイ後、本番URLの /todo から正常にCRUD操作が行えることを確認する。


<ElicitationsGroup message="この要件定義書（01_requirements.md）を確定した後の次のステップを選択してください：">
  <Elicitation label="02_architecture.md（基本設計・ディレクトリ構造・TodoApiクラス）を作成する" query="要件定義書に基づき、docs/todo/02_architecture.md の基本設計書案を作成してください。ファイル配置やTodoApiクラスの設計を含めてください。"/>
  <Elicitation label="03_api_spec.md（詳細なAPI仕様書）を作成する" query="要件定義書に基づき、docs/todo/03_api_spec.md のAPI詳細仕様書案を作成してください。リクエスト・レスポンスの具体的なJSON例を含めてください。"/>
</ElicitationsGroup>