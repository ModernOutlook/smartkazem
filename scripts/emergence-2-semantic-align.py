import json
import re
from pathlib import Path
from sentence_transformers import SentenceTransformer, util

SOURCE = Path('content/emergence-2.js')
TRANSLATIONS = Path('translations/emergence-2.json')
MANIFEST = Path('docs/emergence-2-paragraph-manifest.json')


def source_episodes(text):
    vals = re.findall(r'paragraphs:\"((?:\\.|[^\"])*)\"', text)
    if len(vals) != 11:
        raise RuntimeError(f'Expected 11 source paragraph strings, found {len(vals)}')
    episodes = []
    for i, raw in enumerate(vals):
        decoded = json.loads('"' + raw + '"')
        lines = [x.strip() for x in decoded.splitlines() if x.strip()]
        episodes.append({'number': 20 + i, 'lines': lines})
    return episodes


def split_sentences(text):
    """Split multilingual prose without assuming whitespace after punctuation.

    Chinese/Japanese text commonly places the next sentence immediately after
    。！？, so a whitespace-gated splitter collapses an entire paragraph into one
    unit and makes monotonic alignment impossible. Latin/Arabic/Persian prose
    still uses the whitespace boundary rule to avoid splitting decimals or
    punctuation occurring inside a sentence.
    """
    out, start, i = [], 0, 0
    terminal = set('.!?؟。！？')
    cjk_terminal = set('。！？')
    closers = set('»”’\"\'”)]}')
    while i < len(text):
        ch = text[i]
        if ch not in terminal:
            i += 1
            continue
        while i + 1 < len(text) and text[i + 1] in '.!?…！？':
            i += 1
        j = i + 1
        while j < len(text) and text[j] in closers:
            j += 1

        # CJK sentence terminators do not require a following space. For other
        # scripts, require whitespace/end-of-text so internal punctuation is kept.
        boundary = ch in cjk_terminal or j >= len(text) or text[j].isspace()
        if boundary:
            while j < len(text) and text[j].isspace():
                j += 1
            piece = text[start:j].strip()
            if piece:
                out.append(piece)
            start = j
            i = j
        else:
            i += 1
    tail = text[start:].strip()
    if tail:
        out.append(tail)
    return out


def align_lines(lines, paragraphs, model, lang, episode):
    target_sentences = [s for p in paragraphs for s in split_sentences(p)]
    if not target_sentences:
        raise RuntimeError(f'Episode {episode} {lang}: no translation sentences')

    embeddings = model.encode(lines + target_sentences, convert_to_tensor=True, normalize_embeddings=True)
    src_emb = embeddings[:len(lines)]
    trg_emb = embeddings[len(lines):]
    sims = util.cos_sim(src_emb, trg_emb).cpu().numpy()

    m, n = len(lines), len(target_sentences)
    max_group = 16
    neg = -10**9
    dp = [[neg] * (n + 1) for _ in range(m + 1)]
    back = [[None] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = 0.0

    for i in range(m):
        for j in range(n + 1):
            if dp[i][j] <= neg / 2:
                continue
            for k in range(1, min(max_group, n - j) + 1):
                block = sims[i, j:j+k]
                mean = float(block.mean())
                score = mean - 0.055 * (k - 1)
                val = dp[i][j] + score
                if val > dp[i+1][j+k]:
                    dp[i+1][j+k] = val
                    back[i+1][j+k] = (j, k, mean)

    if back[m][n] is None:
        raise RuntimeError(
            f'Episode {episode} {lang}: no complete monotonic alignment '
            f'(source lines={m}, translation sentences={n})'
        )

    groups = [None] * m
    j = n
    for i in range(m, 0, -1):
        prev, k, mean = back[i][j]
        groups[i-1] = (prev, j, mean)
        j = prev

    result = []
    rows = []
    for i, (a, b, mean) in enumerate(groups):
        if mean < 0.18:
            raise RuntimeError(f'Episode {episode} {lang}: weak semantic alignment at source line {i+1}: {mean:.3f}')
        text = ' '.join(target_sentences[a:b]).strip()
        result.append(text)
        rows.append({'index': i+1, 'translationSentenceStart': a+1, 'translationSentenceEnd': b, 'similarity': round(float(mean), 4)})
    return result, rows


def main():
    src = source_episodes(SOURCE.read_text(encoding='utf-8'))
    data = json.loads(TRANSLATIONS.read_text(encoding='utf-8'))
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    manifest = {
        'schema': 2,
        'rule': 'one non-empty Persian source line = one translation paragraph',
        'method': 'monotonic multilingual semantic alignment of existing translation sentences; no generated or reordered text',
        'episodes': []
    }

    for ep in src:
        target = next((x for x in data['episodes'] if x['number'] == ep['number']), None)
        if not target:
            raise RuntimeError(f'Missing translation episode {ep["number"]}')
        aligned = {}
        details = {}
        for lang in ('en', 'ar', 'zh'):
            aligned[lang], details[lang] = align_lines(ep['lines'], target['paragraphs'][lang], model, lang, ep['number'])
            if any((not x.strip()) or '[object Object]' in x or 'placeholder' in x.lower() for x in aligned[lang]):
                raise RuntimeError(f'Episode {ep["number"]} {lang}: invalid paragraph')
        target['paragraphs']['en'] = aligned['en']
        target['paragraphs']['ar'] = aligned['ar']
        target['paragraphs']['zh'] = aligned['zh']
        manifest['episodes'].append({
            'number': ep['number'],
            'sourceParagraphCount': len(ep['lines']),
            'paragraphs': [
                {'index': i+1, 'fa': ep['lines'][i], 'en': aligned['en'][i], 'ar': aligned['ar'][i], 'zh': aligned['zh'][i],
                 'alignment': {'en': details['en'][i], 'ar': details['ar'][i], 'zh': details['zh'][i]}}
                for i in range(len(ep['lines']))
            ]
        })
        print(f'Episode {ep["number"]}: FA={len(ep["lines"])} EN={len(aligned["en"])} AR={len(aligned["ar"])} ZH={len(aligned["zh"])}')

    TRANSLATIONS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
