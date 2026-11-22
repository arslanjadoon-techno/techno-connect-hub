# OTP Request and RTBDI Integration Design

## 1. Purpose

This document describes how a user requests up to three OTPs, how a manager approves the request, how the application reserves OTPs from the RTBDI database, and how the OTPs are delivered privately to the requester.

The OTP is used in a third-party portal. TechnoComm reserves the OTP but does not use it in that portal and does not automatically mark it as `Used`.

## 2. Requirements

- A requester can ask for 1, 2, or 3 OTPs.
- A requester can select one of their assigned stores.
- The selected store is shown immediately above the request reason.
- The manager must approve the request before OTPs are reserved.
- The selected User Management store must map to an RTBDI store through `TechId`/`StoreCode`.
- All requested OTPs must be available. Partial reservation is not allowed.
- OTP values are sent only to the requester in a private chat message.
- The group chat receives an approval message without OTP values.
- No database migration is required.
- Backoffice approval logic and UI are removed from the application. Existing database columns are left untouched.

## 3. High-level flow

```text
Requester selects type, store, reason, quantity (1-3)
        |
        v
Chat message + chat_otp_requests row created
        |
        v
Manager sees the pending request
        |
        v
Manager approves
        |
        v
Resolve User Management StoreId -> TechId
        |
        v
Resolve RTBDI StoreCode -> PortalStoreId
        |
        v
Resolve request type -> enabled RTBDI module
        |
        v
Reserve exactly the requested number of Available OTP rows
        |
        v
Set manager approval status
        |
        +--> Send OTP values to requester privately
        +--> Send non-sensitive approval message to group
        +--> Send non-sensitive app notification
```

## 4. Requester store mapping

The store ID selected in the UI belongs to User Management. It is not the RTBDI `PortalStoreId`.

Example:

| System | Value |
| --- | --- |
| User Management store ID | `393` |
| Store name | `537 S AZUSA WAY-SYS-1000` |
| User Management `TechId` | `TECH537` |
| RTBDI `StoreCode` | `TECH537` |
| RTBDI `PortalStoreId` | `24567` |

The approval endpoint performs this mapping:

1. Read the requester ID, selected User Management store ID, and store name from the OTP request.
2. Confirm that the store is assigned to the requester.
3. Read the store's `TechId`.
4. Use that `TechId` as the RTBDI `StoreCode`.
5. Find an RTBDI store where `StoreCode` matches exactly and `IsEnabled = 1`, `IsClosed = 0`.
6. Use the resulting RTBDI `PortalStoreId` for stock operations.

This prevents an ordinary User Management store ID from being incorrectly used as an RTBDI store ID.

If a user has multiple stores, the request includes the selected store ID and name. The backend validates that exact assignment instead of assuming the user's first store.

## 5. Request type to RTBDI module mapping

The backend reads enabled rows from `RTBDIOtpModule` and maps the user-facing request type to a module.

| Request type | RTBDI module | Example module name |
| --- | --- | --- |
| QPay removal | `1089` | Can Void QPay Transaction |
| Refund | `79` | Refund Item on invoice |
| Payment type change | `50` | Change Payment Type |

The module must exist and be enabled. If it cannot be resolved, approval returns an RTBDI availability error and the request remains pending.

`RTBDIOtpModule.DefaultTargetQuantity` is module configuration/stock guidance. The user's requested quantity is the quantity that must be reserved for the approval. The application does not silently reduce a request from 3 OTPs to 1 OTP.

## 6. RTBDI reservation logic

The relevant existing tables are:

- `RTBDIOtpStore`
- `RTBDIOtpModule`
- `RTBDIOtpCode`

The reservation transaction does the following:

