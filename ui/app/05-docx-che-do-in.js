/* ========== Ghi file Word (.docx) ========== */
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const P = (text, o = {}) => ({t: 'p', text: text ?? '', col: o.col || '', al: o.al || 'both', b: !!o.b, i: !!o.i, sz: o.sz || 26,
  after: o.after ?? 100, before: o.before ?? 0, ind: o.ind || 0, indR: o.indR || 0, hang: o.hang || 0, keep: !!o.keep, bdb: !!o.bdb, full: !!o.full});
const T = (widths, rows, o = {}) => ({t: 'tbl', widths, rows, borders: o.borders !== false, head: !!o.head, headRows: o.headRows, sz: o.sz, rowH: o.rowH, al: o.al, alignCols: o.alignCols, keep: !!o.keep, pad: o.pad, full: !!o.full});
const bl = text => P('- ' + text, {ind: 360});

/* ===== Chế độ in biểu mẫu: 'day' (đầy đủ) | 'trong' (mẫu trống số: các giá trị chưa có để chấm hoặc ô trống) | 'de' (CHỈ phần số, in đè lên mẫu 'trong' đã in).
 * Giá trị chưa biết khi lập mẫu (số biên bản, ngày lập, khối lượng, tiền…) được bọc bằng V(giá trị, độ rộng chấm, chữ thay thế). Chữ cố định không bọc.
 *  - day: in giá trị.   - trong: in chấm (hoặc chữ thay thế, hoặc để trống ở ô bảng).
 *  - de: bố cục GIỮ NGUYÊN như 'trong': chữ cố định, đường kẻ, nền đổi sang trắng/ẩn (không tốn mực), chỉ giá trị in màu đen, kèm đệm trắng cho đúng độ rộng của phần chấm
 *    nên các chữ phía sau không bị lệch dòng. Hai bản phải in cùng khổ giấy, tỉ lệ 100%, cùng lề. */
