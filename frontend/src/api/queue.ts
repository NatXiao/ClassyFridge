// Runs classification requests one at a time, in the order they were asked
let chain: Promise<unknown> = Promise.resolve()

export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job)
  chain = run.catch(() => undefined) // a failed job must not block the next ones
  return run
}
