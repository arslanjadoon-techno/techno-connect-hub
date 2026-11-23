# Chat message rendering and cache retention

## Rendering policy

`ChatMessageList` keeps the canonical message order in the existing chat state,
but renders only the rows intersecting the scroll viewport plus a 720 px
overscan on either side. Row heights are measured with `ResizeObserver`; rows
that have not been rendered use a 92 px estimate until they enter the window.
This supports variable-height messages containing attachments, replies, and
reactions without adding a virtualization dependency.

The older-history sentinel remains at the top of the scroll container. When an
older page is prepended, the list compensates using the change in total
virtual content height, so the previously visible message stays anchored.
Search, pinned-message jumps, and reply jumps use the list's imperative
`scrollToMessage` handle. A loaded message can therefore be targeted even when
its row is currently outside the rendered window.

## IndexedDB retention policy

IndexedDB is a bounded reload/reconnect cache. The server remains the source of
truth for history and the durable `syncCursor` is advanced only after a page
and its cursor are committed successfully.

The automatic policy is:

- Keep at most 2,000 messages per cached conversation, retaining the newest
  messages when the limit is exceeded.
- Keep at most 40 conversation rows.
- Evict conversation rows that have not been updated for 30 days, subject to
  the unsynced-send exception below.
- Remove terminal (`accepted` or `cancelled`) pending-send records after seven
  days. They no longer need retry input or reconciliation protection.
- Run retention during cache writes and at most once per five minutes during a
  cache read.

An unsynced send is a pending, retrying, or failed send, a send marked with an
unknown outcome, or an optimistic message with one of those send states. Its
message and its conversation cache row are protected from automatic eviction.
The per-conversation message limit is allowed to exceed 2,000 when necessary
to preserve those sends. Terminal pending-send records are not deleted until
their retention period has elapsed.

Explicit chat-cache clearing also preserves unsynced optimistic messages. Full
database deletion on logout is a separate, user-initiated account cleanup and
removes all local data, including pending sends.

## Large-conversation verification

Use a conversation with at least 10,000 messages and profile the browser with
the Performance panel while scrolling from the newest page to older pages and
back to the bottom. Verify that:

1. The Elements panel contains only the visible rows plus overscan, not all
   10,000 message rows.
2. Prepending a page does not change the message at the user's viewport anchor.
3. Search, reply, reaction, pinned-message, and selection actions still target
   the correct message when it is outside the current render window.
4. IndexedDB remains within the message, conversation, and terminal-send
   limits after repeated history loads and reloads.
5. A pending or failed send remains present and retryable while retention runs.

The production build should be profiled separately from Vite development mode;
development instrumentation and React checks otherwise distort render timing.
