import json, re
from pathlib import Path

SOURCE = Path('content/emergence-2.js')
TRANSLATIONS = Path('translations/emergence-2.json')
MANIFEST = Path('docs/emergence-2-paragraph-manifest.json')
LANGUAGES = ('en', 'ar', 'zh')


def source_episodes(text):
    raw = re.findall(r'paragraphs:"((?:\\.|[^"])*)"', text)
    if len(raw) != 11:
        raise RuntimeError(f'expected 11 source strings, got {len(raw)}')
    episodes = []
    for index, value in enumerate(raw):
        decoded = json.loads('"' + value + '"')
        # The source convention is explicit: every non-empty line is a paragraph.
        lines = [line.strip() for line in decoded.splitlines() if line.strip()]
        episodes.append({'number': 20 + index, 'lines': lines})
    return episodes


def sentences(text, lang):
    """Split existing translated prose into ordered sentence units without rewriting it.

    CJK terminal punctuation is a boundary even without following whitespace.
    For EN/AR, punctuation is a boundary only before whitespace or end-of-text.
    Trailing whitespace remains attached to each unit so regrouping preserves
    the original characters and their order.
    """
    text = str(text)
    parts = []
    start = 0
    index = 0
    terminal = '.!?؟。！？'
    cjk_terminal = '。！？'
    closers = '»”’")]}'
    while index < len(text):
        char = text[index]
        if char not in terminal:
            index += 1
            continue
        while index + 1 < len(text) and text[index + 1] in '.!?…！？':
            index += 1
        end = index + 1
        while end < len(text) and text[end] in closers:
            end += 1
        boundary = char in cjk_terminal or end >= len(text) or text[end].isspace()
        if not boundary:
            index += 1
            continue
        while end < len(text) and text[end].isspace():
            end += 1
        piece = text[start:end]
        if piece.strip():
            parts.append(piece)
        start = end
        index = end
    tail = text[start:]
    if tail.strip():
        parts.append(tail)
    return parts


def align(source_lines, original_paragraphs, episode, lang):
    target_units = [
        unit
        for paragraph in original_paragraphs
        for unit in sentences(paragraph, lang)
    ]
    source_count = len(source_lines)
    target_count = len(target_units)
    if target_count < source_count:
        raise RuntimeError(
            f'Episode {episode} {lang}: only {target_count} translated sentence units '
            f'for {source_count} non-empty Persian source lines'
        )

    source_lengths = [max(1, len(re.sub(r'\s+', '', line))) for line in source_lines]
    target_lengths = [max(1, len(re.sub(r'\s+', '', unit))) for unit in target_units]
    ratio = sum(target_lengths) / sum(source_lengths)

    infinity = 10**18
    dp = [[infinity] * (target_count + 1) for _ in range(source_count + 1)]
    back = [[None] * (target_count + 1) for _ in range(source_count + 1)]
    dp[0][0] = 0.0

    for source_index in range(source_count):
        expected_length = source_lengths[source_index] * ratio
        for target_index in range(target_count):
            if dp[source_index][target_index] >= infinity:
                continue
            max_group = min(24, target_count - target_index - (source_count - source_index - 1))
            for group_size in range(1, max_group + 1):
                end = target_index + group_size
                total_length = sum(target_lengths[target_index:end])
                length_cost = abs(total_length - expected_length) / max(expected_length, 1)
                count_cost = 0.03 * max(0, group_size - 4)
                cost = dp[source_index][target_index] + length_cost + count_cost
                if cost < dp[source_index + 1][end]:
                    dp[source_index + 1][end] = cost
                    back[source_index + 1][end] = (target_index, group_size, length_cost)

    if back[source_count][target_count] is None:
        raise RuntimeError(f'Episode {episode} {lang}: could not align all translated text in order')

    groups = []
    cursor = target_count
    for source_index in range(source_count, 0, -1):
        previous, group_size, deviation = back[source_index][cursor]
        groups.append((previous, group_size, deviation))
        cursor = previous
    groups.reverse()

    aligned = []
    details = []
    for index, (start, group_size, deviation) in enumerate(groups):
        paragraph = ''.join(target_units[start:start + group_size]).strip()
        if not paragraph or '[object Object]' in paragraph or 'placeholder' in paragraph.lower():
            raise RuntimeError(f'Episode {episode} {lang}: invalid aligned paragraph {index + 1}')
        aligned.append(paragraph)
        details.append({
            'index': index + 1,
            'translationSentenceStart': start + 1,
            'translationSentenceEnd': start + group_size,
            'lengthDeviation': round(deviation, 4),
        })

    # Prove that alignment only changes boundaries: no translated characters
    # may be added, deleted, or reordered.
    before = ''.join(re.sub(r'\s+', '', str(value)) for value in original_paragraphs)
    after = ''.join(re.sub(r'\s+', '', value) for value in aligned)
    if before != after:
        raise RuntimeError(f'Episode {episode} {lang}: translated text changed during alignment')
    return aligned, details


def main():
    data = json.loads(TRANSLATIONS.read_text(encoding='utf-8'))
    source = source_episodes(SOURCE.read_text(encoding='utf-8'))
    manifest = {
        'schema': 6,
        'rule': 'one non-empty source line = one paragraph in every language',
        'method': (
            'preserve all existing translated sentence text and order; split at sentence '
            'boundaries, then monotonically regroup into exactly one paragraph per '
            'non-empty Persian source line; no generated, rewritten, or reordered prose'
        ),
        'episodes': [],
    }

    for episode in source:
        row = next((item for item in data['episodes'] if item['number'] == episode['number']), None)
        if row is None:
            raise RuntimeError(f"Missing translation episode {episode['number']}")
        aligned, details = {}, {}
        for language in LANGUAGES:
            if not isinstance(row.get('paragraphs', {}).get(language), list):
                raise RuntimeError(f"Episode {episode['number']} {language}: paragraph array missing")
            aligned[language], details[language] = align(
                episode['lines'], row['paragraphs'][language], episode['number'], language
            )
            if len(aligned[language]) != len(episode['lines']):
                raise RuntimeError(f"Episode {episode['number']} {language}: paragraph count mismatch")
        row['paragraphs'].update(aligned)
        manifest['episodes'].append({
            'number': episode['number'],
            'sourceParagraphCount': len(episode['lines']),
            'paragraphs': [
                {
                    'index': index + 1,
                    'sourceLine': index + 1,
                    'alignment': {
                        'en': details['en'][index],
                        'ar': details['ar'][index],
                        'zh': details['zh'][index],
                    },
                }
                for index in range(len(episode['lines']))
            ],
        })
        print(
            f"Episode {episode['number']}: "
            f"FA={len(episode['lines'])} EN={len(aligned['en'])} "
            f"AR={len(aligned['ar'])} ZH={len(aligned['zh'])}"
        )

    TRANSLATIONS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
