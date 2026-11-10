# TODOアプリ V1 設計書

## 1 作るものとファイルの役割

### 作るもの
既存の Express + TypeScript + EJS アプリケーションに対し、`/todo` 画面および REST API (`/api/todo/v1/todos`) を追加実装する。
フロントエンドは Fetch API を用いて `TodoApi` クラス経由で非同期通信を行い、バックエンドは既存の Neon PostgreSQL DB（`db.ts`）を利用して非同期にデータ操作を行う。

### ファイル構成（授業テキストに合わせた配置）
プロジェクトルート直下に主要モジュールが配置されている構成に合わせ、TODO機能に必要なファイルを以下のように割り当てる。

```text
ITproject-2026/
├── db.ts                       # [既存] DB接続モジュール（Neon PostgreSQL接続）
├── index.ts                    # [既存] エントリーポイント（ルーティング・ミドルウェア登録）
├── views/                      # [要確認] EJSテンプレート配置用フォルダ
│   └── todo.ejs                # [新規] TODO画面UIテンプレート
├── public/                     # [要確認] 静的ファイル配置用フォルダ
│   └── js/
│       └── todo-api.js         # [新規] クライアント側API通信クラス（TodoApi）
├── routes/                     # [要確認] ルーティングモジュール配置用フォルダ（またはルート直下に配置）
│   └── todo.ts                 # [新規] APIエンドポイントおよび画面表示のハンドラー
├── sql/                        # [既存] データベーススキーマ・DDL定義用フォルダ
│   └── 01_create_todos.sql     # [新規] todosテーブル作成用DDL
└── docs/
    └── TODO/
        ├── 01_requirements.md  # 要件定義書
        └── 02_design.md        # [本書] 設計書
```

> **注記**: `views/`, `public/`, `routes/` などの各ディレクトリ配置ルールについて、既存コードとの整合性や授業指定の配置規則は **[要確認]** とし、実装フェーズでディレクトリを作成・確認する。

---

## 2 リクエストはどこを通るか

クライアントからのリクエストは、以下のフローを経てDB処理およびレスポンス返却が行われる。

```text
[ Browser / User ]
       │
       │  (1) GET /todo (画面リクエスト)
       ▼
[ index.ts ] ──(ルーティング委譲)──► [ todo.ts (Router) ] ──► [ todo.ejs (Render) ]
       │
       │  (2) Fetch API操作 (POST, GET, PATCH, DELETE)
       ▼
[ public/js/todo-api.js ] (TodoApi クラス)
       │
       │ HTTP Request (/api/todo/v1/todos)
       ▼
[ index.ts ] ──(APIルーティング)──► [ todo.ts (API Handler) ]
                                             │
                                             │ SQL Query (pg / Neon)
                                             ▼
                                      [ db.ts (Neon DB) ]
```

1. **画面表示フロー**:
   ユーザーがブラウザで `/todo` にアクセス ➔ `index.ts` がルーターに振分け ➔ `todo.ejs` をレンダリングしてHTMLを返却。
2. **データ操作フロー**:
   画面上の操作（ボタン押下・チェックボックス変更） ➔ JavaScript内の `TodoApi` インスタンスが `fetch()` を発行 ➔ `index.ts` を経由して `todo.ts` 内のAPIハンドラーに到達 ➔ `db.ts` のクエリ実行関数を呼び出して Neon PostgreSQL を操作 ➔ 結果を JSON で返却。

---

## 3 DBの設計

### テーブル名: `todos`

| カラム名 | データ型 | 制約・初期値 | 役割・説明 |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Todoの一意な識別子（1以上の整数） |
| `title` | VARCHAR(100) | NOT NULL | Todoの本文（トリム済みの1〜100文字） |
| `is_completed` | BOOLEAN | NOT NULL DEFAULT false | 完了状態（`true`: 完了, `false`: 未完了） |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT CURRENT_TIMESTAMP | レコード作成日時 |

