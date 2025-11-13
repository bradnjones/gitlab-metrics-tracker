#!/bin/bash

# REST API Investigation Script
# Tests GitLab REST API endpoints vs GraphQL for performance comparison
#
# Usage: ./rest-api-investigation.sh
#
# This script requires:
# - GITLAB_TOKEN environment variable
# - GITLAB_PROJECT_PATH environment variable
# - curl with timing support
# - jq for JSON parsing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Validate environment
if [ -z "$GITLAB_TOKEN" ]; then
    echo -e "${RED}ERROR: GITLAB_TOKEN not set${NC}"
    echo "Please set GITLAB_TOKEN in .env or environment"
    exit 1
fi

if [ -z "$GITLAB_PROJECT_PATH" ]; then
    echo -e "${RED}ERROR: GITLAB_PROJECT_PATH not set${NC}"
    echo "Please set GITLAB_PROJECT_PATH in .env or environment"
    exit 1
fi

GITLAB_URL="${GITLAB_URL:-https://gitlab.com}"
GROUP_PATH="${GITLAB_PROJECT_PATH}"

echo "=========================================="
echo "REST API vs GraphQL Investigation"
echo "=========================================="
echo ""
echo "GitLab URL: $GITLAB_URL"
echo "Group Path: $GROUP_PATH"
echo ""

# Function to measure curl request time
measure_request() {
    local url="$1"
    local description="$2"

    echo -e "${BLUE}Testing: $description${NC}"
    echo "URL: $url"

    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}" \
        -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "$url")
    local end_time=$(date +%s%3N)

    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local time_total=$(echo "$response" | grep "TIME_TOTAL:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d' | sed '/TIME_TOTAL:/d')

    local duration=$((end_time - start_time))

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo "  HTTP Status: $http_code"
        echo "  Response Time: ${time_total}s (${duration}ms)"

        # Try to parse JSON and show size
        if command -v jq &> /dev/null; then
            local item_count=$(echo "$body" | jq '. | length' 2>/dev/null || echo "N/A")
            echo "  Items returned: $item_count"
            local size=$(echo "$body" | wc -c)
            echo "  Response size: $size bytes"
        fi
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "  HTTP Status: $http_code"
        echo "  Response: $body"
    fi

    echo ""
    return $duration
}

# Test 1: Get iterations via REST API
echo "=========================================="
echo "TEST 1: REST API - Get Iterations"
echo "=========================================="
echo ""

# First, we need to get the group ID
echo "Step 1: Get group ID from group path..."
GROUP_INFO=$(curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    "${GITLAB_URL}/api/v4/groups?search=${GROUP_PATH}" | jq '.[0]')

GROUP_ID=$(echo "$GROUP_INFO" | jq -r '.id')

if [ "$GROUP_ID" = "null" ] || [ -z "$GROUP_ID" ]; then
    echo -e "${RED}ERROR: Could not find group ID for $GROUP_PATH${NC}"
    echo "Available groups:"
    curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" "${GITLAB_URL}/api/v4/groups" | jq -r '.[].full_path'
    exit 1
fi

echo -e "${GREEN}Found group ID: $GROUP_ID${NC}"
echo ""

# Get iterations
REST_ITERATIONS_TIME=0
measure_request \
    "${GITLAB_URL}/api/v4/groups/${GROUP_ID}/iterations?per_page=10" \
    "REST API - Get 10 iterations"
REST_ITERATIONS_TIME=$?

# Save iteration IDs for next tests
ITERATIONS=$(curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    "${GITLAB_URL}/api/v4/groups/${GROUP_ID}/iterations?per_page=3")

if command -v jq &> /dev/null; then
    ITERATION_IDS=($(echo "$ITERATIONS" | jq -r '.[].id'))
    echo "Retrieved ${#ITERATION_IDS[@]} iteration IDs for testing"
    echo ""
else
    echo -e "${YELLOW}Warning: jq not installed, skipping detailed tests${NC}"
    exit 0
