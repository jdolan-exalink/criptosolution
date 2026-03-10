import sqlite3

def add_column():
    conn = sqlite3.connect('DB/wanda.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE hmm_decisions ADD COLUMN calculation_time FLOAT DEFAULT 0.0")
        conn.commit()
        print("Successfully added calculation_time to hmm_decisions")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column calculation_time already exists")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
