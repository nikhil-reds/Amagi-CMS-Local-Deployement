# Centrifugo screen updates

The browser player, XOS desktop player, and connected Control page use WebSocket-only Centrifugo subscriptions. Each connection performs one credential request and one initial snapshot read after subscribing. Media and control updates then arrive in publications; there are no recurring CMS requests, automatic reconnects, cached-content recovery, fallback transports, or retry queues.

## Control sessions

Select a screen and click **Connect**. The session lasts five minutes; the timer is local. Disconnect, expiry, screen changes and page unmount close the socket. Controls are disabled while disconnected. The API also validates a signed, user- and screen-scoped five-minute credential on every control write. Player subscriptions are independent and remain active after the controller disconnects.

## Configuration

Set `CENTRIFUGO_HTTP_URL`, `CENTRIFUGO_PUBLIC_URL` (a ws/wss URL), `CENTRIFUGO_API_KEY`, and `CENTRIFUGO_TOKEN_SECRET`. Keep the Centrifugo token secret and HTTP API key consistent with the app. `centrifugo/config.json` requires channel-scoped subscription tokens. Restart Centrifugo after changing its configuration.

Writes commit to PostgreSQL and publish the latest screen snapshot. A monotonic database timestamp identifies its revision, so an initial snapshot or delayed publication cannot overwrite newer state. Publication failure is reported separately from database success; clients must explicitly reconnect to read saved state. No background recovery is scheduled. A deleted screen closes its subscriptions.

Normal media playback, WebSocket heartbeat messages, the on-screen countdown, and explicitly configured website auto-refresh are distinct from CMS state polling. The browser player and desktop renderer preserve media instances for controls-only updates.

## Updated desktop app

Build with `npm run dist --prefix desktop`. The portable executable is `desktop/dist/AmagiScreenPlayer-1.0.0.exe`. Copy it to `public/XOS.exe` for the sidebar download. Existing running installations must be closed and replaced with this build; older executables still contain their original polling code.

## Validation

- `npm run test:realtime`: isolated lifecycle tests, including ten simulated idle minutes, disconnected transport, stale events, initial-snapshot races and credential expiry.
- `npm run test:realtime:integration`: actual local CMS, PostgreSQL and Centrifugo; temporary records are cleaned up.
- `npm run test:realtime:browser`: installed Chrome; verifies Connect, five-minute expiry, player media reuse and absence of recurring control reads. Also tests the desktop HTML renderer.

The live suites default to `http://localhost:3001`; set `REALTIME_TEST_ORIGIN` to use another app origin. They load local service configuration from `.env`. The production app container must be rebuilt to deploy these source changes to its port.