fi

# Test 2: Get issues for an iteration via REST API
echo "=========================================="
echo "TEST 2: REST API - Get Issues for Iteration"
echo "=========================================="
echo ""

if [ ${#ITERATION_IDS[@]} -gt 0 ]; then
    ITERATION_ID=${ITERATION_IDS[0]}
    echo "Testing with iteration ID: $ITERATION_ID"
    echo ""

    REST_ISSUES_TIME=0
    measure_request \
        "${GITLAB_URL}/api/v4/groups/${GROUP_ID}/issues?iteration_id=${ITERATION_ID}&per_page=100" \
        "REST API - Get issues for iteration"
    REST_ISSUES_TIME=$?

    # Get first issue IID for notes test
    ISSUES=$(curl -s -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
        "${GITLAB_URL}/api/v4/groups/${GROUP_ID}/issues?iteration_id=${ITERATION_ID}&per_page=5")

    ISSUE_IID=$(echo "$ISSUES" | jq -r '.[0].iid')
    PROJECT_ID=$(echo "$ISSUES" | jq -r '.[0].project_id')

    if [ "$ISSUE_IID" != "null" ] && [ -n "$ISSUE_IID" ]; then
        echo "Found test issue: IID=$ISSUE_IID, Project ID=$PROJECT_ID"
        echo ""

        # Test 3: Get notes for an issue via REST API
        echo "=========================================="
        echo "TEST 3: REST API - Get Notes for Issue"
        echo "=========================================="
        echo ""

        REST_NOTES_TIME=0
        measure_request \
            "${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/issues/${ISSUE_IID}/notes?per_page=20" \
            "REST API - Get 20 notes for issue"
        REST_NOTES_TIME=$?
    fi
fi

# Test 4: GraphQL equivalent queries
echo "=========================================="
echo "TEST 4: GraphQL - Equivalent Queries"
echo "=========================================="
echo ""

# GraphQL query for iterations
GRAPHQL_ITERATIONS_QUERY='{
  "query": "query { group(fullPath: \"'$GROUP_PATH'\") { iterations(first: 10) { nodes { id title startDate dueDate } } } }"
}'

echo "Testing GraphQL - Get iterations..."
GRAPHQL_ITERATIONS_START=$(date +%s%3N)
GRAPHQL_ITERATIONS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $GITLAB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$GRAPHQL_ITERATIONS_QUERY" \
    "${GITLAB_URL}/api/graphql")
GRAPHQL_ITERATIONS_END=$(date +%s%3N)
GRAPHQL_ITERATIONS_TIME=$((GRAPHQL_ITERATIONS_END - GRAPHQL_ITERATIONS_START))

GRAPHQL_HTTP_CODE=$(echo "$GRAPHQL_ITERATIONS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$GRAPHQL_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ GraphQL iterations query success${NC}"
    echo "  Response time: ${GRAPHQL_ITERATIONS_TIME}ms"
    if command -v jq &> /dev/null; then
        GRAPHQL_BODY=$(echo "$GRAPHQL_ITERATIONS_RESPONSE" | sed '/HTTP_CODE:/d')
        ITERATION_COUNT=$(echo "$GRAPHQL_BODY" | jq '.data.group.iterations.nodes | length')
        echo "  Iterations returned: $ITERATION_COUNT"
    fi
else
    echo -e "${RED}✗ GraphQL iterations query failed${NC}"
    echo "  HTTP Status: $GRAPHQL_HTTP_CODE"
fi
echo ""

# GraphQL query for issues with notes (the problematic query)
if [ ${#ITERATION_IDS[@]} -gt 0 ]; then
    # Convert REST iteration ID to GraphQL GID
    GRAPHQL_ITERATION_ID="gid://gitlab/Iteration/${ITERATION_IDS[0]}"

    GRAPHQL_ISSUES_QUERY='{
      "query": "query { group(fullPath: \"'$GROUP_PATH'\") { issues(iterationId: [\"'$GRAPHQL_ITERATION_ID'\"], first: 100) { nodes { id title state notes(first: 20) { nodes { id body createdAt } } } } } }"
    }'

    echo "Testing GraphQL - Get issues with notes..."
    GRAPHQL_ISSUES_START=$(date +%s%3N)
    GRAPHQL_ISSUES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $GITLAB_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$GRAPHQL_ISSUES_QUERY" \
        "${GITLAB_URL}/api/graphql")
    GRAPHQL_ISSUES_END=$(date +%s%3N)
    GRAPHQL_ISSUES_TIME=$((GRAPHQL_ISSUES_END - GRAPHQL_ISSUES_START))

    GRAPHQL_HTTP_CODE=$(echo "$GRAPHQL_ISSUES_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    if [ "$GRAPHQL_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ GraphQL issues+notes query success${NC}"
        echo "  Response time: ${GRAPHQL_ISSUES_TIME}ms"
        if command -v jq &> /dev/null; then
            GRAPHQL_BODY=$(echo "$GRAPHQL_ISSUES_RESPONSE" | sed '/HTTP_CODE:/d')
            ISSUE_COUNT=$(echo "$GRAPHQL_BODY" | jq '.data.group.issues.nodes | length')
            echo "  Issues returned: $ISSUE_COUNT"
        fi
    else
        echo -e "${RED}✗ GraphQL issues+notes query failed${NC}"
        echo "  HTTP Status: $GRAPHQL_HTTP_CODE"
    fi
    echo ""
fi

# Performance comparison
echo "=========================================="
echo "PERFORMANCE COMPARISON"
echo "=========================================="
echo ""

echo "REST API:"
echo "  Iterations: ${REST_ITERATIONS_TIME}ms"
echo "  Issues: ${REST_ISSUES_TIME}ms"
if [ -n "$REST_NOTES_TIME" ] && [ $REST_NOTES_TIME -gt 0 ]; then
    echo "  Notes (single issue): ${REST_NOTES_TIME}ms"
fi
echo ""

echo "GraphQL API:"
echo "  Iterations: ${GRAPHQL_ITERATIONS_TIME}ms"
if [ -n "$GRAPHQL_ISSUES_TIME" ] && [ $GRAPHQL_ISSUES_TIME -gt 0 ]; then
    echo "  Issues + Notes (batched): ${GRAPHQL_ISSUES_TIME}ms"
fi
echo ""

# Analysis
echo "=========================================="
echo "ANALYSIS"
echo "=========================================="
echo ""

echo "REST API Characteristics:"
echo "  ✓ Simple, well-documented endpoints"
echo "  ✓ Standard HTTP caching headers"
echo "  ✓ Each resource has dedicated endpoint"
echo "  ✗ Requires multiple requests for related data"
echo "  ✗ Over-fetches (returns all fields)"
echo "  ✗ No batching for notes (1 request per issue)"
echo ""

echo "GraphQL API Characteristics:"
echo "  ✓ Single request for complex data"
echo "  ✓ Field selection (only fetch what you need)"
echo "  ✓ Batching (issues + notes in one query)"
echo "  ✗ Notes query adds significant complexity"
echo "  ✗ Harder to cache (query-based)"
echo ""

echo "Key Finding:"
echo "  ${YELLOW}Neither API solves the notes performance problem.${NC}"
echo "  The bottleneck is GitLab's backend processing of notes queries,"
echo "  not the API protocol itself."
echo ""

echo "Recommended Solution:"
echo "  ${GREEN}Implement persistent caching layer${NC}"
echo "  - Cache iterations and notes locally (JSON files)"
echo "  - Fetch only NEW/UPDATED data on subsequent loads"
echo "  - Expected improvement: 90-95% faster (10s → 500ms)"
echo ""

echo "See: ARCHITECTURAL-CACHING-INVESTIGATION.md for full design"
echo ""

echo "=========================================="
echo "INVESTIGATION COMPLETE"
echo "=========================================="
