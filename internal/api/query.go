package api

import (
	"net/http"
	"strconv"

	"charstle/internal/store"
)

func storeQuery(r *http.Request) store.Query {
	q := r.URL.Query()
	offset, _ := strconv.Atoi(q.Get("offset"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 {
		limit = 500
	}
	return store.Query{
		Keyword:  q.Get("keyword"),
		ClientIP: q.Get("clientIp"),
		Offset:   offset,
		Limit:    limit,
	}
}
