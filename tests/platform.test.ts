import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SignJWT, createLocalJWKSet, generateKeyPair } from "jose";
import {
  HandoffError, MAX_LIFETIME_SECONDS, canOpen, readHandoffConfig, safeNext, servicesFor, verifyHandoff,
} from "../src/index.js";

let publicKey: CryptoKey, privateKey: CryptoKey, other: CryptoKey;
before(async () => {
  ({ publicKey, privateKey } = (await generateKeyPair("ES256")) as { publicKey: CryptoKey; privateKey: CryptoKey });
  other = ((await generateKeyPair("ES256")) as { privateKey: CryptoKey }).privateKey;
});

const ISS = "https://demo-site.example.test";
const cfg = { issuer: ISS, audiences: ["banking", "app"] };
const NOW = 1_800_000_000;
const at = (o: number) => new Date((NOW + o) * 1000);
async function sign(over: Record<string, unknown> = {}, key?: CryptoKey) {
  const claims = {
    iss: ISS, aud: "banking", sub: "person-1", jti: "jti-1", iat: NOW, nbf: NOW, exp: NOW + 60, use: "handoff",
    roles: ["customer"], name: "Demo Customer", email: "Demo@Example.test", ...over,
  };
  const payload = Object.fromEntries(Object.entries(claims).filter(([, v]) => v !== undefined));
  return new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: "k1" }).sign(key ?? privateKey);
}
const invalid = (p: Promise<unknown>) => assert.rejects(p, (e) => e instanceof HandoffError && e.code === "invalid");

test("a token signed by the website's Python signer verifies here (cross-language fixture)", async () => {
  const f = JSON.parse(readFileSync(new URL("./fixtures/website-handoff.json", import.meta.url), "utf8"));
  const keys = createLocalJWKSet(f.jwks);
  const c = await verifyHandoff(f.token, { issuer: f.issuer, audiences: ["banking", "app"] }, keys, new Date((f.issuedAt + 10) * 1000));
  assert.equal(c.personId, "11111111-1111-4111-8111-111111111111");
  assert.equal(c.email, "palesa@demo.test");
  assert.deepEqual(c.roles, ["customer", "investor"]);
  await invalid(verifyHandoff(f.token, { issuer: f.issuer, audiences: ["banking"] }, keys, new Date((f.issuedAt + 70) * 1000)));
  await invalid(verifyHandoff(f.token, { issuer: f.issuer, audiences: ["app"] }, keys, new Date((f.issuedAt + 10) * 1000)));
});

test("a valid token is accepted and its claims are normalised", async () => {
  const c = await verifyHandoff(await sign(), cfg, publicKey, at(5));
  assert.deepEqual([c.personId, c.jti, c.email, c.name, c.roles], ["person-1", "jti-1", "demo@example.test", "Demo Customer", ["customer"]]);
});

test("expired, premature, wrong audience, wrong issuer and wrong key are refused", async () => {
  await invalid(verifyHandoff(await sign(), cfg, publicKey, at(120)));
  await invalid(verifyHandoff(await sign(), cfg, publicKey, at(-60)));
  await invalid(verifyHandoff(await sign({ aud: "other" }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ iss: "https://evil.example.test" }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({}, other), cfg, publicKey, at(5)));
});

test("a token that is not a handoff, lacks a claim, or lives too long is refused", async () => {
  await invalid(verifyHandoff(await sign({ use: "session" }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ use: undefined }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ jti: undefined }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ roles: "customer" }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ exp: NOW + MAX_LIFETIME_SECONDS + 1 }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff(await sign({ sub: "x".repeat(65) }), cfg, publicKey, at(5)));
  await invalid(verifyHandoff("not.a.token", cfg, publicKey, at(5)));
});

test("an unsigned token (alg none) is refused", async () => {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const t = `${b({ alg: "none" })}.${b({ iss: ISS, aud: "banking", sub: "p", jti: "j", iat: NOW, exp: NOW + 60, use: "handoff", roles: ["customer"] })}.`;
  await invalid(verifyHandoff(t, cfg, publicKey, at(5)));
});

test("configuration needs both settings, and https in production", () => {
  assert.equal(readHandoffConfig({}), null);
  assert.equal(readHandoffConfig({ PLATFORM_JWKS_URL: "https://a/jwks.json" }), null);
  const ok = readHandoffConfig({ PLATFORM_JWKS_URL: "https://a/jwks.json", PLATFORM_ISSUER: "https://a///" });
  assert.deepEqual(ok, { jwksUrl: "https://a/jwks.json", issuer: "https://a", audiences: ["banking", "app"] });
  assert.equal(readHandoffConfig({ PLATFORM_JWKS_URL: "http://a/jwks.json", PLATFORM_ISSUER: "https://a", NODE_ENV: "production" }), null);
  assert.ok(readHandoffConfig({ PLATFORM_JWKS_URL: "http://localhost/jwks.json", PLATFORM_ISSUER: "http://localhost", NODE_ENV: "development" }));
  assert.deepEqual(readHandoffConfig({ PLATFORM_JWKS_URL: "https://a/j", PLATFORM_ISSUER: "https://a", SSO_AUDIENCES: " app , " })?.audiences, ["app"]);
});

test("service access: customers get banking only, investors the Hub, unknown roles nothing", () => {
  assert.deepEqual(servicesFor(["customer"]), ["banking", "app"]);
  assert.deepEqual(servicesFor(["investor"]), ["hub"]);
  assert.deepEqual(servicesFor(["customer", "board_member"]), ["hub", "banking", "app"]);
  assert.deepEqual(servicesFor(["root", "customer ", "ADMIN"]), []);
  assert.equal(canOpen("hub", ["customer"]), false);
  assert.equal(canOpen("banking", ["super_admin"]), false);
  assert.equal(canOpen("hub", ["staff"]), true);
});

test("redirect targets must be relative paths on the same host", () => {
  for (const ok of ["/", "/dashboard", "/a/b?x=1#y"]) assert.equal(safeNext(ok), ok);
  for (const bad of [null, undefined, "", "dashboard", "//evil.test", "https://evil.test", "/\\evil.test", "/a\nb", "/a\u0000b", "javascript:alert(1)"])
    assert.equal(safeNext(bad), "/");
});