1. Start a transaction on the RTBDI connection.
2. Check whether the same consumer already reserved the requested OTPs. This makes execution-strategy retries idempotent.
3. Select the oldest available rows for the resolved `PortalStoreId` and `PortalModuleId` using `FOR UPDATE`.
4. Require the number of available rows to equal the requested quantity.
5. Update every selected row from `Available` to `Reserved`.
6. Set `ReservedBy`, `ReservedUtc`, and a unique `ClaimToken` on each row.
7. Commit the RTBDI transaction.
8. Return the OTP values to the approval workflow.

If the requester needs 3 OTPs but only 2 are available, none are reserved. The manager receives an error such as:

```text
Only 2 OTPs are available, but this request needs 3 for <store>. Please contact the Developers team to replenish the OTP stock.
```

## 7. `ReservedBy` and `ClaimToken`

### `ReservedBy`

`ReservedBy` identifies the TechnoComm approval request and manager that reserved the row.

Example:

```text
ChatOtp:d481e3ab-788c-421b-9df1-28a4c030af98:2
```

The format is:

```text
ChatOtp:<chat-request-id>:<manager-user-id>
```

For a request needing 3 OTPs, all three rows receive the same `ReservedBy` value. This allows the reservation to be audited and allows a retry to find the same reservation.

### `ClaimToken`

`ClaimToken` is a unique GUID for one reserved OTP row. It is not the OTP and it is not sent to the requester.

Example:

```text
8f4a1c2e-6f5a-4b6f-9d77-123456789abc
```

For 3 OTPs, each row receives its own claim token. The token prevents an unrelated process from changing the wrong reserved row.

## 8. OTP status lifecycle

```text
Available -> Reserved -> Used
                 |
                 +-> Invalid, if invalidated by an authorized RTBDI process
```

- `Available`: can be selected for a new request.
- `Reserved`: allocated to one approved TechnoComm request but not yet confirmed as used in the third-party portal.
- `Used`: the external portal operation confirmed that the OTP worked.
- `Invalid`: the OTP is no longer valid.

TechnoComm currently performs only the transition to `Reserved`. It must not set `Used` merely because the manager approved the request or because the private message was sent.

The supplied `02_MarkOtpUsed.sql` demonstrates the intended later operation: update by OTP `Id`, matching `ClaimToken`, and `Status = 'Reserved'`. That operation should happen only after the authorized third-party portal/POS operation confirms success.

## 9. Approval transaction boundaries

There are two database connections:

- TechnoComm Chat/User Management database.
- RTBDI database through `RtbdiAutomationConnection`.

The RTBDI reservation is committed before the TechnoComm request status is committed. The same `ReservedBy` value makes a retry safe if the application loses the response after RTBDI commits.

The approval endpoint uses the EF execution strategy for the TechnoComm transaction. This is required because `MySqlRetryingExecutionStrategy` does not support a manually started transaction unless the complete transaction is executed through `CreateExecutionStrategy().ExecuteAsync(...)`.

The chat request row is locked with `FOR UPDATE`, preventing two managers from approving the same request concurrently.

## 10. Private notification behavior

After the approval and reservation succeed:

- The private chat message contains the requested OTP values.
- The group message contains only the approval result and never contains OTP values.
- The app notification contains only a safe instruction to open the private chat.

OTP approval private messages are sent through SignalR immediately after persistence. They are not delayed behind the normal chat background notification queue. This prevents the message from appearing only after a page refresh.

The API response includes:

```json
{
  "decisionSaved": true,
  "privateNotificationSent": true,
  "appNotificationSent": true,
  "groupNotificationSent": true
}
```

`privateNotificationSent = true` means the server completed the SignalR send call without an exception. It does not mean the requester read the message. If the requester was offline, the durable private message is still available when chat history is loaded.

The chat message has a maximum text length of 255 characters. The compact OTP template is intended for normal short OTP values. If RTBDI returns unusually long values, the application must report a delivery failure rather than silently truncating an OTP.

## 11. Failure behavior

