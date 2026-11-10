# TODOアプリ V1 実装計画書

`01_requirements.md` および `02_design.md` に基づき、TODOアプリ（V1）の実装手順を定義する。
既存の `index.ts`（`/` および `/api/db-check`）および `db.ts`（`pool`）に悪影響を与えないよう、小単位の工程で安全に進める。

---

## 1. 全体手順概要

1. **DBテーブル定義のGit保存**: `sql/01_create_todos.sql` の作成
2. **Neon DBでのテーブル作成**: Neon SQL Editorでの手動実行
3. **フロントエンドAPI通信クラスの実装**: `public/todo/todo-api.js` の作成
4. **画面テンプレート（EJS）の実装**: `views/todo/index.ejs` の作成
5. **TODOルーティング・APIの実装**: `src/apps/todo/routes.ts` の作成
6. **`index.ts` への統合**: `express.json()` の追加と `todoRouter` の最小限登録
7. **動作検証・受け入れテスト**: CRUD操作およびエラー挙動の確認

---

## 2. 実装工程詳細

### 工程 1: SQLファイルの作成とGit保存
* **対象ファイル**: `sql/01_create_todos.sql` [新規]
* **作業内容**:
  `todos` テーブル作成用DDLステートメントを記述して保存する。
  ```sql
  CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
* **確認コマンド**:
  ```bash
  cat sql/01_create_todos.sql
  ```
* **期待結果**:
  上記SQL文がターミナルに出力されること。
* **失敗時に最初に見る場所**: `sql/` ディレクトリの存在およびファイルパスの入力ミス。

---

### 工程 2: Neon DBでのSQL手動実行
* **対象環境**: Neon PostgreSQL Console（Web UI）
* **作業内容**:
  1. Neonの Web Console にログインし、「SQL Editor」を開く。
  2. `sql/01_create_todos.sql` のクエリを貼り付けて実行（Run）する。
* **確認コマンド (SQL Editor上)**:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_name = 'todos';
  ```
* **期待結果**:
  検索結果に `todos` レコードが含まれること。
* **失敗時に最初に見る場所**: `.env` 内の `DATABASE_URL` が接続しているNeonプロジェクト/ブランチ名。

---

### 工程 3: API通信クラス（TodoApi）の実装
* **対象ファイル**: `public/todo/todo-api.js` [新規]
* **作業内容**:
  Fetch APIを用いた通信クラス `TodoApi` を作成し、`getAll()`, `create(title)`, `updateStatus(id, isCompleted)`, `delete(id)` の4操作を実装する。
* **確認コマンド**:
  ```bash
  node -c public/todo/todo-api.js
  ```
* **期待結果**:
  構文エラー（SyntaxError）が出力されないこと。
* **失敗時に最初に見る場所**: `public/todo/` ディレクトリの作成有無、JavaScriptのカッコやカンマの閉じ忘れ。

---

### 工程 4: TODO画面テンプレート（EJS）の実装
* **対象ファイル**: `views/todo/index.ejs` [新規]
* **作業内容**:
  * Todo一覧表示、登録フォーム、メッセージ表示領域のHTML構造を記述する。
  * `<script src="/todo/todo-api.js"></script>` を読み込み、DOM操作と `TodoApi` の連携処理を実装する。
* **確認コマンド**:
  ```bash
  ls views/todo/index.ejs
  ```
* **期待結果**:
  該当パスにファイルが存在すること。
* **失敗時に最初に見る場所**: ディレクトリ階層 `views/todo/` の誤り。

---

### 工程 5: APIルーター＆コントローラーの実装
* **対象ファイル**: `src/apps/todo/routes.ts` [新規]
* **作業内容**:
  * `Express.Router()` をインスタンス化し、`./db`（プロジェクトルート）から `{ pool }` をインポートする。
  * 以下のエンドポイントを定義する：
    * `GET /todo` -> `res.render('todo/index')`
    * `GET /api/todo/v1/todos` -> `SELECT * FROM todos ORDER BY created_at DESC`
    * `POST /api/todo/v1/todos` -> 前後空白トリム、1〜100文字検証後 INSERT
    * `PATCH /api/todo/v1/todos/:id` -> ID数値検証、boolean判定後 UPDATE
    * `DELETE /api/todo/v1/todos/:id` -> ID数値検証後 DELETE
  * モジュールをデフォルトエクスポート（`export default router;`）する。
