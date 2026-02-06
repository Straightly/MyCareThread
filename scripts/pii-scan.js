const { execSync } = require('node:child_process');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? null : process.argv[idx + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function splitDiffByFile(diffText) {
  const chunks = [];
  const lines = diffText.split(/\r?\n/);

  let current = null;
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current) chunks.push(current);
      current = { file: null, text: line + '\n' };
      continue;
    }

    if (current && current.file == null && line.startsWith('+++ b/')) {
      current.file = line.slice('+++ b/'.length).trim();
    }

    if (current) {
      current.text += line + '\n';
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function scanText(text, context) {
  const patterns = [
    { id: 'email', re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { id: 'phone_us', re: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g },
    { id: 'ssn', re: /\b\d{3}-\d{2}-\d{4}\b/g },
    { id: 'mrn_member_dob_keywords', re: /\b(MRN|Member ID|Group #|SSN|DOB|Date of Birth|policy\s*#|subscriber|patient)\b/gi },
    { id: 'address_keywords', re: /\b(Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd|Lane|Ln\.)\b/gi },
  ];

  const allow = [];
  const allowPath = getArg('--allow');
  if (allowPath) {
    try {
      const raw = run(`git show :"${allowPath}"`);
      raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .forEach((l) => allow.push(l));
    } catch {
      // ignore
    }
  }

  const findings = [];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(text)) !== null) {
      const match = m[0];
      if (allow.some((a) => a && match.includes(a))) continue;
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + match.length + 40);
      findings.push({ pattern: p.id, match, snippet: text.slice(start, end), context });
      if (findings.length >= 50) return findings;
    }
  }
  return findings;
}

function main() {
  if (process.env.PII_SCAN_SKIP === '1') {
    process.exit(0);
  }

  const mode = hasFlag('--all') ? 'all' : 'staged';

  let text = '';
  if (mode === 'staged') {
    const safeFiles = new Set([
      'scripts/pii-scan.js',
      '.githooks/pre-commit',
      '.github/workflows/pii-scan.yml',
    ]);

    const diff = run('git diff --cached --unified=0');
    const parts = splitDiffByFile(diff);
    text = parts.filter((p) => !p.file || !safeFiles.has(p.file)).map((p) => p.text).join('\n');
  } else {
    const files = run('git ls-files').split(/\r?\n/).filter(Boolean);
    for (const f of files) {
      try {
        const content = run(`git show :"${f}"`);
        text += `\n\n===== FILE: ${f} =====\n` + content;
      } catch {
        // skip binary/unreadable
      }
    }
  }

  const findings = scanText(text, mode);
  if (findings.length === 0) {
    process.exit(0);
  }

  const lines = [];
  lines.push('PII/PHI scan blocked this operation. Potential sensitive content detected:');
  for (const f of findings.slice(0, 20)) {
    lines.push(`- [${f.pattern}] ${f.match}`);
    lines.push(`  context: ${f.context}`);
    lines.push(`  snippet: ${f.snippet.replace(/\r?\n/g, ' ')}`);
  }
  lines.push('');
  lines.push('If this is a false positive, either redact it, add an allowlist entry, or set PII_SCAN_SKIP=1 temporarily.');
  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
}

main();
