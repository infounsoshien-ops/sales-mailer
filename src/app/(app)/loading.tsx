/**
 * App Router のローディング UI。
 * (app) セグメント以下のページが server で render 中、これが自動で表示される。
 *
 * cold start (~1-3 秒) で白画面になるのを避けるためのスケルトン表示。
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-4">
            <div className="mb-3 h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