| Failure | Result |
| --- | --- |
| Store is not assigned to requester | Approval fails; request remains pending |
| Store has no `TechId` | Approval fails; request remains pending |
| RTBDI store code not found/enabled | Approval fails; request remains pending |
| RTBDI module not found/enabled | Approval fails; request remains pending |
| Fewer OTPs available than requested | No partial reservation; request remains pending |
| Same approval request retried | Existing reservation is reused through `ReservedBy` matching |
| Private SignalR delivery fails | Approval remains saved; response reports `privateNotificationSent = false`; message remains in history |
| Third-party portal rejects OTP | TechnoComm does not mark it `Used`; an authorized process must decide whether to invalidate or release it |

## 12. Stock verification queries

Use the RTBDI `StoreCode`, not the User Management numeric store ID:

```sql
SELECT
    PortalStoreId,
    PortalModuleId,
    Status,
    COUNT(*) AS Total
FROM RTBDIOtpCode
WHERE PortalStoreId = 21903
  AND PortalModuleId = '79'
GROUP BY PortalStoreId, PortalModuleId, Status;
```

To inspect TechnoComm reservations without exposing OTP values:

```sql
SELECT
    Id,
    PortalStoreId,
    PortalModuleId,
    Status,
    ReservedBy,
    ReservedUtc,
    ClaimToken
FROM RTBDIOtpCode
WHERE Status = 'Reserved'
  AND ReservedBy LIKE 'ChatOtp:%'
ORDER BY ReservedUtc DESC;
```

Do not log or share `OtpCode` values or claim tokens unnecessarily.

## 13. Relationship to the supplied SQL documents

The supplied scripts are operational references, not application migrations:

- `01_ClaimOtp.sql` shows the single-OTP locking and reservation pattern.
- `02_MarkOtpUsed.sql` shows how an authorized process can mark a reserved OTP as used after the external operation succeeds.
- `03_ViewStock.sql` shows stock reporting and references `RTBDIOtpStoreModule` target overrides.

The current application extends the claim pattern to a quantity of 1-3 and reads the tables needed for store, module, and OTP code resolution. It does not require `RTBDIOtpStoreModule` for approval and does not run any of the scripts automatically.

No migration is created or executed. Existing RTBDI tables and existing unused Chat OTP columns remain unchanged.

## 14. Test plan

### Happy path

1. Assign the requester a User Management store whose `TechId` has RTBDI stock. `TECH100` with module `79` and 3 available OTPs is a suitable test example from the supplied stock data.
2. Create a request for 1 OTP and approve it.
3. Confirm one RTBDI row changes to `Reserved`.
4. Confirm the requester receives one private OTP message without refreshing.
5. Confirm the group message contains no OTP.

### Quantity tests

- Request 2 and verify exactly 2 rows are reserved.
- Request 3 and verify exactly 3 rows are reserved.
- Request 3 with only 2 available and verify that zero new rows are reserved.
- Verify quantities greater than 3 are rejected by the API and UI.

### Retry and concurrency tests

- Retry the same approval request and verify the same reserved OTP rows are returned.
- Submit two approvals for the same request concurrently and verify only one succeeds.
- Disconnect the requester before approval and verify the message is available from history after reconnecting.
- Keep the requester connected and verify the private message appears without refresh.

### Security tests

- Verify OTP values never appear in the group message.
- Verify OTP values never appear in app notification text or logs.
- Verify a manager cannot approve a request assigned to a different manager.
- Verify a requester cannot reserve OTPs for an unassigned store.
- Verify a used OTP cannot be reserved again.

## 15. Operational checklist

- Confirm the API is running the latest backend build after changes.
- Confirm `RtbdiAutomationConnection` is configured in the environment without exposing credentials in logs.
- Confirm the RTBDI store is enabled and not closed.
- Confirm the module is enabled.
- Confirm enough `Available` rows exist for the selected store/module.
- Inspect `privateNotificationSent` after approval.
- If a previous test left rows in `Reserved`, identify them by the exact `ReservedBy` value before taking any corrective action.
- Never mark an OTP `Used` until the third-party portal confirms that it worked.
