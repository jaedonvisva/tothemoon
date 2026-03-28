import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  ) {
    return (
      <main className="p-8">
        <p>
          Add{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
          </code>{" "}
          to <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code> (see{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.example</code>).
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  const { data: todos } = await supabase.from("todos").select();

  return (
    <main className="p-8">
      <p className="mb-4">
        <a href="/game" className="text-blue-600 underline">
          Moonshot (Privy + API)
        </a>{" "}
        — uses the Bun backend, not Supabase Auth.
      </p>
      <h1 className="mb-4 text-xl font-semibold">Todos</h1>
      <ul className="list-inside list-disc">
        {todos?.map((todo: { id: string; name: string }) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
      {!todos?.length && (
        <p className="text-zinc-500">No rows (create a `todos` table in Supabase or adjust this query).</p>
      )}
    </main>
  );
}
