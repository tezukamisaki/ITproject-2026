
import express from 'express';
import {
  listTodos,
  addTodo,
  changeTodo,
  removeTodo,
} from './todoController';

export const todoRouter = express.Router();

// TODO一覧
todoRouter.get('/', listTodos);

// TODO登録
todoRouter.post('/', addTodo);

// TODO完了状態の更新
todoRouter.patch('/:id', changeTodo);

// TODO削除
todoRouter.delete('/:id', removeTodo);
