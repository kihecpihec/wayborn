# Set up Wayborn authentication email

This guide documents the Neoserv → Resend → Supabase setup configured on
23 November 2026 for signup verification and password recovery. It belongs to
M1 account infrastructure; it does not mark AUTH or M1 complete.

## Configuration

| Setting | Value |
| --- | --- |
| Registered domain | `ismarr.eu` |
| DNS provider | Neoserv |
| Resend sending domain | `wayborn.ismarr.eu` |
| Resend region | Ireland (`eu-west-1`) |
| Sender address | `noreply@wayborn.ismarr.eu` |
| Sender name | `Wayborn` |
| Supabase project reference | `hltnlqwlfswepktnkcvp` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465` (TLS) |
| SMTP username | `resend` |
| SMTP password | Dedicated Resend API key; never put its value in this file |

Neoserv hosts the DNS records. Resend sends the email. Supabase generates and
verifies the authentication codes and submits the messages through Resend SMTP.
The sending address does not require a Neoserv mailbox. Receiving replies would
need a separate mailbox or routing setup; this guide configures outbound mail.

## 1. Create the Resend sending domain

1. Sign in to [Resend](https://resend.com).
2. Open **Domains → Add domain**.
3. Enter `wayborn.ismarr.eu` and choose Ireland (`eu-west-1`).
4. Add the domain and keep its DNS instructions open.
5. Enable sending. Receiving is not needed for authentication email.

Use the exact record names and values shown by Resend for this domain. A recreated
domain can receive different records or a different DKIM public key.

## 2. Add DNS records at Neoserv

1. Sign in to [Moj NEOSERV](https://moj.neoserv.si).
2. Open **Storitve → Gostovanje → Zeleni paket (ismarr.eu)**.
3. Use the hosting login shortcut to enter **cPanel**.
4. Open **Domains → Zone Editor → Manage** for `ismarr.eu`.
5. Add each record from Resend and save it.

The records issued for the current setup were:

| Type | Name relative to `ismarr.eu` | Value | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.wayborn` | Copy the complete `p=...` DKIM public key from Resend | `300` |
| CNAME | `rsend.wayborn` | `rsend-euw1.forge.rmta.net` | `300` |
| CNAME | `send.wayborn` | `send.forge.rmta.net` | `300` |

In cPanel, full names such as `send.wayborn.ismarr.eu.` are also accepted.
Check that the saved name contains `ismarr.eu` only once. Copy full values using
Resend's copy control; visually shortened values containing `[…]` are incomplete.

These CNAME records were issued by Resend Forge for this setup. Do not substitute
MX/SPF records from an older tutorial. Preserve the existing root-domain website,
MX, SPF and DKIM records when adding these three new records.

6. Return to Resend and click **I've added the records**.
7. Wait until the domain is **Verified** and sending is ready. DNS propagation
   and Resend verification may take time.

Optional DNS checks, from a terminal with `dig` installed:

```sh
dig +short TXT resend._domainkey.wayborn.ismarr.eu
dig +short CNAME rsend.wayborn.ismarr.eu
dig +short CNAME send.wayborn.ismarr.eu
```

The TXT result must match Resend's full public key; the CNAME results must match
the targets above. Public DNS visibility alone does not prove email delivery.

## 3. Create the SMTP credential

1. In Resend, open **API keys → Create API key**.
2. Name it `Wayborn Supabase SMTP`.
3. Select **Sending access**. Restrict it to `wayborn.ismarr.eu` if the domain
   selector allows it.
4. Create the key and copy it directly into Supabase's SMTP password field.
   Save a copy in a password manager if needed; Resend displays it only once.

The key created during this setup has **Sending access** for **All domains**;
the domain selector offered no individual domain while verification was pending.
It has no full administrative API access.

Never put this key in Git, an `EXPO_PUBLIC_*` variable, `eas.json`, screenshots or
logs. It is a server-side SMTP credential, separate from the public Supabase
publishable key used by the app.

## 4. Configure Supabase SMTP

