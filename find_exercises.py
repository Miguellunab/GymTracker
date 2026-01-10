import urllib.request
import json
import unicodedata

def normalize_name(value):
    if not value: return ""
    return unicodedata.normalize('NFD', value.lower()).encode('ascii', 'ignore').decode("utf-8").strip()

url = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
try:
    print(f"Fetching {url}...")
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
    
    print(f"Loaded {len(data)} exercises.")
    
    targets = ["incline dumbbell press", "reverse fly", "pecho", "espalda"]
    
    for t in targets:
        tn = normalize_name(t)
        print(f"--- Searching for '{t}' ---")
        matches = [e for e in data if tn in normalize_name(e['name'])]
        for m in matches[:5]:
            print(f"Found: {m['name']} | ID: {m['id']}")

except Exception as e:
    print(f"Error: {e}")
