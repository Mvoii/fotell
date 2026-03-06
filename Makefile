# FoTell API - Makefile for Testing

.PHONY: help test smoke functional security load all clean setup

# Default target
.DEFAULT_GOAL := help

# Configuration
API_URL ?= http://localhost:8080/api/v1
LOAD_USERS ?= 50
REPORT_DIR ?= ./test-reports

##@ Testing

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

setup: ## Install required dependencies (jq, bc, curl)
	@echo "Installing dependencies..."
	@if command -v brew >/dev/null 2>&1; then \
		brew install jq bc curl || true; \
	elif command -v apt-get >/dev/null 2>&1; then \
		sudo apt-get update && sudo apt-get install -y jq bc curl; \
	else \
		echo "Please install jq, bc, and curl manually"; \
		exit 1; \
	fi
	@echo "✓ Dependencies installed"
	@chmod +x *.sh

smoke: ## Run quick smoke test (~5 seconds)
	@./smoke_test.sh $(API_URL)

functional: ## Run comprehensive functional tests (~30 seconds)
	@./test_auth.sh --url $(API_URL)

security: ## Run security vulnerability tests (~20 seconds)
	@./security_test_auth.sh --url $(API_URL)

load: ## Run load test with concurrent users (~60 seconds)
	@./load_test_auth.sh --url $(API_URL) --users $(LOAD_USERS) --duration 60

all: ## Run complete test suite (~2 minutes)
	@./run_all_tests.sh --url $(API_URL)

test: all ## Alias for 'all'

##@ Reporting

report: ## Run all tests and save reports
	@mkdir -p $(REPORT_DIR)
	@./run_all_tests.sh --url $(API_URL) --report $(REPORT_DIR)
	@echo "\n✓ Reports saved to $(REPORT_DIR)/"

report-functional: ## Run functional tests with report
	@mkdir -p $(REPORT_DIR)
	@./test_auth.sh --url $(API_URL) --report $(REPORT_DIR)/functional_$(shell date +%Y%m%d_%H%M%S).txt

report-load: ## Run load test with report
	@mkdir -p $(REPORT_DIR)
	@./load_test_auth.sh --url $(API_URL) --users $(LOAD_USERS) --report $(REPORT_DIR)/load_$(shell date +%Y%m%d_%H%M%S).txt

##@ CI/CD

ci: ## Run tests suitable for CI/CD (no load tests)
	@./run_all_tests.sh --url $(API_URL) --skip-load

ci-quick: smoke ## Quick CI check (smoke test only)

##@ Development

verbose: ## Run functional tests with verbose output
	@./test_auth.sh --url $(API_URL) --verbose

debug: ## Run tests with debug info and stop on first failure
	@./test_auth.sh --url $(API_URL) --verbose --stop-on-fail

watch: ## Watch mode - run smoke test every 5 seconds
	@echo "Running smoke test every 5 seconds. Press Ctrl+C to stop."
	@while true; do \
		clear; \
		echo "=== Smoke Test ($(shell date)) ==="; \
		./smoke_test.sh $(API_URL) || true; \
		sleep 5; \
	done

##@ Cleanup

clean: ## Remove test reports
	@rm -rf $(REPORT_DIR)
	@echo "✓ Test reports cleaned"

##@ Database

db-setup: ## Create database and run migrations
	@echo "Setting up database..."
	@createdb fotell 2>/dev/null || echo "Database 'fotell' already exists"
	@psql fotell < migrations/001_initial.sql
	@echo "✓ Database ready"

db-reset: ## Drop and recreate database
	@echo "Resetting database..."
	@dropdb fotell 2>/dev/null || true
	@createdb fotell
	@psql fotell < migrations/001_initial.sql
	@echo "✓ Database reset complete"

##@ Server

server: ## Start API server in foreground
	@go run api/main.go

server-bg: ## Start API server in background
	@go run api/main.go &
	@echo "$$!" > .server.pid
	@sleep 2
	@echo "✓ Server started (PID: $$(cat .server.pid))"

server-stop: ## Stop background server
	@if [ -f .server.pid ]; then \
		kill $$(cat .server.pid) 2>/dev/null || true; \
		rm .server.pid; \
		echo "✓ Server stopped"; \
	else \
		echo "No server PID file found"; \
	fi

##@ Full Workflow

dev-test: server-bg smoke server-stop ## Start server, run smoke test, stop server

full: db-setup server-bg ## Complete setup: database + server + all tests
	@sleep 3
	@$(MAKE) all
	@$(MAKE) server-stop

##@ Examples

example-ci: ## Example: Run tests as they would run in CI
	@echo "=== CI Pipeline Simulation ==="
	@$(MAKE) db-reset
	@$(MAKE) server-bg
	@sleep 3
	@$(MAKE) ci
	@$(MAKE) server-stop

example-report: ## Example: Generate comprehensive test report
	@$(MAKE) db-reset
	@$(MAKE) server-bg
	@sleep 3
	@$(MAKE) report
	@$(MAKE) server-stop
	@echo "\n✓ Check $(REPORT_DIR)/ for reports"