let docMode = 'day';
const VS = '', VW = '', VB = '', VE = '';
/* Số biên bản để trắng thật (chừa trắng đúng bề rộng để số in đè rơi đúng chỗ) */
/* Cụm ngày ở mẫu trống để TRẮNG (chừa bề rộng bằng ký tự trắng); bản in đè in nguyên cụm “ngày dd/mm/yyyy”, “từ ngày … đến ngày …” bằng mực đen, nên không còn chấm chồng lên số */
const VP = (text, sample) => V(text, 0, '\uE005' + '…'.repeat(Math.round(emw(sample))));
const ngayV = (d, ex) => d ? 'ngày ' + d : ex._mode === 'day' ? HAKHopDong.ngayTrong() : '';
const tuDen = (a, b, ex) => ex._mode === 'day' ? 'từ ngày ' + (a || '…/…/……') + ' đến ngày ' + (b || '…/…/……') : a && b ? 'từ ngày ' + a + ' đến ngày ' + b : '';
const S_NGAY = 'ngày 00/00/0000', S_TUDEN = 'từ ngày 00/00/0000 đến ngày 00/00/0000';
const SO_TRANG = '\uE005' + '…'.repeat(18);   // \uE005 = chỗ chừa trắng: chiếm bề rộng như chấm nhưng in màu trắng (khoảng trắng cuối dòng bị bỏ qua khi canh giữa nên không dùng được)
const V = (text, w, blank) => VS + (w || 0) + VW + (blank || '') + VB + (text == null ? '' : text) + VE;
const emw = str => [...String(str)].reduce((a, c) => a + (c === '…' ? 1 : /\d/.test(c) ? 0.5 : /[.,:;\/ \u00A0\-()]/.test(c) ? 0.27 : /[A-ZĐ]/.test(c) ? 0.7 : 0.5), 0);
function runsXml(text, base) {
  const out = [];
  const run = (seg, bold, white) => '<w:r><w:rPr>' + (bold ? '<w:b/>' : '') + (base.i ? '<w:i/>' : '') + (white ? '<w:color w:val="FFFFFF"/>' : base.col ? '<w:color w:val="' + base.col + '"/>' : '') +
    '<w:sz w:val="' + base.sz + '"/><w:szCs w:val="' + base.sz + '"/></w:rPr><w:t xml:space="preserve">' + xe(seg) + '</w:t></w:r>';
  String(text).split('**').forEach((seg, i) => {
    if (seg === '') return;
    const bold = (i % 2 === 1) || base.b, de = docMode === 'de', re = /(\d+)([^]*)([^]*)/g;
    let last = 0, m;
    while ((m = re.exec(seg))) {
      if (m.index > last) out.push(run(seg.slice(last, m.index), bold, de));        // chữ cố định: in đè thì trắng
      let blank = m[2] || '…'.repeat(+m[1]); const val = m[3], inv = blank[0] === '\uE005'; if (inv) blank = blank.slice(1);
      if (docMode === 'day') { if (val !== '') out.push(run(val, bold, false)); }
      else if (docMode === 'trong') { if (blank) out.push(run(blank, bold, true)); }   // mẫu trống: mọi chỗ chờ số đều để TRẮNG (chừa bề rộng bằng ký tự trắng), không in chấm
      else {
        if (val !== '') out.push(run(val, bold, false));
        const diff = emw(blank) - emw(val);
        if (diff > 0.3) { const n = Math.floor(diff), sp = Math.round((diff - n) / 0.27); out.push(run('…'.repeat(n) + ' '.repeat(sp), bold, true)); }   // đệm trắng cho đủ độ rộng phần chấm của mẫu trống
      }
      last = re.lastIndex;
    }
    if (last < seg.length) out.push(run(seg.slice(last), bold, de));
  });
  return out.join('');
}
function paraXml(p) {
  const ind = p.ind || p.hang || p.indR ? '<w:ind w:left="' + (p.ind || 0) + '"' + (p.indR ? ' w:right="' + p.indR + '"' : '') + (p.hang ? ' w:hanging="' + p.hang + '"' : '') + '/>' : '';
  return '<w:p><w:pPr>' + (p.keep ? '<w:keepNext/>' : '') + '<w:widowControl/>' + (p.bdb ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="' + (docMode === 'de' ? 'FFFFFF' : '000000') + '"/></w:pBdr>' : '') +
    '<w:spacing w:before="' + p.before + '" w:after="' + p.after + '" w:line="276" w:lineRule="auto"/>' + ind +
    '<w:jc w:val="' + (docMode !== 'day' && p.al === 'both' ? 'left' : p.al) + '"/>' +
    '<w:rPr><w:sz w:val="' + p.sz + '"/><w:szCs w:val="' + p.sz + '"/></w:rPr>' + '</w:pPr>' + runsXml(p.text, p) + '</w:p>';   // dấu hết đoạn cùng cỡ chữ với nội dung (mọi chế độ), để ô trống và ô có chữ cao bằng nhau (hàng không lệch dần, bảng đông người vẫn gọn một trang)   // mẫu trống và in đè: canh trái để chữ không bị giãn khác nhau giữa hai bản
}
function tblXml(t) {
  const total = t.widths.reduce((a, b) => a + b, 0);
  const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'];
  const bd = sides.map(k => t.borders ? '<w:' + k + ' w:val="single" w:sz="' + (/^inside/.test(k) ? 4 : 8) + '" w:space="0" w:color="' + (docMode === 'de' ? 'FFFFFF' : '000000') + '"/>' : '<w:' + k + ' w:val="nil"/>')   // in đè: đường kẻ vẫn chiếm chỗ như mẫu trống nhưng màu trắng, để hàng không lệch dần.join('');
  const grid = t.widths.map(w => '<w:gridCol w:w="' + w + '"/>').join('');
  const nHead = t.headRows || (t.head ? 1 : 0);
  const sz = t.sz || 22;
  const rows = t.rows.map((row, ri) => {
    const head = ri < nHead;
    let col = 0;
    const cells = row.map(c => {
      const obj = (c && typeof c === 'object' && !Array.isArray(c)) ? c : {v: c};
      const span = obj.span || 1;
      const w = t.widths.slice(col, col + span).reduce((a, b) => a + b, 0);
      const al = head ? 'center' : (t.alignCols ? t.alignCols[col] : (t.al || 'left'));
      const lines = Array.isArray(obj.v) ? obj.v : [obj.v];
      const paras = lines.map(x => paraXml({text: x ?? '', al, b: head, i: !!obj.i, sz, after: 0, before: 0, keep: !!t.keep && ri < t.rows.length - 1})).join('');
      col += span;
      return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') +
        (head && docMode !== 'de' ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' + paras + '</w:tc>';
    }).join('');
    const h = (!head && t.rowH) ? '<w:trHeight w:val="' + t.rowH + '" w:hRule="atLeast"/>' : '';
    return '<w:tr><w:trPr><w:cantSplit/>' + h + (head ? '<w:tblHeader/>' : '') + '</w:trPr>' + cells + '</w:tr>';
  }).join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="' + total + '" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' + bd +
    '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="' + (t.borders ? (t.pad ?? 40) : 0) + '" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="' + (t.borders ? (t.pad ?? 40) : 0) + '" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar>' +
    '</w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>' + rows + '</w:tbl>';
}

const CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
const RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const DOCRELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="' + W + '"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';

function footerXml(text, width) {
  const FC = docMode === 'de' ? 'FFFFFF' : '595959';   // in đè: chân trang cũng ẩn
  const run = (t, extra) => '<w:r><w:rPr><w:i/><w:color w:val="' + FC + '"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>' + (extra || '') + '<w:t xml:space="preserve">' + xe(t) + '</w:t></w:r>';
  const fld = ins => '<w:fldSimple w:instr=" ' + ins + ' "><w:r><w:rPr><w:i/><w:color w:val="' + FC + '"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="' + W + '"><w:p><w:pPr>' +
    (docMode === 'de' ? '' : '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="7F7F7F"/></w:pBdr>') + '<w:tabs><w:tab w:val="right" w:pos="' + width + '"/></w:tabs>' +
    '<w:spacing w:before="0" w:after="0"/></w:pPr>' + run(text) + '<w:r><w:tab/></w:r>' + run('Trang ') + fld('PAGE') + run('/') + fld('NUMPAGES') + '</w:p></w:ftr>';
}
/* Khối ký tên cân đối: dòng “Đà Nẵng, ngày … tháng … năm …” canh phải đứng ngay trước bảng ký tên được chuyển vào ô CỘT CUỐI của bảng (canh giữa, chữ nghiêng),
 * nên ngày, chức danh, “(Ký, họ tên)” và họ tên cùng một trục dọc, không còn lệch phải so với các dòng trên dưới. Áp dụng cho mọi biểu mẫu. */
function tidySign(blocks) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], nx = blocks[i + 1];
    if (b && b.t === 'p' && b.al === 'right' && /Đà Nẵng,|\uE000/.test(b.text) && nx && nx.t === 'tbl' && nx.borders === false && nx.widths.length >= 2) {
      const n = nx.widths.length, row = n >= 3 ? [...Array(n - 2).fill(''), {v: b.text, i: true, span: 2}] : ['', {v: b.text, i: true}];   // 3 cột: ngày canh giữa trên hai cột bên phải để không xuống dòng
      out.push(Object.assign({}, nx, {rows: [row, ...nx.rows]})); i++;
      continue;
    }
    out.push(b);
  }
  return out;
}
/* Phần thân tài liệu (XML) của một danh sách khối, theo chế độ in hiện tại (docMode). Dùng chung cho ghi file và cho chữ ký bố cục của mẫu nền. */
function bodyXml(blocks) {
  const ser = b => b.t === 'p' ? paraXml(b) : b.t === 'tbl' ? tblXml(b) : b.t === 'br' ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '';
  return blocks.map(b => { if (!b.full || docMode === 'day') return ser(b); const m = docMode; docMode = 'day'; try { return ser(b); } finally { docMode = m; } }).join('') +
    (blocks.length && blocks[blocks.length - 1].t === 'tbl' ? '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr></w:p>' : '');
}
async function makeDocx(blocks, o = {}) {
  blocks = tidySign(blocks);
  if (o.draft && o.draft.length) blocks = [P('**' + HAKBanNhap.banner(o.draft) + '**', {al: 'center', col: 'C00000', sz: 20, after: 120, full: true}), ...blocks];   // nhãn BẢN NHÁP ở đầu tài liệu (màu đỏ, luôn hiện)
  const body = bodyXml(blocks);
  const pg = o.landscape
    ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="' + (o.tight ? 567 : 850) + '" w:right="567" w:bottom="' + (o.tight ? 680 : 850) + '" w:left="1134" w:header="425" w:footer="425" w:gutter="0"/>'
    : '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="567" w:footer="567" w:gutter="0"/>';
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="' + W + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + body +
    '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>' + pg + '</w:sectPr></w:body></w:document>';
  const z = new JSZip();
  z.file('[Content_Types].xml', CT);
  z.file('_rels/.rels', RELS);
  z.file('word/_rels/document.xml.rels', DOCRELS);
  z.file('word/styles.xml', STYLES);
  z.file('word/footer1.xml', footerXml(o.footer || '', o.landscape ? 15137 : 9355));
  z.file('word/document.xml', doc);
  return z.generateAsync({type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

