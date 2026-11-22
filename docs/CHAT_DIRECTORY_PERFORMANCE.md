# Chat directory and conversation-list performance

## Runtime behavior

- `GET /api/v1/chat/users` is query-driven and paginated. The chat UI requests 50
  users at a time with `search`, `page`, and `pageSize`; the endpoint returns
  `pagination.hasMore` and caps a page at 100 users.
- Group creation and add-member dialogs replace the current page when the query
  changes and append only the next page when **Load more people** is selected.
  A request sequence guard prevents an older search response from replacing a
  newer query. The endpoint remains authenticated and keeps `excludeSelf` and
  the existing active-user filtering.
- Conversation derivation builds identity indexes and one latest-message index
  per sidebar data update. A row performs map lookups instead of scanning and
  sorting the complete cached message history. Row memoization compares the
  values rendered by that row, so rebuilding the list for another conversation
  does not automatically repaint every row.

## Profiling scenario

Use a production build and seed the authenticated chat session with:

- 5,000 active directory users;
- 500 conversations, including direct conversations with mixed participant
  identity fields; and
- 100 cached messages per conversation.

In Chrome DevTools Performance, record these flows separately:

1. Open the group picker with an empty query. Confirm the first request is
   `page=1&pageSize=50`, then load two more pages.
2. Search for a term matching at least 200 users. Confirm each query change
   replaces results and requests only one 50-user page.
3. Open the sidebar, switch conversations, receive a message, update unread
   state, and change presence. Inspect React commits and the Performance flame
   chart; work should be proportional to the index build plus changed rows, not
   `conversationCount × cachedMessageCount`.

Record request count, commit duration, and the number of rendered
`ConversationListItem` instances in the audit report. The expected directory
request size is 50 (never 1,000), and the expected sidebar path contains no
per-row full-history sort.
