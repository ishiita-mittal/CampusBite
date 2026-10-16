"use strict";

const { test, describe, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");
const { pool } = require("../src/config/database");

// Close the MySQL connection pool after all API tests finish.
after(async () => {
  await pool.end();
});

describe("Health and Static API Tests", () => {
  test("GET /api/health returns JSON response with status information", async () => {
    const res = await request(app)
      .get("/api/health")
      .expect("Content-Type", /json/);

    // The database may be connected (200) or unavailable (503).
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(res.body.data);
    assert.ok(res.body.data.status);
    assert.ok(res.body.data.database);
  });

  test("GET /api/unknown-endpoint returns 404 Endpoint not found", async () => {
    const res = await request(app).get("/api/does-not-exist").expect(404);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error, "Endpoint not found.");
  });
});

describe("Customer Order API Validation Tests", () => {
  test("POST /api/orders rejects empty body with 400", async () => {
    const res = await request(app).post("/api/orders").send({}).expect(400);

    assert.equal(res.body.success, false);
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(
      res.body.errors.some((e) => e.includes("Customer name is required")),
    );
  });

  test("POST /api/orders rejects order with missing items array", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "Priya" })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.ok(
      res.body.errors.some((e) => e.includes("must contain at least one item")),
    );
  });

  test("POST /api/orders rejects item with invalid quantity (> 50)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "Rahul",
        items: [{ menu_item_id: 1, quantity: 100 }],
      })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.ok(
      res.body.errors.some((e) =>
        e.includes("quantity must be a whole number between 1 and 50"),
      ),
    );
  });

  test("POST /api/orders rejects item with negative menu_item_id", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "Rahul",
        items: [{ menu_item_id: -1, quantity: 2 }],
      })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.ok(
      res.body.errors.some((e) =>
        e.includes("menu_item_id must be a positive integer"),
      ),
    );
  });
});

describe("Admin Authentication & Protection Tests", () => {
  test("POST /api/admin/login rejects missing username or password with 400", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ username: "admin" })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Username and password are required/);
  });

  test("GET /api/admin/orders rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/admin/orders").expect(401);

    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Authentication required/);
  });

  test("GET /api/admin/orders rejects invalid Bearer token with 401", async () => {
    const res = await request(app)
      .get("/api/admin/orders")
      .set("Authorization", "Bearer invalid.token.value")
      .expect(401);

    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Invalid or expired token/);
  });

  test("GET /api/admin/metrics rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/admin/metrics").expect(401);

    assert.equal(res.body.success, false);
  });

  test("POST /api/admin/menu rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .post("/api/admin/menu")
      .send({
        name: "Chai",
        category: "Beverages",
        price_paise: 1500,
      })
      .expect(401);

    assert.equal(res.body.success, false);
  });

  test("PATCH /api/admin/orders/CB-123/status rejects unauthenticated requests with 401", async () => {
    const res = await request(app)
      .patch("/api/admin/orders/CB-123/status")
      .send({ status: "Preparing" })
      .expect(401);

    assert.equal(res.body.success, false);
  });
});
