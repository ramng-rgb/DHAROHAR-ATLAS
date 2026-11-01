import json
import os
from app.main import app

def export_openapi():
    openapi_schema = app.openapi()
    output_path = os.path.join(os.path.dirname(__file__), "../../web/openapi.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
    print(f"Exported OpenAPI schema to {os.path.abspath(output_path)}")

if __name__ == "__main__":
    export_openapi()
