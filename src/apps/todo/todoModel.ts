
import { pool } from '../../../db';

// TODO一覧を取得
export const getAllTodos = async () => {
  const result = await pool.query(
    'SELECT * FROM todo_tasks ORDER BY id'
  );
  return result.rows;
};

// TODOを登録
export const createTodo = async (title: string) => {
  const result = await pool.query(
    `INSERT INTO todo_tasks (title)
     VALUES ($1)
     RETURNING *`,
    [title]
  );
  return result.rows[0];
};

// TODOの完了状態を更新
export const updateTodo = async (id: number, isCompleted: boolean) => {
  const result = await pool.query(
    `UPDATE todo_tasks
     SET is_completed = $1
     WHERE id = $2
     RETURNING *`,
    [isCompleted, id]
  );
  return result.rows[0];
};

// TODOを削除
export const deleteTodo = async (id: number) => {
  const result = await pool.query(
    'DELETE FROM todo_tasks WHERE id = $1',
    [id]
  );
  return result.rowCount;
};
