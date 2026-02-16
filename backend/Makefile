.PHONY: run seed test lint

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

seed:
	python -m scripts.seed_data

test:
	pytest
