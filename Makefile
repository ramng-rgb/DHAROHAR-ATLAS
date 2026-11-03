.PHONY: up down seed test build lint clean

up:
	docker compose up -d --build

down:
	docker compose down

seed:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/seed_from_yaml.py

client:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/export_openapi.py
	npm run generate-client --prefix apps/web

optimize-models:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/optimize_models.py

ingest-folder:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/ingest_folder.py --dir=$(DIR)

eval-ocr:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/eval_ocr.py

eval-translation:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/eval_translation.py

reindex:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/reindex.py

eval-search:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/eval_search.py

eval-ask:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/eval_ask.py


test:
	PYTHONPATH=apps/api apps/api/.venv/bin/pytest apps/api/tests -v --cov=app

build:
	npm run build --prefix apps/web

lint:
	apps/api/.venv/bin/ruff check apps/api
	npm run type-check --prefix apps/web

clean:
	rm -rf apps/web/.next apps/web/node_modules apps/api/.pytest_cache
