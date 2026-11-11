import { motion } from "motion/react";
import { LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { siteConfig } from "../config/siteConfig.js";
import { absUrl, ADMIN_KEY, adminDelete, adminList, adminReindex, adminVerify, storage } from "../lib/api.js";

/** Hidden host page (/admin): enter the ADMIN_TOKEN once, then delete photos or rebuild the index. */
export default function Admin() {
  const [token, setToken] = useState(() => storage.get(ADMIN_KEY) || "");
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (t) => {
    try {
      setData(await adminList(t));
      setError(null);
    } catch (err) {
      if (err.status === 401 || err.status === 404) {
        storage.remove(ADMIN_KEY);
        setToken("");
      }
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminVerify(input.trim());
      storage.set(ADMIN_KEY, input.trim());
      setToken(input.trim());
    } catch (err) {
      setError(err.status === 401 ? "Wrong token" : err.status === 404 ? "Admin is disabled on the server (ADMIN_TOKEN not set)" : err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    storage.remove(ADMIN_KEY);
    setToken("");
    setData(null);
  };

  const del = async (photo) => {
    if (!window.confirm(`Delete ${photo.original_name || photo.id} from Drive? This cannot be undone.`)) return;
    try {
      await adminDelete(token, photo.id);
      setData((d) => ({ ...d, total: d.total - 1, photos: d.photos.filter((p) => p.id !== photo.id) }));
    } catch (err) {
      window.alert(err.message);
    }
  };

  const reindex = async () => {
    setBusy(true);
    try {
      await adminReindex(token);
      await load(token);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={siteConfig.admin.heading} subtitle="For the host only. Deleting removes the original, medium and thumbnail from Drive." />

      {!token && (
        <form onSubmit={login} className="card-royal mx-auto flex max-w-md flex-col gap-4 rounded-3xl p-8 text-center">
          <ShieldCheck className="mx-auto text-secondary" size={30} aria-hidden="true" />
          <label htmlFor="admin-token" className="sr-only">Admin token</label>
          <input
            id="admin-token"
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ADMIN_TOKEN"
            autoComplete="off"
            className="rounded-full border border-secondary/50 bg-primary-deeper/60 px-5 py-3 text-center text-ink focus:border-third"
          />
          {error && <p className="text-sm text-third-soft" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !input.trim()} className="btn-gold btn-gold-hover disabled:opacity-60">
            {busy ? "Checking..." : "Unlock"}
          </button>
        </form>
      )}

      {token && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink/85">
              {data ? `${data.total} photo${data.total === 1 ? "" : "s"}` : "Loading..."}
              {data?.last_rebuild && <span className="ml-2 text-xs text-ink/60">index refreshed {new Date(data.last_rebuild).toLocaleTimeString()}</span>}
              {data?.last_error && <span className="ml-2 text-xs text-third-soft">last Drive error: {data.last_error}</span>}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={reindex} disabled={busy} className="btn-outline min-h-11 px-3 py-2 text-sm">
                <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden="true" /> Rebuild from Drive
              </button>
              <button type="button" onClick={logout} className="btn-outline min-h-11 px-3 py-2 text-sm">
                <LogOut size={16} aria-hidden="true" /> Lock
              </button>
            </div>
          </div>
          {error && <p className="mb-4 text-sm text-third-soft">{error}</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data?.photos.map((p) => (
              <motion.li key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card-royal group relative overflow-hidden rounded-xl p-1">
                <img src={absUrl(p.thumb_url)} alt={p.original_name} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => del(p)}
                  className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-deeper/80 text-third-soft opacity-90 transition hover:bg-third hover:text-primary-deeper"
                  aria-label={`Delete ${p.original_name || p.id}`}
                >
                  <Trash2 size={18} />
                </button>
                <p className="truncate px-1 pt-1 text-xs text-ink/70">{p.original_name}</p>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
