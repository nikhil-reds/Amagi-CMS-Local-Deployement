# News Simulation API

All endpoints require a signed-in session cookie. Responses are JSON.

## Read all screens

`GET /api/news-simulation`

Returns the 18 saved screen records ordered by screen number. Screens 1–12 retain their existing names; screens 13–18 are named `broadcast01` through `broadcast06`.

Screen URLs use `/screen1` through `/screen12`. Broadcast URLs use `/broadcast1` through `/broadcast6`, respectively.

## Read one screen

`GET /api/news-simulation/{screenNumber}`

Use screen numbers 1–18, for example `/api/news-simulation/1` or `/api/news-simulation/18`.

Example response (timestamps omitted):

```json
{
  "screenNumber": 1,
  "name": "Screen 1",
  "port": 3000,
  "url": "http://localhost:3000/screen1"
}
```

The response also includes `createdAt` and `updatedAt`.

## Save the universal port for all screens

`PUT /api/news-simulation`

Requires ADMIN or EDITOR role and `Content-Type: application/json`.

```json
{ "port": 3001 }
```

Accepts integer ports 3000–3011. Saves all 18 screens and their generated URLs in one transaction and returns the saved records. Individual screen ports cannot be updated separately because the port is universal.

## Error responses

- `400`: Invalid screen number or port.
- `401`: Not signed in.
- `403`: Insufficient role for saving.
- `404`: Screen record does not exist.
- `500`: Database operation failed.

Simulation URLs point to the simulation service, for example `http://localhost:3000/screen1`. The CMS embeds these addresses directly; the service at the selected port supplies the pages and must allow embedding. No document selection is required. Broadcast addresses remain configuration records.

## Simulation lifecycle

`GET /api/news-simulation/session` returns the persisted active state, destination screen IDs, and available screens. Requires a signed-in session.

`POST /api/news-simulation/session` requires ADMIN or EDITOR. To start:

```json
{ "action": "start", "targetScreenIds": ["screen-id-1", "screen-id-2", "screen-id-3", "screen-id-4"] }
```

Destinations receive saved URLs 1–3, 4–6, 7–9, and 10–12 in vertical rows. No CMS-generated document viewer is inserted. Screen assignments and controls are preserved; changes to original assignments during simulation appear when it ends.

To end, send `{ "action": "end" }`. Repeated starts/ends are idempotent. Lifecycle changes serialize in the database, touch screen revisions and publish live snapshots. Players that reconnect load the persisted mode. A delivery failure returns a warning; reconnect affected players. Port changes return 409 while active.
