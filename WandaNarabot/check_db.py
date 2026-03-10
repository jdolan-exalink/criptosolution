import sys
import os
import sqlite3

def check_db():
    conn = sqlite3.connect('d:/DEVs/WandaNarabot/DB/wandanarabot.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    # Check bot_sessions schema if it exists
    if ('bot_sessions',) in tables:
        cursor.execute("PRAGMA table_info(bot_sessions);")
        print("bot_sessions schema:", cursor.fetchall())
    
    conn.close()

if __name__ == '__main__':
    check_db()
