
import { Request, Response } from 'express';
import {
  getAllTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from './todoModel';

// TODO一覧取得
export const listTodos = async (_req: Request, res: Response) => {
  try {
    const todos = await getAllTodos();

    res.json({
      status: 'success',
      data: todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        isCompleted: todo.is_completed,
        createdAt: todo.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(503).json({
      status: 'error',
      code: 'DB_UNAVAILABLE',
      message: 'データベースを利用できません',
      details: [],
    });
  }
};

// TODO登録
export const addTodo = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;

    if (typeof title !== 'string') {
      return res.status(400).json({
        status: 'error',
        code: 'BAD_REQUEST',
        message: 'titleが必要です',
        details: [],
      });
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 1 || trimmedTitle.length > 100) {
      return res.status(422).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'titleは1～100文字で入力してください',
        details: [],
      });
    }

    const todo = await createTodo(trimmedTitle);

    return res.status(201).json({
      status: 'success',
      data: {
        id: todo.id,
        title: todo.title,
        isCompleted: todo.is_completed,
        createdAt: todo.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(503).json({
      status: 'error',
      code: 'DB_UNAVAILABLE',
      message: 'データベースを利用できません',
      details: [],
    });
  }
};

// TODO完了状態の更新
export const changeTodo = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { isCompleted } = req.body;

    if (!Number.isInteger(id) || id < 1 ||
        typeof isCompleted !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        code: 'BAD_REQUEST',
        message: 'IDまたはisCompletedが正しくありません',
        details: [],
      });
    }

    const todo = await updateTodo(id, isCompleted);

    if (!todo) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'TODOが見つかりません',
        details: [],
      });
    }

    return res.json({
      status: 'success',
      data: {
        id: todo.id,
        title: todo.title,
        isCompleted: todo.is_completed,
        createdAt: todo.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(503).json({
      status: 'error',
      code: 'DB_UNAVAILABLE',
      message: 'データベースを利用できません',
      details: [],
    });
  }
};

// TODO削除
export const removeTodo = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        status: 'error',
        code: 'BAD_REQUEST',
        message: 'IDが正しくありません',
        details: [],
      });
    }

    const deleted = await deleteTodo(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'TODOが見つかりません',
        details: [],
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(503).json({
      status: 'error',
      code: 'DB_UNAVAILABLE',
      message: 'データベースを利用できません',
      details: [],
    });
  }
};
