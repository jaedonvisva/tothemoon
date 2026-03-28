"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { moonshotFetch, openMoonshotPositionSocket } from "@/lib/moonshot-api";

function MissingPrivyConfig() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <p className="text-zinc-600 dark:text-zinc-400">
        Set <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_PRIVY_APP_ID</code> in{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code> (same app as backend{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">PRIVY_APP_ID</code>).
      </p>
      <Link href="/" className="mt-4 inline-block text-blue-600 underline">
        Home
      </Link>
    </main>
  );
}

function MissingApiConfig() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <p className="text-zinc-600 dark:text-zinc-400">
        Set <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_API_URL</code> in{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code> (e.g.{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">http://localhost:3001</code>).
      </p>
      <Link href="/" className="mt-4 inline-block text-blue-600 underline">
        Home
      </Link>
    </main>
  );
}

function GamePanel() {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [balance, setBalance] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);

  const tokenGetter = useCallback(() => getAccessToken(), [getAccessToken]);

  async function fetchBalance() {
    setError(null);
    try {
      const res = await moonshotFetch("/balance", { getAccessToken: tokenGetter });
      const text = await res.text();
      if (!res.ok) {
        setError(`${res.status}: ${text}`);
        return;
      }
      setBalance(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function doSpin() {
    setError(null);
    setSpinResult(null);
    try {
      const res = await moonshotFetch("/spin", {
        getAccessToken: tokenGetter,
        method: "POST",
        body: { stake: 1 },
      });
      const text = await res.text();
      if (!res.ok) {
        setError(`${res.status}: ${text}`);
        return;
      }
      setSpinResult(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function demoWsFromSpinJson() {
    setError(null);
    setWsLog([]);
    try {
      const raw = spinResult;
      if (!raw) {
        setError("Spin first to get a positionId");
        return;
      }
      const j = JSON.parse(raw) as { positionId?: string };
      if (!j.positionId) {
        setError("No positionId in spin response");
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        setError("No access token");
        return;
      }
      openMoonshotPositionSocket(j.positionId, token, {
        onTick: (d) =>
          setWsLog((prev) => [...prev.slice(-20), `tick: ${JSON.stringify(d)}`]),
        onResult: (d) =>
          setWsLog((prev) => [...prev, `result: ${JSON.stringify(d)}`]),
        onClose: () => setWsLog((prev) => [...prev, "closed"]),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Moonshot (Privy)</h1>
        <Link href="/" className="text-sm text-blue-600 underline">
          Home
        </Link>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This route uses <strong>Privy</strong> for the Bun API. It does not use Supabase Auth. Supabase may still host
        Postgres via <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">DATABASE_URL</code> on the server.
      </p>

      {!ready ? (
        <p className="text-zinc-500">Loading Privy…</p>
      ) : !authenticated ? (
        <button
          type="button"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={() => login()}
        >
          Log in
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              onClick={() => fetchBalance()}
            >
              GET /balance
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              onClick={() => doSpin()}
            >
              POST /spin
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
              onClick={() => demoWsFromSpinJson()}
            >
              Open WS (after spin + confirm OPEN)
            </button>
            <button
              type="button"
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-800 dark:text-red-400"
              onClick={() => logout()}
            >
              Log out
            </button>
          </div>

          {balance !== null && (
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{balance}</pre>
          )}
          {spinResult !== null && (
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-900">{spinResult}</pre>
          )}
          {wsLog.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-2 text-xs dark:border-zinc-700">
              {wsLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>
      )}
    </main>
  );
}

export default function GamePage() {
  const hasPrivyAppId = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim());
  const hasApiUrl = Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());

  if (!hasPrivyAppId) {
    return <MissingPrivyConfig />;
  }
  if (!hasApiUrl) {
    return <MissingApiConfig />;
  }

  return <GamePanel />;
}
