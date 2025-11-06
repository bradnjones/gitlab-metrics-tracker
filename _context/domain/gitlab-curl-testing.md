# GitLab GraphQL Testing with curl

**Version:** 1.0  
**Created:** 2025-01-06  
**Purpose:** Test GraphQL queries against real GitLab API using curl

---

## Setup

### Environment Variables

```bash
# Set these in your shell session (DO NOT commit)
export GITLAB_URL="https://gitlab.com"
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
export GITLAB_GROUP="smi-org/dev"
```

### Basic curl Template

```bash
curl "${GITLAB_URL}/api/graphql" \
  --header "Authorization: Bearer ${GITLAB_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{"query": "YOUR_QUERY_HERE"}'
```

---

## Quick Test: Authentication

```bash
curl "${GITLAB_URL}/api/graphql" \
  -H "Authorization: Bearer ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{currentUser{id username name}}"}' | jq
```

**Expected:** Your user ID, username, and name

---

## Quick Test: Group Access

```bash
curl "${GITLAB_URL}/api/graphql" \
  -H "Authorization: Bearer ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query{group(fullPath:\\\"${GITLAB_GROUP}\\\"){id name}}\"}" | jq
```

**Expected:** Group ID and name

---

## Related Documentation

- **gitlab-query-reference.md** - Full query patterns
- **gitlab-api-patterns.md** - API strategies
- **GitLab Docs:** https://docs.gitlab.com/ee/api/graphql/

---

**Remember:** Test queries with curl before implementing. Validates syntax and authentication. 🚀
