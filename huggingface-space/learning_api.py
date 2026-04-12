"""
Legacy launcher — runs the standalone Learning backend.

Prefer:
  python learning_backend.py
  uvicorn learning_backend:app --host 0.0.0.0 --port 7861

app.py is not modified; all learning-only routes live in learning_backend.py.
"""

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("LEARNING_API_PORT", "7861"))
    uvicorn.run("learning_backend:app", host="0.0.0.0", port=port)
