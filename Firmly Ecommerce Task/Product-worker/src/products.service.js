import Joi from 'joi';
import { withSpan } from './observability/otel.js';

/* ---------- Helpers ---------- */

function parseSpecs(specs) {
  try {
    return typeof specs === 'string' ? JSON.parse(specs) : specs;
  } catch {
    return typeof specs === 'object' && specs !== null ? specs : {};
  }
}

function stringifySpecs(specs) {
  return JSON.stringify(specs ?? {});
}

/* ---------- Joi Schemas ---------- */

const productCreateSchema = Joi.object({
  name: Joi.string().min(1).required(),
  price: Joi.number().positive().required(),
  specs: Joi.object().optional(),
  status: Joi.string().optional(),
  image_url: Joi.string().optional().allow(null),
  delivery_options: Joi.alternatives(
    Joi.array().items(Joi.string()),
    Joi.object()
  ).optional(),
  inventory: Joi.object({
    available: Joi.number().integer().min(0).default(0),
    reserved: Joi.number().integer().min(0).default(0)
  }).unknown(false).optional()
}).unknown(false);

const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  price: Joi.number().positive().optional(),
  specs: Joi.object().optional(),
  status: Joi.string().optional(),
  image_url: Joi.string().optional().allow(null),
  delivery_options: Joi.alternatives(
    Joi.array().items(Joi.string()),
    Joi.object()
  ).optional(),
  inventory: Joi.object({
    available: Joi.number().integer().min(0),
    reserved: Joi.number().integer().min(0)
  }).unknown(false).optional()
}).min(1).unknown(false);

const idSchema = Joi.alternatives(
  Joi.number().integer().positive(),
  Joi.string().min(1)
);

const paginationSchema = Joi.object({
  page: Joi.number().integer().positive().optional()
});

