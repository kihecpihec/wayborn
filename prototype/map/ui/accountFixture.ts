import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

export async function mailboxCode(email: string, subject: string) {
  let code = "";
  await expect
    .poll(
      async () => {
        const inbox = await (
          await fetch("http://127.0.0.1:54324/api/v1/messages")
        ).json();
        const message = inbox.messages.find(
          (m: { Subject: string; To: { Address: string }[] }) =>
            m.Subject === subject &&
            m.To.some((recipient) => recipient.Address === email),
        );
        if (message) {
          const content = await (
            await fetch("http://127.0.0.1:54324/api/v1/message/" + message.ID)
          ).json();
          code = content.Text.match(/\b\d{6}\b/)?.[0] ?? "";
        }
        return code.length;
      },
      { timeout: 15000 },
    )
    .toBe(6);
  return code;
}

export async function register(page: Page) {
  const email = randomUUID() + "@example.test";
  const password = randomUUID();
  await page.goto("/");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByLabel("Email code")
    .fill(await mailboxCode(email, "Verify your Wayborn account"));
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByRole("tab", { name: "Map", exact: true })).toBeVisible();
  return { email, password };
}
