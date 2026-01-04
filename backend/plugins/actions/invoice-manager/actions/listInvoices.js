
// ============================================
// FILE: actions/listInvoices.js
// ============================================

/**
 * List invoices with filtering and pagination
 */
module.exports.handler = async function({ meta, logger }) {
  try {
    logger.info("📋 Listing invoices...");

    const {
      status = null,
      clientId = null,
      startDate = null,
      endDate = null,
      page = 1,
      pageSize = 10
    } = meta;

    // Mock data
    const invoices = [
      {
        id: "INV-001",
        clientId: "client-123",
        total: 495,
        status: "paid",
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "INV-002",
        clientId: "client-123",
        total: 750,
        status: "draft",
        createdAt: new Date().toISOString()
      },
      {
        id: "INV-003",
        clientId: "client-456",
        total: 1200,
        status: "sent",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Apply filters
    let filtered = invoices;
    if (status) {
      filtered = filtered.filter(i => i.status === status);
    }
    if (clientId) {
      filtered = filtered.filter(i => i.clientId === clientId);
    }
    if (startDate) {
      filtered = filtered.filter(i => new Date(i.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(i => new Date(i.createdAt) <= new Date(endDate));
    }

    // Pagination
    const total = filtered.length;
    const pages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paginatedInvoices = filtered.slice(start, start + pageSize);

    logger.info(`✅ Listed ${paginatedInvoices.length} invoices (page ${page}/${pages})`);

    return {
      success: true,
      invoices: paginatedInvoices,
      pagination: {
        page,
        pageSize,
        total,
        pages,
        hasMore: page < pages
      },
      filters: { status, clientId, startDate, endDate }
    };
  } catch (error) {
    logger.error("❌ List invoices failed: " + error.message);
    return {
      success: false,
      error: error.message,
      code: "LIST_INVOICES_FAILED"
    };
  }
};
