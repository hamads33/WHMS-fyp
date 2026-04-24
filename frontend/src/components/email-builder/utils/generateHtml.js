/**
 * generateHtml(blocks, settings?)
 * Converts the block JSON array to responsive, table-based email HTML.
 * Uses inline CSS only for maximum email client compatibility.
 */
export function generateHtml(blocks = [], settings = {}) {
  const {
    bgColor = '#f4f4f7',
    containerBg = '#ffffff',
    fontFamily = "'Segoe UI', Arial, Helvetica, sans-serif",
    containerWidth = '600',
  } = settings;

  const inner = blocks.map(renderBlock).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};font-family:${fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bgColor};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="${containerWidth}" cellpadding="0" cellspacing="0" border="0"
        style="max-width:${containerWidth}px;width:100%;background-color:${containerBg};border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        ${inner}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function renderBlock(block) {
  switch (block.type) {
    case 'text':     return renderText(block);
    case 'heading':  return renderHeading(block);
    case 'image':    return renderImage(block);
    case 'button':   return renderButton(block);
    case 'divider':  return renderDivider(block);
    case 'spacer':   return renderSpacer(block);
    case 'columns2': return renderColumns2(block);
    case 'columns3': return renderColumns3(block);
    case 'hero':     return renderHero(block);
    case 'footer':   return renderFooter(block);
    default:         return '';
  }
}

function renderText({ props }) {
  const { content = '', fontSize = '15px', align = 'left', color = '#374151', padding = '8px 40px' } = props;
  return `<tr><td style="padding:${padding};font-size:${fontSize};color:${color};text-align:${align};line-height:1.75;">${escHtml(content)}</td></tr>`;
}

function renderHeading({ props }) {
  const { content = '', fontSize = '26px', align = 'left', color = '#111827', padding = '12px 40px 4px' } = props;
  return `<tr><td style="padding:${padding};font-size:${fontSize};color:${color};text-align:${align};font-weight:700;line-height:1.3;">${escHtml(content)}</td></tr>`;
}

function renderImage({ props }) {
  const { src = '', alt = '', align = 'center', width = '100%', borderRadius = '0px', padding = '0' } = props;
  const alignStyle = align === 'center' ? 'margin:0 auto;display:block;' : align === 'right' ? 'margin-left:auto;display:block;' : 'display:block;';
  return `<tr><td style="padding:${padding};"><img src="${src}" alt="${escAttr(alt)}" width="${width}" style="${alignStyle}max-width:100%;border-radius:${borderRadius};border:0;" /></td></tr>`;
}

function renderButton({ props }) {
  const {
    label = 'Click Here', url = '#', align = 'center',
    bgColor = '#4f46e5', textColor = '#ffffff', padding = '13px 28px',
    borderRadius = '6px', fontSize = '15px', blockPadding = '20px 40px',
  } = props;
  return `<tr><td style="padding:${blockPadding};text-align:${align};">
    <a href="${escAttr(url)}" style="display:inline-block;background-color:${bgColor};color:${textColor};text-decoration:none;padding:${padding};border-radius:${borderRadius};font-size:${fontSize};font-weight:600;line-height:1;">${escHtml(label)}</a>
  </td></tr>`;
}

function renderDivider({ props }) {
  const { color = '#e5e7eb', thickness = '1px', margin = '8px 40px' } = props;
  return `<tr><td style="padding:${margin};"><div style="border-top:${thickness} solid ${color};"></div></td></tr>`;
}

function renderSpacer({ props }) {
  const { height = '32px' } = props;
  return `<tr><td style="height:${height};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function renderColumns2({ props }) {
  const { columns = [], gap = '16px', padding = '12px 40px' } = props;
  const [c1 = {}, c2 = {}] = columns;
  return `<tr><td style="padding:${padding};">
    <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48%" valign="top"><![endif]-->
    <div style="display:inline-block;width:48%;vertical-align:top;box-sizing:border-box;padding-right:${gap};">
      <p style="margin:0;font-size:${c1.fontSize || '14px'};color:${c1.color || '#374151'};line-height:1.7;">${escHtml(c1.content || '')}</p>
    </div>
    <!--[if mso]></td><td width="48%" valign="top"><![endif]-->
    <div style="display:inline-block;width:48%;vertical-align:top;box-sizing:border-box;">
      <p style="margin:0;font-size:${c2.fontSize || '14px'};color:${c2.color || '#374151'};line-height:1.7;">${escHtml(c2.content || '')}</p>
    </div>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>`;
}

function renderColumns3({ props }) {
  const { columns = [], padding = '12px 40px' } = props;
  const [c1 = {}, c2 = {}, c3 = {}] = columns;
  const colStyle = (c) => `display:inline-block;width:31%;vertical-align:top;box-sizing:border-box;font-size:${c.fontSize || '14px'};color:${c.color || '#374151'};line-height:1.7;`;
  return `<tr><td style="padding:${padding};">
    <div style="${colStyle(c1)}">${escHtml(c1.content || '')}</div>
    <div style="${colStyle(c2)};margin:0 3%;">${escHtml(c2.content || '')}</div>
    <div style="${colStyle(c3)}">${escHtml(c3.content || '')}</div>
  </td></tr>`;
}

function renderHero({ props }) {
  const {
    title = '', subtitle = '', bgColor = '#4f46e5', textColor = '#ffffff',
    buttonLabel = '', buttonUrl = '#', buttonBgColor = '#ffffff', buttonTextColor = '#4f46e5',
    padding = '52px 40px', align = 'center',
  } = props;
  return `<tr><td style="background-color:${bgColor};padding:${padding};text-align:${align};">
    <p style="margin:0 0 12px;font-size:30px;font-weight:700;color:${textColor};line-height:1.3;">${escHtml(title)}</p>
    ${subtitle ? `<p style="margin:0 0 24px;font-size:16px;color:${textColor};opacity:0.9;line-height:1.6;">${escHtml(subtitle)}</p>` : ''}
    ${buttonLabel ? `<a href="${escAttr(buttonUrl)}" style="display:inline-block;background-color:${buttonBgColor};color:${buttonTextColor};text-decoration:none;padding:13px 30px;border-radius:6px;font-size:15px;font-weight:600;">${escHtml(buttonLabel)}</a>` : ''}
  </td></tr>`;
}

function renderFooter({ props }) {
  const {
    text = '', subtext = '', bgColor = '#f8f9fb', textColor = '#6b7280',
    fontSize = '13px', align = 'center', padding = '28px 40px',
  } = props;
  return `<tr><td style="background-color:${bgColor};padding:${padding};text-align:${align};font-size:${fontSize};color:${textColor};line-height:1.7;">
    ${text ? `<p style="margin:0 0 6px;font-weight:600;">${escHtml(text)}</p>` : ''}
    ${subtext ? `<p style="margin:0;opacity:0.8;">${escHtml(subtext)}</p>` : ''}
  </td></tr>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  // Preserve merge variable syntax — only escape actual HTML special chars outside {{ }}
  return String(str)
    .replace(/&(?![a-z#\d]+;)/gi, '&amp;')
    .replace(/<(?!\/?(b|i|u|strong|em|br|a|span)[> /])/gi, '&lt;')
    .replace(/>/g, v => v === '>' ? '>' : '&gt;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
