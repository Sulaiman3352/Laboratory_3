# Laboratory Work 3 — Interacting with a Database through a Web Page

**Student:** Sulayman Seid Ymam  
**Stack:** HTML · CSS · Vanilla JS · Node.js · Express · SQLite (sql.js)

---

## Project Structure

```
lab3/
├── main.html       # Frontend — extends Lab 2 with 3 new DB sections
├── server.js       # Backend — Express server with SQLite database
├── package.json    # Dependencies
└── pic.jpg         # Profile photo (from Lab 2)
```

---

## How to Run

```bash
# 1. Install dependencies (once)
npm install

# 2. Start the server
node server.js

# 3. Open in browser
http://localhost:3000
```

---

## Tasks

### Task 1 — Interacting with the Database through a Web Page

**Goal:** Create a form to add a new user to the database. Handle the form with JavaScript and send the data to the server. On success, show a confirmation message without reloading the page.

**How it was solved:**

A form was added to `main.html` with three fields — Name, Email, and Role. When the user clicks **Add User**, a JavaScript function `addUser()` collects the values, validates that all fields are filled and the email format is correct, then sends the data to the server using `fetch()`:

```js
const res = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, role })
});
```

On the server, the `POST /api/users` route receives the JSON body, runs a basic validation, and executes an SQL INSERT:

```js
DB.run(
  'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
  [name, email, role]
);
```

The server responds with `{ success: true, message: "..." }` or an error object. The frontend reads the response and displays a green success message or a red error message inline — no page reload occurs. Duplicate emails are caught by a `UNIQUE` constraint on the table and return a descriptive error.

---

### Task 2 — Dynamic Display of Data from the Database

**Goal:** Fetch data from the database and display it on the page dynamically using JavaScript.

**How it was solved:**

A users table was added to `main.html`. On page load, `DOMContentLoaded` calls `fetchUsers()`, which sends a GET request to the server:

```js
const res = await fetch('/api/users');
const data = await res.json();
```

The server handles `GET /api/users` by running a `SELECT * FROM users ORDER BY id DESC` query using sql.js, converting the result rows into plain objects, and returning them as JSON:

```js
res.json({ success: true, users: rows });
```

The frontend iterates over `data.users` and builds HTML table rows dynamically, injecting them into a `<tbody>` element via `innerHTML`. A row count status line (e.g. `// 6 rows returned`) is shown below the table. All user-supplied strings are passed through an `escapeHtml()` function before injection to prevent XSS.

The database is also pre-seeded with 6 sample users on server startup so the table is populated immediately on first load.

---

### Task 3 — Filtering Data using JavaScript

**Goal:** Add filter controls to the page. On every change, send a request to the server with the filter parameters. The server executes a filtered SQL query and returns only matching rows.

**How it was solved:**

Two filter controls were added above the table — a text input for searching by name and a dropdown for selecting a role. Both controls have event listeners (`oninput` and `onchange`) that call `fetchUsers()` on every change.

`fetchUsers()` reads the current values of both controls, builds a query string, and sends it with the request:

```js
const params = new URLSearchParams();
if (nameFilter) params.set('name', nameFilter);
if (roleFilter !== 'all') params.set('role', roleFilter);

const res = await fetch('/api/users?' + params.toString());
```

On the server, `GET /api/users` reads the `name` and `role` query parameters and appends `WHERE` clauses to the SQL query conditionally:

```js
if (name) {
  sql += ' AND name LIKE ?';
  params.push(`%${name}%`);
}
if (role && role !== 'all') {
  sql += ' AND role = ?';
  params.push(role);
}
```

This means filtering is always handled server-side with a proper parameterised SQL query — not by filtering an existing array on the client. Both filters work independently and can be combined (e.g. search for "a" within the "Developer" role). If no users match, an empty-state message is shown in the table.

---

## Database Schema

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL UNIQUE,
  role       TEXT    NOT NULL DEFAULT 'Student',
  created_at TEXT    DEFAULT (datetime('now'))
);
```

The database lives in memory (sql.js) and is re-seeded with sample data each time the server starts. For persistent storage across restarts, sql.js can be replaced with a file-based SQLite driver such as `better-sqlite3`.

---

## API Reference

| Method | Route        | Description                              |
|--------|--------------|------------------------------------------|
| GET    | `/`          | Serves `main.html`                       |
| GET    | `/api/users` | Returns users. Accepts `?name=` `?role=` |
| POST   | `/api/users` | Adds a new user. Body: `{name, email, role}` |
# Laboratory_3
