import re

with open('CanvasPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add thumbnail to interface
content = content.replace(
    '  tags: string[];\n}',
    '  tags: string[];\n  thumbnail: string;\n}'
)

# Find PRESET_DATA and add thumbnails
preset_block = re.search(r'const PRESET_DATA: PresetItem\[\] = \[(.*?)\];\s*\n// Helper', content, re.DOTALL)
if not preset_block:
    print('PRESET_DATA not found')
    exit(1)

preset_text = preset_block.group(1)
tags_matches = list(re.finditer(r"(    tags: \[.*?\],)", preset_text, re.DOTALL))
print(f'Found {len(tags_matches)} presets')

offset = 0
new_preset_text = preset_text
thumb_idx = 1

for m in tags_matches:
    thumbnail = f"    thumbnail: '/images/show-cover-{thumb_idx}.jpg',"
    thumb_idx = thumb_idx % 20 + 1
    pos = m.end() + offset
    new_preset_text = new_preset_text[:pos] + '\n' + thumbnail + new_preset_text[pos:]
    offset += len('\n' + thumbnail)

content = content.replace(preset_text, new_preset_text)

with open('CanvasPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
