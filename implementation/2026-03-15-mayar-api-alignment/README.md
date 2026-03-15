# Mayar API Alignment - Implementation Plan

## Overview

Align all Mayar API integration in VibeClean with the official Mayar API documentation.

**Official Docs:** https://documenter.getpostman.com/view/25084670/2s8Z6x1sr8

---

## Mayar API Endpoints Summary

### 1. Invoice Create (`POST /invoice/create`)

**Official Request Body:**
```json
{
  "name": "andre jago",
  "email": "alikusnadide@gmail.com",
  "mobile": "085797522261",
  "redirectUrl": "https://kelaskami.com/nexst23",
  "description": "testing dulu pak",
  "expiredAt": "2026-04-19T16:43:23.000Z",
  "items": [{
    "quantity": 3,
    "rate": 11000,
    "description": "1e 1 sayam jago"
  }],
  "extraData": {
    "noCustomer": "827hiueqy271hj",
    "idProd": "contoh aja"
  }
}
```

**Official Response:**
```json
{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "df65d192-8396-4f9a-b4e5-8244648c07c5",
    "transactionId": "ca87fd13-8742-4d48-af33-7de1a417bc34",
    "link": "https://korban-motivator.mayar.shop/invoices/ycfyxbj2h3",
    "expiredAt": 1776617003000,
    "extraData": { ... }
  }
}
```

### 2. Payment Create (`POST /payment/create`)

**Official Request Body:**
```json
{
  "name": "Azumii",
  "email": "azumiikecee@gmail.com",
  "amount": 170000,
  "mobile": "08996136751",
  "redirectUrl": "https://web.mayar.id/",
  "description": "Testing ReqPayment",
  "expiredAt": "2025-12-29T09:41:09.401Z"
}
```

### 3. QRCode Create (`POST /qrcode/create`)

**Official Request Body:**
```json
{
  "amount": 10000
}
```

**Official Response:**
```json
{
  "statusCode": 200,
  "messages": "Success",
  "data": {
    "url": "https://media.mayar.id/images/resized/480/a30ed45f-976b-490f-b97c-72c90d1e8d9d.png",
    "amount": 10000
  }
}
```

---

## Changes Applied

### 1. TypeScript Types (`src/types/mayar.ts`)

| Field | Change |
|-------|--------|
| `MayarInvoiceData.expiredAt` | Simplified to `number` type |
| `MayarInvoiceData.extraData` | Changed to `Record<string, string>` |
| `MayarCreatePaymentRequest` | Added `amount` field, reorganized fields |
| `MayarWebhookPayload` | Added `nettAmount` field, simplified `extraData` |

### 2. Mayar Client (`src/lib/mayar.ts`)

| Field | Change |
|-------|--------|
| Sandbox URL | Updated to `https://sandbox-api.mayar.club/hl/v1` |

---

## Verification Status

| Check | Status |
|-------|--------|
| Invoice Create API | ✅ Matches official docs |
| Payment Create API | ✅ Matches official docs |
| QRCode Create API | ✅ Matches official docs |
| Webhook `nettAmount` field | ✅ Correctly used |
| Webhook status check | ✅ Uses `SUCCESS` |
| TypeScript compilation | ✅ No errors |

---

## Status

- [x] Analysis complete
- [x] Implementation plan approved
- [x] Types updated
- [x] Client library updated
- [x] Webhook handler verified
- [ ] All payment flows tested (requires runtime testing)

---

## Date

2026-03-15
