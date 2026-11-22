# M1 account entry

Every destination requires a session. Opening a link while signed out shows the
same entry screen. The app mounts walk state only for the signed-in account.
The confirmation and recovery emails use codes entered on the same screen.
Saved walks are a separate M1 task.

## Local setup

From the repository root with Docker running:

```sh
npx --yes supabase@2.122.1 start -x studio,storage-api,imgproxy,realtime,edge-runtime,logflare,vector,supavisor
```

In prototype/map, install dependencies with npm ci. Run npm test for the
domain and browser acceptance suite. Browser tests use the local service and its
test mailbox. Local confirmation and recovery messages appear in Mailpit on
http://localhost:54324. Use synthetic addresses for local testing.

For interactive testing copy prototype/map/.env.example to .env.local beside
it. Set the URL and publishable key from the development backend. Use only the
public client key in Expo configuration. The iPhone must reach the backend URL
independently of the Expo tunnel. For a hosted development project, apply the
profile migration, enable email confirmations, and copy both email templates
from supabase/templates into the corresponding Supabase Auth email settings.

Install a development build containing expo-secure-store for native testing.
Restart Metro with npx expo start --dev-client --tunnel. A native rebuild also
installs the new home screen icon.

## Device acceptance

1. Open the app signed out. Expect Wayborn account entry and no GPS request.
2. Create an account, enter the emailed verification code and expect Map.
3. Force-close and reopen. Expect the same signed-in session.
4. Sign out in Profile and reopen. Every tab must remain behind account entry.
5. Select Forgot password, enter the emailed code and a new password. Confirm
   the old password fails and the new password opens the app.
6. Sign in as a different player. Activity must start without the first
   player's session history. Record build, OS and observed results.
