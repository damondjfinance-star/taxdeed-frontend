export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-zinc-900">
          TaxDeedFinder
        </h1>
        <div className="rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-zinc-900/5">
          {children}
        </div>
      </div>
    </div>
  )
}