### テーブル作成SQL（`sql/01_create_todos.sql`）
```sql
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4 APIの共通ルール

### Base URL
`/api/todo/v1/todos`

### Content-Type
* リクエスト: `Content-Type: application/json` （POST, PATCH の場合）
* レスポンス: `Content-Type: application/json; charset=utf-8` （204 を除く）

### 成功時の共通レスポンス構造
* **単一リソース（POST / PATCH）**: `{"data": { ... }}`
* **複数リソース（GET）**: `{"data": [ ... ]}`

### エラー時の共通レスポンス構造
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの概要メッセージ",
    "details": []
  }
}
```

### ステータスコード一覧
* **200 OK**: 取得・更新成功
* **201 Created**: 新規作成成功
* **204 No Content**: 削除成功（ボディなし）
* **400 Bad Request**: パラメータ不正・JSON構文エラー
* **404 Not Found**: リソース・エンドポイント未存在
* **422 Unprocessable Entity**: バリデーションエラー（文字数・型違反）
* **500 Internal Server Error**: データベース接続・実行エラーなどの内部障害
* **503 Service Unavailable**: DBの一時的停止・ネットワーク不可

---

## 5 機能別API設計

### 5.1 REQ-01 TODO一覧を取得する
* **HTTPメソッド / パス**: `GET /api/todo/v1/todos`
* **処理内容**: `todos` テーブルから全件を `created_at` の降順（DESC）で取得する。
* **クエリパラメータ**: なし
* **成功レスポンス (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 2,
        "title": "レポート提出",
        "is_completed": false,
        "created_at": "2026-11-10T10:00:00.000Z"
      },
      {
        "id": 1,
        "title": "環境構築",
        "is_completed": true,
        "created_at": "2026-11-10T09:00:00.000Z"
      }
    ]
  }
  ```
  ※件数が0件の場合は `{"data": []}` を返す。

### 5.2 REQ-02 TODOを登録する
* **HTTPメソッド / パス**: `POST /api/todo/v1/todos`
* **リクエストボディ**:
  ```json
  {
    "title": " 新しいタスク "
  }
  ```
* **処理内容**:
  1. リクエストボディの `title` の前後空白を除去（`.trim()`）する。
  2. トリム後の文字列長が 1〜100 文字の範囲内であるかチェックする。
  3. DBに INSERT 実行（`is_completed` のデフォルトは `false`）。
* **成功レスポンス (201 Created)**:
  ```json
  {
    "data": {
      "id": 3,
      "title": "新しいタスク",
      "is_completed": false,
      "created_at": "2026-11-10T11:00:00.000Z"
    }
  }
  ```
* **バリデーションエラー (422 Unprocessable Entity)**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "タイトルは1文字以上100文字以内で入力してください。"
    }
  }
  ```

### 5.3 REQ-03 完了状態を変える
* **HTTPメソッド / パス**: `PATCH /api/todo/v1/todos/:id`
* **パスパラメータ**: `:id`（1以上の整数）
* **リクエストボディ**:
  ```json
  {
    "is_completed": true
  }
  ```
* **処理内容**:
  1. `:id` が数値かつ 1 以上か判定（不整合時は 400）。
  2. `is_completed` が boolean型か判定（不整合時は 422）。
  3. 対象IDのレコードを UPDATE 実行。
* **成功レスポンス (200 OK)**:
  ```json
  {
    "data": {
      "id": 3,
      "title": "新しいタスク",
      "is_completed": true,
      "created_at": "2026-11-10T11:00:00.000Z"
    }
  }
  ```
* **対象データなし (404 Not Found)**:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "指定されたIDのTodoが見つかりません。"
    }
  }
  ```

### 5.4 REQ-04 TODOを削除する
* **HTTPメソッド / パス**: `DELETE /api/todo/v1/todos/:id`
* **パスパラメータ**: `:id`（1以上の整数）
* **処理内容**:
  1. `:id` が数値かつ 1 以上か判定（不整合時は 400）。
  2. 対象IDのレコードを DELETE 実行。
* **成功レスポンス (204 No Content)**:
  * レスポンスボディなし（空）
* **対象データなし (404 Not Found)**:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "指定されたIDのTodoが見つかりません。"
    }
  }
  ```

---

## 6 画面とTodoApiの設計

