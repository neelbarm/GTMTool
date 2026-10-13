const show = (v) => (v === undefined || v === null || v === '' ? '(empty)' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function renderRecord(obj, indent = '  ') {
  return Object.entries(obj).map(([k, v]) => `${indent}${k.padEnd(14)} ${show(v)}`).join('\n');
}

// Key-wise diff. Unchanged keys print once, changed keys print as -/+.
export function renderDiff(before, after, indent = '  ') {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  const out = [];
  for (const k of keys) {
    const a = before ? before[k] : undefined;
    const b = after ? after[k] : undefined;
    if (show(a) === show(b)) out.push(`${indent}  ${k.padEnd(14)} ${show(b)}`);
    else {
      if (before && a !== undefined) out.push(`${indent}- ${k.padEnd(14)} ${show(a)}`);
      out.push(`${indent}+ ${k.padEnd(14)} ${show(b)}`);
    }
  }
  return out.join('\n');
}

export function changed(before, after) {
  return Object.keys(after || {}).filter((k) => show(before?.[k]) !== show(after[k]));
}