* **確認コマンド**:
  ```bash
  npx tsc --noEmit
  ```
* **期待結果**:
  TypeScriptの型チェックエラーが発生しないこと。
* **失敗時に最初に見る場所**: `db.ts` からのインポートパス（`../../../db` または `../../db`）、SQL文のプレースホルダー（`$1`, `$2`）の指定。

---

### 工程 6: `index.ts` への統合
* **対象ファイル**: `index.ts` [変更]
* **作業内容**:
  1. JSONリクエストパース用に `app.use(express.json());` を追加する。
  2. `src/apps/todo/routes` から `todoRouter` をインポートして追加登録する。

* **`index.ts` のコード記述（変更後全文）**:
  ```typescript
  import express, { Request, Response } from 'express';
  import path from 'path';
  import todoRouter from './src/apps/todo/routes';

  const app = express();
  const port: number = 3000;

  import { pool } from './db';

  app.get('/api/db-check', async (_req, res) => {
    try {
      const result = await pool.query('SELECT 1 AS connection_test');
      res.json({
        status: 'ok',
        database: result.rows[0].connection_test === 1 ? 'connected' : 'error',
      });
    } catch (error) {
      console.error('DB接続確認に失敗しました', error);
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  // ------------------------------
  // Expressの基本設定
  // ------------------------------
  app.use(express.json()); // 追加: JSONリクエスト用
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));

  // ------------------------------
  // ルーティング
  // ------------------------------
  app.use(todoRouter); // 追加: TODOアプリ用ルーター

  // 「/」にアクセスされたときの処理
  app.get('/', (req: Request, res: Response): void => {
    res.send('75/25');
  });

  // ------------------------------
  // サーバー起動
  // ------------------------------
  app.listen(port, (): void => {
    console.log(`Server started: http://localhost:${port}`);
  });
  ```

* **確認コマンド**:
  ```bash
  npm run dev # またはプロジェクト規定の起動コマンド
  ```
* **期待結果**:
  * サーバーが正常起動し、`http://localhost:3000/api/db-check` および `http://localhost:3000/` の既存ルートが以前と同様に応答すること。
* **失敗時に最初に見る場所**: `todoRouter` のインポートパス、ミドルウェアの記述順序。

---

### 工程 7: 動作検証・受け入れテスト
* **対象環境**: ブラウザ / cURL
* **作業内容**:
  1. ブラウザで `http://localhost:3000/todo` にアクセスして画面表示を確認。
  2. 画面上から新規作成、チェックボックスの更新、削除を実行して非同期描画を確認。
  3. バリデーションエラー（空文字送信や101文字以上）の警告表示を確認。
* **確認コマンド (cURL)**:
  ```bash
  # 1. 一覧取得 (REQ-01)
  curl -i http://localhost:3000/api/todo/v1/todos

  # 2. 新規登録 (REQ-02)
  curl -i -X POST http://localhost:3000/api/todo/v1/todos \
    -H "Content-Type: application/json" \
    -d '{"title":"テストタスク"}'

  # 3. バリデーションエラー判定 (REQ-02)
  curl -i -X POST http://localhost:3000/api/todo/v1/todos \
    -H "Content-Type: application/json" \
    -d '{"title":""}'
  ```
* **期待結果**:
  * POST成功時に HTTP 201 と作成データ JSON が返ること。
  * 空文字送信時に HTTP 422 とエラー JSON が返ること。
* **失敗時に最初に見る場所**: ブラウザ DevTools の Console / Network タブ、 Node.js サーバーのコンソールログ。