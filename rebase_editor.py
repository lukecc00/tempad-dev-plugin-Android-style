import sys
import os

filepath = sys.argv[1]
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
seen_messages = set()

for line in lines:
    parts = line.strip().split(' ', 2)
    if len(parts) < 3:
        new_lines.append(line)
        continue
    
    command = parts[0]
    # Handle different git rebase formats, but usually it is "pick hash message"
    if command == 'pick':
        message = parts[2]
        if message == 'p-支持svg绘制背景圆角':
            if message in seen_messages:
                # Replace 'pick' with 'fixup'
                # reconstruct line to preserve spacing if possible, or just create new one
                new_lines.append(line.replace('pick', 'fixup', 1))
            else:
                new_lines.append(line)
                seen_messages.add(message)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(filepath, 'w') as f:
    f.writelines(new_lines)