### 6.1 画面設計（`/todo`）
* **テンプレート**: `views/todo.ejs` **[要確認]**
* **主要UI要素**:
  * Todo追加フォーム（`<input type="text" id="todo-title">`, `<button id="add-btn">登録</button>`）
  * メッセージ表示領域（`<div id="error-message">`）
  * Todo一覧リスト（`<ul id="todo-list">`）
    * 各行: チェックボックス（完了切替）、タイトルテキスト、削除ボタン

### 6.2 `TodoApi` クラス設計（`public/js/todo-api.js` **[要確認]**）
クライアント側での Fetch API のカプセル化を担当するクラス。

```javascript
class TodoApi {
  constructor(baseUrl = '/api/todo/v1/todos') {
    this.baseUrl = baseUrl;
  }

  // REQ-01 一覧取得
  async getAll() {
    const res = await fetch(this.baseUrl);
    return this._handleResponse(res);
  }

  // REQ-02 新規登録
  async create(title) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    return this._handleResponse(res);
  }

  // REQ-03 状態更新
  async updateStatus(id, isCompleted) {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isCompleted })
    });
    return this._handleResponse(res);
  }

  // REQ-04 削除
  async delete(id) {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
    if (res.status === 204) return true;
    return this._handleResponse(res);
  }

  // レスポンス共通処理
  async _handleResponse(res) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'エラーが発生しました');
    }
    return data;
  }
}
```

---

## 7 エラーはどこで処理するか

エラー処理は「サーバー側」と「クライアント側」の2段階で明確に責務を分離する。

```text
[ DB / Async Operation ]
           │ (例外発生 / SQL失敗)
           ▼
[ API Routing / Controller (todo.ts) ]
           │ ➔ try-catch で捕捉
           │ ➔ ステータスコード（400/404/422/500）と統一JSONフォーマットを生成してレスポンス
           ▼
[ TodoApi (todo-api.js) ]
           │ ➔ res.ok を検証し、false の場合は Exception を throw
           ▼
[ 画面イベントハンドラー (todo.ejs Script) ]
           │ ➔ catch ブロックで例外を受信
           │ ➔ 画面上のエラーメッセージ表示領域（#error-message）に赤字で通知
```

1. **サーバー側のエラー処理 (`todo.ts`)**:
   * すべてのアシンクロナス処理を `try-catch` でブロックする。
   * パラメータ検証違反は `400` または `422` を返却する。
   * DB接続エラーや例外は `500` （または Neon 接続不可時 `503`）としてキャッチし、統一構造の JSON レスポンスを返却する。
2. **クライアント側のエラー処理 (`todo-api.js` / DOMイベント)**:
   * `TodoApi` 内でレスポンスの `res.ok` を評価し、エラー時はサーバーからの `error.message` を取得してエラーを発生させる。
   * 画面側のイベントハンドラーでエラーを捕捉し、ユーザーが認識できる形で画面に赤字で警告メッセージを表示する。

---

## 8 実装への注意事項

### 8.1 `index.ts` の追記は最低限にする
既存の `index.ts` のコードを汚さずメンテナンス性を確保するため、TODO機能に関する処理は別ファイル（ルーターモジュール）に集約し、`index.ts` への変更はルーターの読み込み・登録の最低限に抑える。

**`index.ts` への追記イメージ**:
```typescript
import todoRouter from './routes/todo'; // [要確認] パスは実際の構成に合わせる

// 既存の / および /api/db-check の設定はそのまま維持

// TODO機能のルーターをミドルウェアとして登録
app.use(todoRouter);
```

### 8.2 その他の注意事項
* **既存エンドポイントの保護**: `/` および `/api/db-check` の既存動作に一切影響を与えないこと。
* **`DATABASE_URL` と接続の再利用**: `db.ts` で定義されている既存の Neon PostgreSQL 接続設定をそのまま利用し、二重に接続インスタンスを生成しないこと。
* **文字列のサニタイズ・トリム**: `title` の保存時は必ず前後空白を除去（`trim()`）し、XSS攻撃を防ぐためEJS出力時（`<%= %>`）の自動エスケープを活用すること。