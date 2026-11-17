
class TodoApi {
  constructor(baseUrl = '/api/v1/todos') {
    this.baseUrl = baseUrl;
  }

  async list() {
    const res = await fetch(this.baseUrl);
    const body = await res.json();
    if (!res.ok) throw new Error(body.message);
    return body.data;
  }

  async create(title) {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message);
    return body.data;
  }

  async update(id, isCompleted) {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message);
    return body.data;
  }

  async delete(id) {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message);
    }
  }
}

const api = new TodoApi();
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-title');
const list = document.getElementById('todo-list');
const message = document.getElementById('message');
const emptyMessage = document.getElementById('empty-message');

async function renderTodos() {
  try {
    const todos = await api.list();
    list.replaceChildren();
    emptyMessage.hidden = todos.length !== 0;

    todos.forEach(todo => {
      const li = document.createElement('li');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = todo.isCompleted;
      checkbox.addEventListener('change', async () => {
        try {
          await api.update(todo.id, checkbox.checked);
          await renderTodos();
        } catch (error) {
          message.textContent = error.message;
        }
      });

      const title = document.createElement('span');
      title.textContent = todo.title;
      if (todo.isCompleted) {
        title.style.textDecoration = 'line-through';
      }

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '削除';
      deleteButton.addEventListener('click', async () => {
        try {
          await api.delete(todo.id);
          await renderTodos();
        } catch (error) {
          message.textContent = error.message;
        }
      });

      li.append(checkbox, title, deleteButton);
      list.appendChild(li);
    });
  } catch (error) {
    message.textContent = error.message;
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = '';

  try {
    await api.create(input.value);
    input.value = '';
    await renderTodos();
  } catch (error) {
    message.textContent = error.message;
  }
});

renderTodos();
