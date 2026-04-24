const prisma = require("../../../../prisma");

class ServiceCustomFieldService {
  async create(serviceId, data) {
    return prisma.serviceCustomField.create({
      data: {
        serviceId,
        fieldName: data.fieldName,
        fieldType: data.fieldType || "text",
        description: data.description,
        validation: data.validation,
        selectOptions: data.selectOptions,
        displayOrder: data.displayOrder ?? 0,
        adminOnly: data.adminOnly ?? false,
        requiredField: data.requiredField ?? false,
        showOnOrderForm: data.showOnOrderForm ?? false,
        showOnInvoice: data.showOnInvoice ?? false,
      },
    });
  }

  async listByService(serviceId) {
    return prisma.serviceCustomField.findMany({
      where: { serviceId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async getById(id) {
    const field = await prisma.serviceCustomField.findUnique({ where: { id } });
    if (!field) {
      const err = new Error("Custom field not found");
      err.statusCode = 404;
      throw err;
    }
    return field;
  }

  async update(id, data) {
    await this.getById(id);
    const updateData = {};
    if (data.fieldName !== undefined) updateData.fieldName = data.fieldName;
    if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.validation !== undefined) updateData.validation = data.validation;
    if (data.selectOptions !== undefined) updateData.selectOptions = data.selectOptions;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.adminOnly !== undefined) updateData.adminOnly = data.adminOnly;
    if (data.requiredField !== undefined) updateData.requiredField = data.requiredField;
    if (data.showOnOrderForm !== undefined) updateData.showOnOrderForm = data.showOnOrderForm;
    if (data.showOnInvoice !== undefined) updateData.showOnInvoice = data.showOnInvoice;
    return prisma.serviceCustomField.update({ where: { id }, data: updateData });
  }

  async delete(id) {
    await this.getById(id);
    await prisma.serviceCustomField.delete({ where: { id } });
  }

  async reorder(fields) {
    await Promise.all(
      fields.map(({ id, displayOrder }) =>
        prisma.serviceCustomField.update({ where: { id }, data: { displayOrder } })
      )
    );
  }
}

module.exports = new ServiceCustomFieldService();
