set -e

echo "Entrypoint script started..."
DB_FILE="/app/test.db"

if [ ! -f "$DB_FILE" ]; then
    echo "Database file not found at $DB_FILE. Running seeder..."
    python /app/seed_db.py
    echo "Seeder finished."
else
    echo "Database file found at $DB_FILE. Skipping seeder."
fi

echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload