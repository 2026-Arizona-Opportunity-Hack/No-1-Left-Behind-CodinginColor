import "server-only";

/** Reads every page of a query (the database returns at most 1,000 rows per request). */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error("Could not read data.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
