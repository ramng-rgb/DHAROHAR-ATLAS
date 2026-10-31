.PHONY: up down seed test build lint clean

up:
	docker compose up -d --build

down:
	docker compose down

seed:
	PYTHONPATH=apps/api apps/api/.venv/bin/python apps/api/scripts/seed_data.py

test:
	PYTHONPATH=apps/api apps/api/.venv/bin/pytest apps/api/tests -v --cov=app

build:
	npm run build --prefix apps/web

lint:
	apps/api/.venv/bin/ruff check apps/api
	npm run type-check --prefix apps/web

clean:
	rm -rf apps/web/.next apps/web/node_modules apps/api/.pytest_cache
