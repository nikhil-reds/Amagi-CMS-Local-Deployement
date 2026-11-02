# News Simulation API

All endpoints require a signed-in session cookie. Responses are JSON.

## Read all screens

`GET /api/news-simulation`

Returns the 12 saved screen records ordered by screen number.

## Read one screen

`GET /api/news-simulation/{screenNumber}`

Use screen numbers 1–12, for example `/api/news-simulation/1` or `/api/news-simulation/12`.

Example response (timestamps omitted):

```json
{
  "screenNumber": 1,
  "name": "Screen 1",
  "port": 3000,
  "url": "http://localhost:3000/view/screen/1"
}
```

The response also includes `createdAt` and `updatedAt`.

## Save the universal port for all screens

`PUT /api/news-simulation`

Requires ADMIN or EDITOR role and `Content-Type: application/json`.

```json
{ "port": 3001 }
```

Accepts integer ports 3000–3011. Saves all 12 screens and their generated URLs in one transaction and returns the saved records. Individual screen ports cannot be updated separately because the port is universal.

## Error responses

- `400`: Invalid screen number or port.
- `401`: Not signed in.
- `403`: Insufficient role for saving.
- `404`: Screen record does not exist.
- `500`: Database operation failed.

The saved URLs describe the configured screen addresses. These APIs return configuration data; they do not start localhost servers or create viewer content.
