export const MERGE_VARIABLES = [
  { group: 'Client',  label: '{{client.name}}',        value: '{{client.name}}' },
  { group: 'Client',  label: '{{client.email}}',       value: '{{client.email}}' },
  { group: 'Client',  label: '{{client.id}}',          value: '{{client.id}}' },
  { group: 'Invoice', label: '{{invoice.id}}',         value: '{{invoice.id}}' },
  { group: 'Invoice', label: '{{invoice.total}}',      value: '{{invoice.total}}' },
  { group: 'Invoice', label: '{{invoice.due_date}}',   value: '{{invoice.due_date}}' },
  { group: 'Invoice', label: '{{invoice.date}}',       value: '{{invoice.date}}' },
  { group: 'Order',   label: '{{order.id}}',           value: '{{order.id}}' },
  { group: 'Order',   label: '{{order.total}}',        value: '{{order.total}}' },
  { group: 'Service', label: '{{service.name}}',       value: '{{service.name}}' },
  { group: 'Ticket',  label: '{{ticket.id}}',          value: '{{ticket.id}}' },
  { group: 'Ticket',  label: '{{ticket.subject}}',     value: '{{ticket.subject}}' },
  { group: 'Company', label: '{{company.name}}',       value: '{{company.name}}' },
  { group: 'Company', label: '{{company.email}}',      value: '{{company.email}}' },
  { group: 'Links',   label: '{{portal.url}}',         value: '{{portal.url}}' },
  { group: 'Links',   label: '{{reset.url}}',          value: '{{reset.url}}' },
  { group: 'Links',   label: '{{verify.url}}',         value: '{{verify.url}}' },
];

export const VARIABLE_GROUPS = [...new Set(MERGE_VARIABLES.map(v => v.group))];

export function insertVariable(currentText, cursorPos, variable) {
  const before = currentText.slice(0, cursorPos);
  const after = currentText.slice(cursorPos);
  return before + variable + after;
}

// Replace variables with sample values for preview
export function sampleReplace(html) {
  return html
    .replace(/\{\{client\.name\}\}/g, 'John Smith')
    .replace(/\{\{client\.email\}\}/g, 'john@example.com')
    .replace(/\{\{client\.id\}\}/g, 'CLT-00123')
    .replace(/\{\{invoice\.id\}\}/g, 'INV-2024-001')
    .replace(/\{\{invoice\.total\}\}/g, '$149.00')
    .replace(/\{\{invoice\.due_date\}\}/g, 'April 15, 2024')
    .replace(/\{\{invoice\.date\}\}/g, 'April 1, 2024')
    .replace(/\{\{order\.id\}\}/g, 'ORD-8812')
    .replace(/\{\{order\.total\}\}/g, '$149.00')
    .replace(/\{\{service\.name\}\}/g, 'Business Hosting Plan')
    .replace(/\{\{ticket\.id\}\}/g, 'TKT-456')
    .replace(/\{\{ticket\.subject\}\}/g, 'Help with account setup')
    .replace(/\{\{company\.name\}\}/g, 'WHMS Platform')
    .replace(/\{\{company\.email\}\}/g, 'support@whms.io')
    .replace(/\{\{portal\.url\}\}/g, 'https://portal.whms.io')
    .replace(/\{\{reset\.url\}\}/g, 'https://portal.whms.io/reset?token=abc123')
    .replace(/\{\{verify\.url\}\}/g, 'https://portal.whms.io/verify?token=abc123');
}
