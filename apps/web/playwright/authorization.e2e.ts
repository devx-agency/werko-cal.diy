import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test("non-catalog application pages send guests to login on direct visits and reloads", async ({ page }) => {
  for (const pathname of ["/more", "/refer", "/upgrade"]) {
    await page.goto(pathname);
    await expect(page).toHaveURL(/\/auth\/login\?/);
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(pathname);

    await page.reload();
    expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(pathname);
  }
});

test("booking pages send guests to login, then return to the requested local page", async ({
  page,
  users,
}) => {
  const host = await users.create();
  const bookingPath = `/${host.username}/30-min`;

  await page.goto(bookingPath);
  await expect(page).toHaveURL(/\/auth\/login\?/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(bookingPath);

  await page.reload();
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(bookingPath);

  const embedPath = `${bookingPath}/embed?embed=authorization-test`;
  await page.goto(embedPath);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(embedPath);
  await page.reload();
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(embedPath);

  await page.goto(bookingPath);
  await page.locator('[data-testid="login-form"] #email').fill(host.email);
  await page
    .locator('[data-testid="login-form"] #password')
    .fill(`${host.username!.charAt(0).toUpperCase()}${host.username!.slice(1)}1`);
  await Promise.all([
    page.waitForURL((url) => url.pathname === bookingPath),
    page.locator('[data-testid="login-form"] [type="submit"]').click(),
  ]);

  expect((await page.reload())?.status()).toBe(200);
});

test("booking REST endpoints reject unauthenticated direct calls", async ({ page }) => {
  const singleBookingResponse = await page.request.post("/api/book/event", {
    data: {},
  });
  const recurringBookingResponse = await page.request.post("/api/book/recurring-event", {
    data: [{}],
  });

  expect(singleBookingResponse.status()).toBe(401);
  expect(recurringBookingResponse.status()).toBe(401);
});

test("a USER can open only a booking where they are an attendee, including after reload", async ({
  page,
  users,
  bookings,
}) => {
  const host = await users.create();
  const outsider = await users.create();
  const attendee = await users.create({ email: "permitted-attendee@example.com" });
  const booking = await bookings.create(host.id, host.username, host.eventTypes[0].id, {
    attendees: {
      create: {
        email: attendee.email,
        name: attendee.name ?? "Booking attendee",
        timeZone: "Europe/London",
      },
    },
  });

  await page.goto(`/booking/${booking.uid}`);
  await expect(page).toHaveURL(/\/auth\/login\?/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(`/booking/${booking.uid}`);
  await page.reload();
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(`/booking/${booking.uid}`);

  await outsider.apiLogin();
  expect((await page.goto(`/booking/${booking.uid}`))?.status()).toBe(404);
  expect((await page.reload())?.status()).toBe(404);

  await users.logout();
  await attendee.apiLogin();
  expect((await page.goto(`/booking/${booking.uid}`))?.status()).toBe(200);
  expect((await page.reload())?.status()).toBe(200);
});
