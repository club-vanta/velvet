/** A chart's numbers as text, for screen readers and anyone who cannot hover. */
export function ChartTextTable({
  labelledBy,
  headers,
  rows,
}: {
  labelledBy: string;
  headers: string[];
  rows: { key: string; cells: string[] }[];
}) {
  return (
    // sr-only on the wrapper: a table sizes to its content and would still
    // widen the page.
    <div className="sr-only">
      <table aria-labelledby={labelledBy}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, cells: [first, ...rest] }) => (
            <tr key={key}>
              <th scope="row">{first}</th>
              {rest.map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
