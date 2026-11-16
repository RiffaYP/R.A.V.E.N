import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "../lib";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import type { ShelfItem } from "../electron";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  due?: string;
  notified?: boolean;
}

interface Clip {
  id: number;
  text: string;
  pinned?: boolean;
}

export default function Tools() {
  const [tab, setTab] = useState<"todo" | "clip" | "shelf">("todo");
  return (
    <div className="page tools has-head">
      <PageHeader
        title="Alat"
        right={
          <div className="tools-tabs">
            <button className={tab === "todo" ? "on" : ""} onClick={() => setTab("todo")}>To-do</button>
            <button className={tab === "clip" ? "on" : ""} onClick={() => setTab("clip")}>Clipboard</button>
            <button className={tab === "shelf" ? "on" : ""} onClick={() => setTab("shelf")}>Shelf</button>
          </div>
        }
      />
      <div className="tools-body">
        {tab === "todo" && <Todos />}
        {tab === "clip" && <Clipboard />}
        {tab === "shelf" && <Shelf />}
      </div>
    </div>
  );
}

function Todos() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("raven.todos", []);
  const [draft, setDraft] = useState("");
  const [due, setDue] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const done = todos.filter((t) => t.done).length;
  const total = todos.length;

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setTodos((prev) => {
        const dueNow = prev.filter((t) => !t.done && !t.notified && t.due && new Date(t.due).getTime() <= now);
        if (dueNow.length === 0) return prev;
        for (const t of dueNow) window.raven.notifyTodo({ text: t.text, due: new Date(t.due as string).getTime() });
        const ids = new Set(dueNow.map((d) => d.id));
        return prev.map((t) => (ids.has(t.id) ? { ...t, notified: true } : t));
      });
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setTodos([...todos, { id: Date.now(), text: t, done: false, due: due || undefined, notified: false }]);
    setDraft("");
    setDue("");
  };
  const startEdit = () => {
    const first = todos.find((t) => !t.done) ?? todos[0];
    if (first) {
      setEditId(first.id);
      setDraft(first.text);
      setDue(first.due ?? "");
    }
  };
  const commitEdit = () => {
    const t = draft.trim();
    if (editId != null && t) {
      setTodos(todos.map((x) => (x.id === editId ? { ...x, text: t, due: due || undefined, notified: false } : x)));
    }
    setEditId(null);
    setDraft("");
    setDue("");
  };
  const remove = (id: number) => setTodos(todos.filter((x) => x.id !== id));
  const toggle = (id: number) => setTodos(todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const editing = editId != null;
  const ordered = [...todos].sort(
    (a, b) => Number(!!a.due && !a.done) - Number(!!b.due && !b.done) || (a.due ?? "").localeCompare(b.due ?? "")
  );

  return (
    <div className="todo-page">
      <div className="todo-head">
        <div>
          <div className="todo-title">Todo List</div>
          <div className="todo-count">{done}/{total || 0}</div>
          <div className="todo-caption">Task Done Today</div>
        </div>
        <div className="todo-actions">
          <button className="todo-action" onClick={editing ? commitEdit : startEdit}>
            <span className="todo-action-ico"><Icon name={editing ? "check" : "edit"} size={12} /></span>
            {editing ? "Save Task" : "Edit Task"}
          </button>
          <button className="todo-action primary" onClick={() => { setEditId(null); add(); }}>
            <span className="todo-action-ico"><Icon name="plus" size={12} /></span>
            Add Task
          </button>
        </div>
      </div>

      {!editing && (
        <div className="todo-input-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Tugas baru…"
          />
          <input
            type="time"
            className="todo-due-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            title="Waktu pengingat (opsional)"
          />
        </div>
      )}

      {editing && (
        <div className="todo-input-row">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitEdit()}
            placeholder="Ubah tugas…"
          />
          <input
            type="time"
            className="todo-due-input"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            title="Waktu pengingat (opsional)"
          />
        </div>
      )}

      <div className="todo-list">
        {total === 0 && <div className="tools-empty">Belum ada tugas</div>}
        {ordered.map((t) => (
          <div key={t.id} className={`todo-item ${t.done ? "done" : ""}`}>
            <button className="todo-check" onClick={() => toggle(t.id)} aria-label="Selesai">
              {t.done ? <Icon name="check" size={11} /> : null}
            </button>
            <span className="todo-text">{t.text}</span>
            {t.due && <span className={`todo-due ${t.notified && !t.done ? "past" : ""}`}>{t.due}</span>}
            <button className="todo-del" onClick={() => remove(t.id)} aria-label="Hapus"><Icon name="trash" size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const MAX_CLIPS = 20;
const MAX_CLIP_LEN = 2000;

function sortClips(items: Clip[]) {
  return [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.id - a.id);
}

function Clipboard() {
  const [items, setItems] = useLocalStorage<Clip[]>("raven.clips", []);
  const [text, setText] = useState("");
  const lastSeen = useRef<string | null>(null);

  const insert = (value: string) => {
    const t = value.trim();
    if (!t || t.length > MAX_CLIP_LEN) return;
    setItems((prev) => {
      if (prev.some((x) => x.text === t)) return prev;
      const pinned = prev.filter((x) => x.pinned);
      const rest = [{ id: Date.now(), text: t }, ...prev.filter((x) => !x.pinned)].slice(0, MAX_CLIPS);
      return [...pinned, ...rest];
    });
  };

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const v = await window.raven.readClipboard();
        if (!alive || typeof v !== "string") return;
        const t = v.trim();
        if (!t || t === lastSeen.current) return;
        lastSeen.current = t;
        insert(t);
      } catch {}
    };
    poll();
    const id = window.setInterval(poll, 2000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const add = () => {
    insert(text);
    setText("");
  };
  const copy = async (value: string) => {
    try {
      await window.raven.writeClipboard(value);
    } catch {}
  };
  const togglePin = (id: number) =>
    setItems((prev) => sortClips(prev.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))));
  const remove = (id: number) => setItems((prev) => prev.filter((x) => x.id !== id));

  const ordered = sortClips(items);

  return (
    <div className="tools-pane">
      <div className="tools-input">
        <input value={text} placeholder="Simpan teks…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} title="Simpan teks"><Icon name="plus" size={15} /></button>
      </div>
      <div className="tools-list">
        {ordered.length === 0 && <div className="tools-empty">Belum ada teks tersimpan</div>}
        {ordered.map((c) => (
          <div key={c.id} className={`tools-item ${c.pinned ? "pinned" : ""}`}>
            <span className="tools-clip" title={c.text}>{c.text}</span>
            <button className={`tools-del ${c.pinned ? "on" : ""}`} onClick={() => togglePin(c.id)} title={c.pinned ? "Lepas pin" : "Pin"}>
              <Icon name="pin" size={12} />
            </button>
            <button className="tools-del" onClick={() => copy(c.text)} title="Salin"><Icon name="copy" size={12} /></button>
            <button className="tools-del" onClick={() => remove(c.id)} title="Hapus"><Icon name="trash" size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtSize(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function Shelf() {
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let alive = true;
    window.raven.shelfGet().then((list) => {
      if (alive) setItems(list);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const drop = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const paths = Array.from(files)
      .map((f) => window.raven.getPathForFile(f))
      .filter(Boolean);
    if (paths.length === 0) return;
    setItems(await window.raven.shelfAdd(paths));
  };
  const remove = async (p: string) => setItems(await window.raven.shelfRemove(p));
  const clear = async () => setItems(await window.raven.shelfClear());

  return (
    <div
      className={`tools-pane shelf-drop ${hover ? "hover" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => { e.preventDefault(); setHover(false); drop(e.dataTransfer.files); }}
    >
      {items.length === 0 ? (
        <div className="tools-empty shelf-empty">
          <Icon name="file" size={20} />
          <span>Seret file ke sini</span>
        </div>
      ) : (
        <>
          <div className="shelf-head">
            <span>{items.length} file</span>
            <button className="shelf-clear" onClick={clear}>Bersihkan</button>
          </div>
          <div className="tools-list">
            {items.map((it) => (
              <div
                key={it.path}
                className={`tools-item ${it.missing ? "missing" : ""}`}
                draggable={!it.missing}
                onDragStart={() => window.raven.shelfDrag(it.path)}
                onClick={() => window.raven.shelfOpen(it.path)}
                title={it.missing ? `${it.path} (tidak ditemukan)` : `${it.path}\nKlik: buka lokasi · Seret: pindahkan`}
              >
                <span className="tools-clip with-icon"><Icon name="file" size={12} /> {it.name}</span>
                {it.size > 0 && <span className="shelf-size">{fmtSize(it.size)}</span>}
                <button className="tools-del" onClick={(e) => { e.stopPropagation(); remove(it.path); }}><Icon name="trash" size={12} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