/* ---------- CREATE (Admin) ---------- */
export async function create(db, data, ctx) {
  return withSpan(ctx, 'products.create', {}, async (span) => {
    const { error } = productCreateSchema.validate(data, {
      abortEarly: false
    });

    if (error) {
      span.setAttribute('products.error', 'validation_failed');
      span.setAttribute('products.validation_error', error.details.map(d => d.message).join(', '));
      throw new Error('Invalid product data');
    }

    const productResult = await db.prepare(`
      INSERT INTO products (name, price, specs, status, image_url, delivery_options)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.price,
      stringifySpecs(data.specs),
      data.status ?? 'draft',
      data.image_url ?? null,
      stringifySpecs(data.delivery_options ?? ["NORMAL","SPEED","EXPRESS"])
    ).run();

    const productId = productResult.meta.last_row_id;
    span.setAttribute('product.id', productId);

    // Initialize inventory record
    await db.prepare(`
      INSERT INTO product_inventory (product_id, available, reserved)
      VALUES (?, ?, ?)
    `).bind(
      productId,
      data.inventory?.available ?? 0,
      data.inventory?.reserved ?? 0
    ).run();

    return getById(db, productId, { role: 'admin' }, ctx);
  });
}

/* ---------- READ ALL ---------- */
export async function getAll(db, { page, role } = {}, ctx) {
  return withSpan(ctx, 'products.getAll', { role }, async () => {
    const { error } = paginationSchema.validate({ page });
    if (error) throw new Error('Invalid pagination parameters');

    const LIMIT = 10;
    const safePage = Number.isInteger(+page) && +page > 0 ? +page : 1;
    const offset = (safePage - 1) * LIMIT;

    const isAdmin = role === 'admin';
    const statusFilter = isAdmin ? '' : "WHERE p.status IN ('active', 'out_of_stock')";

    const countResult = await withSpan(
      ctx,
      'db.count.products',
      {},
      () =>
        db
          .prepare(`SELECT COUNT(*) AS total FROM products p ${statusFilter || ''}`)
          .first()
    );

    const total = Number(countResult?.total ?? 0);

    const { results } = await withSpan(
      ctx,
      'db.select.products.page',
      { page: safePage },
      () =>
        db
          .prepare(`
            SELECT p.*, i.available, i.reserved
            FROM products p
            LEFT JOIN product_inventory i ON p.id = i.product_id
            ${statusFilter || ''}
            ORDER BY id ASC
            LIMIT ? OFFSET ?
          `)
          .bind(LIMIT, offset)
          .all()
    );

    return {
      page: safePage,
      limit: LIMIT,
      total,
      totalPages: Math.ceil(total / LIMIT),
      data: results.map(p => {
        const available = p.available ?? 0;
        let stockStatus = 'In Stock';
        if (available === 0) stockStatus = 'Out of Stock';
        else if (available < 5) stockStatus = `Only ${available} left`;

        const product = {
          id: p.id,
          name: p.name,
          price: p.price,
          specs: parseSpecs(p.specs),
          status: p.status,
          image_url: p.image_url,
          delivery_options: parseSpecs(p.delivery_options),
          stock: {
            available: available,
            reserved: p.reserved ?? 0,
            status: stockStatus
          }
        };

        if (isAdmin) {
          product.deleted_at = p.deleted_at ?? null;
        }

        return product;
      })
    };
  });
}

/* ---------- READ ONE ---------- */
export async function getById(db, id, { role, quantity } = {}, ctx) {
  return withSpan(ctx, 'products.getById', { product_id: id, role }, async () => {

    const { error } = idSchema.validate(id);
    if (error) throw new Error('Invalid product id');

    const isAdmin = role === 'admin';
    const statusFilter = isAdmin ? '' : "AND p.status IN ('active', 'out_of_stock')";

    const p = await withSpan(
      ctx,
      'db.select.product.by_id',
      { product_id: id, isAdmin },
      () =>
        db
          .prepare(`
            SELECT p.*, i.available, i.reserved
            FROM products p
            LEFT JOIN product_inventory i ON p.id = i.product_id
            WHERE p.id = ?
            ${statusFilter}
          `)
          .bind(id)
          .first()
    );

    if (!p) return null;

    const available = p.available ?? 0;
    let stockMessage = 'In Stock';
    if (available === 0) {
      stockMessage = 'Out of Stock';
    } else if (quantity && quantity > available) {
      stockMessage = `Only ${available} products left`;
    } else if (available < 5) {
      stockMessage = `Only ${available} products left`;
    }

    const product = {
      id: p.id,
      name: p.name,
      price: p.price,
      specs: parseSpecs(p.specs),
      status: p.status,
      image_url: p.image_url,
      delivery_options: parseSpecs(p.delivery_options),
      stock: {
        available: available,
        reserved: p.reserved ?? 0,
        message: stockMessage
      }
    };

    if (isAdmin) {
      product.deleted_at = p.deleted_at ?? null;
    }

    return product;
  });
}

/* ---------- UPDATE (Admin) ---------- */
export async function update(db, id, data, ctx) {
  return withSpan(ctx, 'products.update', { product_id: id }, async (span) => {
    const { error: idError } = idSchema.validate(id);
    if (idError) throw new Error('Invalid product id');
    const { error } = productUpdateSchema.validate(data, { abortEarly: false });
    if (error) {
      span.setAttribute('products.error', 'validation_failed');
      span.setAttribute('products.validation_error', error.details.map(d => d.message).join(', '));
      throw new Error('Invalid product update data');
    }

    const { inventory, ...productFields } = data;
    const statements = [];

    // Build Product Update Statement
    const productEntries = Object.entries(productFields);
    if (productEntries.length > 0) {
      const fields = productEntries.map(([key]) => `${key} = ?`);
      const values = productEntries.map(([key, value]) => 
        (key === 'specs' || key === 'delivery_options') ? stringifySpecs(value) : value
      );
      statements.push(
        db.prepare(`
          UPDATE products 
          SET ${fields.join(', ')} 
          WHERE id = ? AND status != 'deleted'
        `).bind(...values, id)
      );
    }

    // Build Inventory Update Statement
    if (inventory) {
      const invEntries = Object.entries(inventory);
      if (invEntries.length > 0) {
        const invFields = invEntries.map(([key]) => `${key} = ?`);
        const invValues = invEntries.map(([, value]) => value);
        statements.push(
          db.prepare(`
            UPDATE product_inventory 
            SET ${invFields.join(', ')} 
            WHERE product_id = ?
          `).bind(...invValues, id)
        );
      }
    }

    if (statements.length === 0) return getById(db, id, { role: 'admin' }, ctx);

    const results = await db.batch(statements);
    const changes = results.reduce((acc, res) => acc + (res.meta.changes || 0), 0);

    if (changes === 0) return null;

    return getById(db, id, { role: 'admin' }, ctx);
  });
}

/* ---------- DELETE / RESTORE (Admin) ---------- */
export async function toggleDeletion(db, id, isRestore, ctx) {
  const operation = isRestore ? 'restore' : 'softDelete';
  return withSpan(ctx, `products.${operation}`, { product_id: id }, async () => {
    const { error } = idSchema.validate(id);
    if (error) throw new Error('Invalid product id');

    const query = isRestore
      ? `UPDATE products SET status = 'active', deleted_at = NULL WHERE id = ? AND status = 'deleted'`
      : `UPDATE products SET status = 'deleted', deleted_at = datetime('now') WHERE id = ? AND status != 'deleted'`;

    const result = await withSpan(
      ctx,
      `db.${isRestore ? 'restore' : 'soft_delete'}.product`,
      { product_id: id },
      () => db.prepare(query).bind(id).run()
    );

    if (result.meta.changes === 0) {
      return null;
    }

    return isRestore ? getById(db, id, { role: 'admin' }, ctx) : { success: true };
  });
}
