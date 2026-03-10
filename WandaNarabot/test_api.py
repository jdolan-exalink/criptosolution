import urllib.request
import json
import traceback

data = json.dumps({"duration_hours": 24, "symbols": ["BTC/USDT"]}).encode('utf-8')
headers = {'Content-Type': 'application/json'}
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/bot/start', data=data, headers=headers, method='POST')

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}:\n{e.read().decode('utf-8')}")
except Exception as e:
    print(f"Unexpected Error: {e}")
