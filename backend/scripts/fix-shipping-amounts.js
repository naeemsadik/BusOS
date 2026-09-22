const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const log = (...messages) => {
    process.stdout.write(messages.map((message) => String(message)).join(' ') + '\n');
};

const logError = (...messages) => {
    process.stderr.write(messages.map((message) => String(message)).join(' ') + '\n');
};

const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'pos',
    ssl: process.env.DATABASE_SSL === 'true'
        ? {
                rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
            }
        : false,
});

async function fixShippingAmounts() {
  try {
    await client.connect();
    log('Connected to database');

    // Get all orders where shippingAmount is 0 but total > (subtotal - discountAmount - taxAmount)
    const query = `
      SELECT 
        id, 
        "orderNumber",
        subtotal, 
        "taxAmount", 
        "discountAmount", 
        "shippingAmount",
        total,
        (total - (subtotal - "discountAmount" - "taxAmount")) as calculated_shipping
      FROM orders 
      WHERE "shippingAmount" = 0 
        AND total > (subtotal - "discountAmount" - "taxAmount")
        AND total > 0
      ORDER BY "createdAt" DESC;
    `;

    const result = await client.query(query);
    log(`Found ${result.rows.length} orders that need shipping amount correction`);

    if (result.rows.length === 0) {
      log('No orders need correction');
      return;
    }

    // Show preview of changes
    log('\nPreview of changes:');
    log('Order Number | Current Shipping | Calculated Shipping | Total | Subtotal | Discount | Tax');
    log('-------------|-----------------|-------------------|-------|----------|----------|-----');
    
    result.rows.forEach(row => {
      log(`${row.orderNumber} | ৳${row.shippingAmount} | ৳${row.calculated_shipping} | ৳${row.total} | ৳${row.subtotal} | ৳${row.discountAmount} | ৳${row.taxAmount}`);
    });

    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('\nDo you want to update these orders? (y/N): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log('Update cancelled');
      return;
    }

    // Update the orders
    let updatedCount = 0;
    for (const row of result.rows) {
      const calculatedShipping = parseFloat(row.calculated_shipping);
      
      // Only update if calculated shipping is positive and makes sense
      if (calculatedShipping > 0 && calculatedShipping <= row.total) {
        const updateQuery = `
          UPDATE orders 
          SET "shippingAmount" = $1 
          WHERE id = $2
        `;
        
        await client.query(updateQuery, [calculatedShipping, row.id]);
        updatedCount++;
        log(`✓ Updated order ${row.orderNumber}: shipping amount set to ৳${calculatedShipping}`);
      } else {
        log(`⚠ Skipped order ${row.orderNumber}: invalid calculated shipping amount (৳${calculatedShipping})`);
      }
    }

    log(`\n✅ Successfully updated ${updatedCount} orders`);

    // Verification query
    const verifyQuery = `
      SELECT COUNT(*) as fixed_count
      FROM orders 
      WHERE "shippingAmount" > 0 
        AND total = (subtotal - "discountAmount" - "taxAmount" + "shippingAmount")
    `;
    
    const verifyResult = await client.query(verifyQuery);
    log(`\n📊 Verification: ${verifyResult.rows[0].fixed_count} orders now have correct shipping calculations`);

  } catch (error) {
    logError('Error fixing shipping amounts:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    await client.end();
    log('Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixShippingAmounts()
    .then(() => {
      log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logError('Migration failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

module.exports = { fixShippingAmounts };
