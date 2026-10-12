import json, re
from pathlib import Path

S = Path('content/emergence-2.js')
T = Path('translations/emergence-2.json')
M = Path('docs/emergence-2-paragraph-manifest.json')


def source_episodes(text):
    raw = re.findall(r'paragraphs:\"((?:\\.|[^\"])*)\"', text)
    if len(raw) != 11:
        raise RuntimeError(f'expected 11 source strings, got {len(raw)}')
    out = []
    for i, value in enumerate(raw):
        decoded = json.loads('"' + value + '"')
        lines = [x.strip() for x in decoded.splitlines() if x.strip()]
        out.append({'number': 20 + i, 'lines': lines})
    return out


def sentences(text):
    """Split existing translation text only; never rewrite or reorder it."""
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    parts = []
    start = 0
    i = 0
    while i < len(text):
        if text[i] in '.!?؟。！？':
            j = i + 1
            while j < len(text) and text[j] in '.!?…！？':
                j += 1
            while j < len(text) and text[j] in '»”’\")]}':
                j += 1
            if j >= len(text) or text[j].isspace():
                p = text[start:j].strip()
                if p:
                    parts.append(p)
                while j < len(text) and text[j].isspace():
                    j += 1
                start = j
                i = j
                continue
        i += 1
    tail = text[start:].strip()
    if tail:
        parts.append(tail)
    return parts


def align(lines, original, ep, lang):
    target = [s for paragraph in original for s in sentences(paragraph)]
    m, n = len(lines), len(target)
    if n < m:
        raise RuntimeError(f'Episode {ep} {lang}: translation has {n} sentence units for {m} Persian lines')

    # Review-style monotonic regrouping: preserve all existing translation text
    # and order, using paragraph length as the only grouping guide. No semantic model.
    src_len = [max(1, len(re.sub(r'\s+', '', x))) for x in lines]
    trg_len = [max(1, len(re.sub(r'\s+', '', x))) for x in target]
    ratio = sum(trg_len) / sum(src_len)

    INF = 10**18
    dp = [[INF] * (n + 1) for _ in range(m + 1)]
    back = [[None] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = 0.0

    for i in range(m):
        expected = src_len[i] * ratio
        for j in range(n):
            if dp[i][j] >= INF:
                continue
            max_k = min(20, n - j - (m - i - 1))
            for k in range(1, max_k + 1):
                total = sum(trg_len[j:j+k])
                # Prefer the existing sentence grouping whose text length best
                # matches this Persian source line; never cross or reorder text.
                length_cost = abs(total - expected) / max(expected, 1)
                count_cost = 0.03 * max(0, k - 4)
                cost = dp[i][j] + length_cost + count_cost
                if cost < dp[i+1][j+k]:
                    dp[i+1][j+k] = cost
                    back[i+1][j+k] = (j, k, length_cost)

    if back[m][n] is None:
        raise RuntimeError(f'Episode {ep} {lang}: could not preserve all translation text in order')

    groups = []
    j = n
    for i in range(m, 0, -1):
        prev, k, score = back[i][j]
        groups.append((prev, k, score))
        j = prev
    groups.reverse()

    out, rows = [], []
    for i, (start, k, score) in enumerate(groups):
        text = ' '.join(target[start:start+k]).strip()
        out.append(text)
        rows.append({
            'index': i + 1,
            'translationSentenceStart': start + 1,
            'translationSentenceEnd': start + k,
            'lengthDeviation': round(score, 4),
        })
    return out, rows


def main():
    data = json.loads(T.read_text(encoding='utf-8'))
    source = source_episodes(S.read_text(encoding='utf-8'))
    manifest = {
        'schema': 5,
        'rule': 'one non-empty Persian source line = one translation paragraph',
        'method': 'monotonic review regrouping of existing translation text; source line boundaries are authoritative; no generated, reordered, or semantically rewritten text',
        'episodes': [],
    }

    for ep in source:
        row = next(x for x in data['episodes'] if x['number'] == ep['number'])
        aligned, details = {}, {}
        for lang in ('en', 'ar', 'zh'):
            aligned[lang], details[lang] = align(ep['lines'], row['paragraphs'][lang], ep['number'], lang)
        row['paragraphs'].update(aligned)
        manifest['episodes'].append({
            'number': ep['number'],
            'sourceParagraphCount': len(ep['lines']),
            'paragraphs': [
                {
                    'index': i + 1,
                    'fa': ep['lines'][i],
                    'en': aligned['en'][i],
                    'ar': aligned['ar'][i],
                    'zh': aligned['zh'][i],
                    'alignment': {
                        'en': details['en'][i],
                        'ar': details['ar'][i],
                        'zh': details['zh'][i],
                    },
                }
                for i in range(len(ep['lines']))
            ],
        })
        print(f"Episode {ep['number']}: FA={len(ep['lines'])} EN={len(aligned['en'])} AR={len(aligned['ar'])} ZH={len(aligned['zh'])}")

    T.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    M.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
