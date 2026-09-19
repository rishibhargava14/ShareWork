const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export const renderApiDocs = (spec) => {
  const rows = Object.entries(spec.paths ?? {}).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => {
      const auth = operation.security ? 'JWT Bearer' : 'public';
      return `<tr>
        <td><code>${escapeHtml(method.toUpperCase())}</code></td>
        <td><code>${escapeHtml(path)}</code></td>
        <td>${escapeHtml(operation.summary ?? '')}</td>
        <td>${escapeHtml(auth)}</td>
        <td>${escapeHtml((operation.tags ?? []).join(', '))}</td>
      </tr>`;
    }),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(spec.info?.title ?? 'API docs')}</title>
  <style>
    body { font-family: sans-serif; margin: 24px; color: #111; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    code { font-size: 0.92em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(spec.info?.title ?? 'API docs')}</h1>
  <p>${escapeHtml(spec.info?.description ?? '')}</p>
  <p>Machine-readable spec: <a href="/openapi.json">/openapi.json</a></p>
  <table>
    <thead>
      <tr><th>Method</th><th>Path</th><th>Summary</th><th>Auth</th><th>Tag</th></tr>
    </thead>
    <tbody>
      ${rows.join('\n')}
    </tbody>
  </table>
</body>
</html>`;
};
