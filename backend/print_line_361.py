import json

path = r"C:\Users\naikn\.gemini\antigravity-ide\brain\6d8a3135-fe79-4811-bce3-0e608fdd059c\.system_generated\logs\transcript.jsonl"
line_num = 361

try:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        for idx, line in enumerate(f, 1):
            if idx == line_num:
                data = json.loads(line)
                print(json.dumps(data, indent=2))
                break
except Exception as e:
    print(e)