1. Open the [Wayborn email settings](https://supabase.com/dashboard/project/hltnlqwlfswepktnkcvp/auth/templates).
2. Select **SMTP Settings** and enable **custom SMTP**.
3. Fill in the sender address, sender name, host, port and username from the
   configuration table above. Paste the Resend key into **Password**.
4. Click **Save changes**.
5. Reload the page and verify custom SMTP remains enabled and the saved fields
   are correct. Supabase hides the stored password.
6. Under **Authentication → Sign In / Providers → Email**, ensure email signup
   and **Confirm email** are enabled for the verification flow.

Custom SMTP unlocks email-template editing for this hosted project. Supabase
and Resend rate limits still apply; inspect their dashboards for current limits.

## 5. Configure the authentication templates

In **Authentication → Emails → Templates**, edit these two templates and save
each separately. Preserve the Go template placeholder `{{ .Token }}` exactly.
It generates the code that the user enters in Wayborn.

### Confirm sign up

Subject: `Verify your Wayborn account`

```html
<p>Enter this code in Wayborn to verify your email: <strong>{{ .Token }}</strong></p>
```

Repository copy: [confirmation.html](../supabase/templates/confirmation.html).

### Reset password

Subject: `Reset your Wayborn password`

```html
<p>Enter this code in Wayborn to reset your password: <strong>{{ .Token }}</strong></p>
```

Repository copy: [recovery.html](../supabase/templates/recovery.html).

Reload each template to confirm the subject and body persisted. The current app
uses code entry; changing these templates to link-only messages would require a
corresponding app-flow change.

Local templates are referenced by [config.toml](../supabase/config.toml).
Editing local files does not update the hosted dashboard automatically. Do not
push the entire local configuration just to update email: local URLs and other
auth settings may differ from the hosted project. No database migration is
needed for SMTP or template changes.

## 6. Verify the complete flow

Use an email inbox you control and the app configured for this hosted project.

1. Register a new test account in Wayborn. Confirm the email arrives from the
   configured sender, contains a code, and appears in Resend's **Emails** log.
2. Enter the code in Wayborn and confirm account verification and sign-in work.
3. For that existing account, request a password reset. Confirm a second message
   arrives with the recovery subject and code.
4. Complete recovery in Wayborn. Check the new password works and the old one
   fails. Check an incorrect or expired code is rejected.
5. Record the date, build/device, observed results and delivery status. Do not
   include codes, passwords or session tokens in evidence.

A successful password-reset HTTP response does not prove that a message was
sent: the endpoint avoids revealing whether an account exists. Check an existing
account, Resend delivery events and the recipient inbox before claiming success.

### Evidence from 23 November 2026

- All three records resolved through public DNS.
- Resend reported the domain verified and ready to send.
- Supabase custom SMTP stayed enabled after reload with the intended sender,
  host, port and username; the password was stored and hidden.
- Both saved template subjects and bodies were checked after reload.
- The private-profile migration was applied through the linked CLI; local and
  hosted migration histories both contain `202611220001`.
- Hosted tests verified profile creation, real sign-in with two synthetic accounts,
  account isolation, and denied anonymous/client writes. Cleanup was verified.
- A temporary `wayborn-auth-test@ismarr.eu` mailbox received both signup and
  recovery messages through Resend SMTP. Resend reported both as delivered.
- The web app connected to hosted Supabase accepted the signup code and exposed
  only the signed-in account's profile. Recovery rejected an incorrect code,
  accepted the delivered code, rejected the old password and accepted the new one.
- These were desktop browser and real mailbox checks. Expiry timing and native
  device behavior were not tested by this run.
- This setup is not evidence of physical-device acceptance or M1 completion.

### Repeat the hosted database checks

From the repository root, authenticate the Supabase CLI if necessary, then:

```sh
npx --yes supabase@2.122.1 link --project-ref hltnlqwlfswepktnkcvp
npx --yes supabase@2.122.1 db push --linked --dry-run
npx --yes supabase@2.122.1 db push --linked
npx --yes supabase@2.122.1 migration list --linked
npx --yes supabase@2.122.1 db lint --linked
cd prototype/map
npx tsx scripts/checkHostedAccounts.ts --run-hosted hltnlqwlfswepktnkcvp
```

The explicit hosted test creates and deletes two synthetic accounts. It obtains
credentials through the authenticated CLI in memory, never prints them, and
verifies cleanup. It does not send email or substitute for the inbox/app checks.
Review the dry-run migration list before applying any future migration.

## Troubleshooting and credential rotation

- **Domain stays pending:** compare the exact names and values in Resend and
  cPanel, check authoritative DNS, and allow propagation time. Registering a
  domain at Neoserv does not by itself prove its active DNS is hosted there.
- **Templates cannot be edited:** verify custom SMTP was saved and enabled.
- **Recovery responds successfully but no message appears:** verify the target
  account exists, then inspect Supabase Auth logs and Resend logs. Avoid repeated
  requests that trigger cooldowns or rate limits.
- **SMTP authentication fails:** check host, port, username and the Resend key's
  permissions. The password is the Resend API key, not a dashboard password.
- **Resend shows delivered but the inbox is empty:** check spam/junk and recipient
  filtering. Provider acceptance does not guarantee inbox placement.
- **Rotate the key:** create a replacement sending key, update and save the
  Supabase SMTP password, verify delivery, then revoke the old key in Resend.

Disabling custom SMTP returns the project to Supabase's restricted default sender;
it is not an equivalent fallback for this code-based email setup. Diagnose failures
without disabling email confirmation to bypass them.

## Provider documentation

- [Neoserv DNS hosting](https://www.neoserv.si/podpora/dns-gostovanje)
- [Resend SMTP integration with Supabase](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
